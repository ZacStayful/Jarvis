// lib/whatsapp-intent.ts
// One-word intent classification of an inbound WhatsApp reply via Claude.
// Always returns one of the Intent values — on any error, 'unclear'.

import type { ConversationState } from './whatsapp-conversation'

export type Intent =
  | 'booking_signal'
  | 'positive_interest'
  | 'objection'
  | 'abandonment'
  | 'question'
  | 'unclear'

const ALLOWED: Intent[] = [
  'booking_signal',
  'positive_interest',
  'objection',
  'abandonment',
  'question',
  'unclear',
]

const CLASSIFIER_SYSTEM = `You are classifying the intent of an SMS reply from a UK property owner contacted about short-term rental management. Reply with exactly one word from this list: booking_signal, positive_interest, objection, abandonment, question, unclear. Nothing else.

booking_signal: mentions dates, wants to discuss, asks for call, asks for more info actively
positive_interest: sounds open but no specific action
objection: raises concern (cost, trust, tenant, management)
abandonment: stop, not interested, remove me, leave me alone
question: asks a specific factual question
unclear: cannot determine`

export async function classifyIntent(
  message: string,
  conversationHistory: ConversationState,
): Promise<Intent> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return 'unclear'

  const recent = (conversationHistory?.messages || []).slice(-6)
  const history = recent
    .map((m) => `${m.role === 'outbound' ? 'Stayful' : 'Lead'}: ${m.content}`)
    .join('\n')

  const userContent = history
    ? `Conversation so far:\n${history}\n\nLatest reply from the lead:\n"${message}"\n\nClassify the intent.`
    : `Latest reply from the lead:\n"${message}"\n\nClassify the intent.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: CLASSIFIER_SYSTEM,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!res.ok) return 'unclear'
    const json: any = await res.json()
    const raw = json?.content?.[0]?.text
    if (typeof raw !== 'string') return 'unclear'
    const word = raw.trim().toLowerCase().split(/\s+/)[0].replace(/[.,!?]$/, '')
    if (ALLOWED.includes(word as Intent)) return word as Intent
    return 'unclear'
  } catch {
    return 'unclear'
  }
}
