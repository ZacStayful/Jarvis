// lib/monday-leads.ts
// Shared helpers for looking up MANAGEMENT_LEADS_BOARD rows by phone number.
// Extracted so inbound webhooks (Calendly, Retell voice/context, future
// Twilio inbound) all hit Monday the same way and tolerate the same set of
// stored phone formats.

import { mondayQuery } from '@/lib/monday-client'
import {
  MANAGEMENT_LEADS_BOARD,
  MANAGEMENT_LEADS_COLUMNS as COL,
} from '@/lib/monday-columns'

// Normalise raw phone input to E.164. UK is the default country for
// leading-0 inputs since every lead in MANAGEMENT_LEADS_BOARD is UK
// property.
export function normalisePhoneToE164(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/[^\d]/g, '')
  if (!digits) return null
  if (hasPlus) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

export interface LeadMatch {
  id: string
  name: string
  columns: Record<string, string>
}

// Find a lead row in MANAGEMENT_LEADS_BOARD by phone number. Returns the
// matched item with its name and any requested column values keyed by
// column id. Casts a small net of phone variants because Monday's phone
// column can be stored with or without the leading "+" depending on entry
// path. Paginates through all pages so a match isn't missed when Monday
// returns the lead on a non-first page.
export async function findLeadByPhone(
  phoneE164: string,
  columnIds: string[] = [],
): Promise<LeadMatch | null> {
  const variants = Array.from(
    new Set([
      phoneE164,
      phoneE164.replace(/^\+/, ''),
      phoneE164.startsWith('+') ? phoneE164 : `+${phoneE164}`,
    ]),
  )
  const variantLiteral = variants.map((v) => `"${v}"`).join(',')
  const colsLiteral = columnIds.length
    ? `column_values(ids: [${columnIds.map((id) => `"${id}"`).join(',')}]) { id text }`
    : 'column_values { id text }'

  const firstQuery = `query {
    items_page_by_column_values(
      board_id: ${MANAGEMENT_LEADS_BOARD},
      columns: [{ column_id: "${COL.phoneE164}", column_values: [${variantLiteral}] }],
      limit: 100
    ) {
      cursor
      items {
        id
        name
        ${colsLiteral}
      }
    }
  }`

  let data: any = await mondayQuery(firstQuery)
  let page: any = data?.items_page_by_column_values

  while (page) {
    const items: any[] = page.items || []
    if (items.length > 0) {
      const item = items[0]
      const cols: Record<string, string> = {}
      for (const c of item.column_values || []) {
        if (c?.id) cols[c.id] = c.text ?? ''
      }
      return {
        id: String(item.id),
        name: String(item.name || ''),
        columns: cols,
      }
    }
    const cursor: string | null = page.cursor || null
    if (!cursor) break
    const nextQuery = `query {
      next_items_page(cursor: "${cursor}", limit: 100) {
        cursor
        items {
          id
          name
          ${colsLiteral}
        }
      }
    }`
    data = await mondayQuery(nextQuery)
    page = data?.next_items_page
  }
  return null
}

// Fetch the most recent N item updates for a lead. Used to recover prior
// call summaries, email logs, and web-meeting recaps so Lucy can open the
// inbound call with full context.
export async function fetchLeadUpdates(
  itemId: string | number,
  limit = 10,
): Promise<Array<{ body: string; createdAt: string }>> {
  const query = `query {
    items(ids: [${itemId}]) {
      updates(limit: ${limit}) {
        body
        created_at
      }
    }
  }`
  const data: any = await mondayQuery(query)
  const updates = data?.items?.[0]?.updates || []
  return updates.map((u: any) => ({
    body: String(u?.body || ''),
    createdAt: String(u?.created_at || ''),
  }))
}
