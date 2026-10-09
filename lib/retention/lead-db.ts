// ─── The lead-database feed (server only) ────────────────────────────────────
//
// Churn, tenure, MRR and cancel reasons come from the lead-database app
// (ZacStayful/lead-database, leads.stayful.co.uk), which owns that arithmetic
// in its src/lib/retention.ts. It exposes a read-only summary at
// GET /api/internal/retention, gated by a shared secret:
//
//   LEAD_DATABASE_INTERNAL_SECRET here  ===  JARVIS_INTERNAL_SECRET there
//
// Their route fails closed — 404 when its secret is unset, 401 when ours is
// wrong — so both read as "check the secret on both apps". Without the
// secret the dashboard still shows the Monday funnel and marks churn as
// approximate. Nothing here ever writes.

import type { LeadDbRetention, LeadDbStatus } from './types';

const DEFAULT_URL = 'https://leads.stayful.co.uk';
const CACHE_TTL_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 10_000;

export const LEAD_DB_NOT_CONFIGURED_ERROR =
  'LEAD_DATABASE_INTERNAL_SECRET is not set, so churn and retention come from the Monday board only (approximate)';

export type LeadDbResult =
  | { ok: true; data: LeadDbRetention }
  | { ok: false; status: Exclude<LeadDbStatus, 'ok'>; error: string };

export function leadDbConfig(): { url: string; secret: string } | null {
  const secret = process.env.LEAD_DATABASE_INTERNAL_SECRET?.trim();
  if (!secret) return null;
  const base = (process.env.LEAD_DATABASE_URL?.trim() || DEFAULT_URL).replace(/\/+$/, '');
  return { url: `${base}/api/internal/retention`, secret };
}

export function hasLeadDbConfig(): boolean {
  return leadDbConfig() !== null;
}

let cache: { data: LeadDbRetention; fetchedAt: number } | null = null;
let inflight: Promise<LeadDbResult> | null = null;

export function invalidateLeadDbCache(): void {
  cache = null;
}

function looksLikeRetention(body: unknown): body is LeadDbRetention {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return Array.isArray(b.products) && Array.isArray(b.lifecycle) && typeof b.asOf === 'string';
}

export async function fetchLeadDbRetention(): Promise<LeadDbResult> {
  const cfg = leadDbConfig();
  if (!cfg) return { ok: false, status: 'not_configured', error: LEAD_DB_NOT_CONFIGURED_ERROR };

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return { ok: true, data: cache.data };
  if (inflight) return inflight;

  inflight = (async (): Promise<LeadDbResult> => {
    try {
      const res = await fetch(cfg.url, {
        headers: { 'x-internal-secret': cfg.secret, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 401 || res.status === 404) {
        return {
          ok: false,
          status: 'unavailable',
          error: `lead database refused the request (HTTP ${res.status}) — check LEAD_DATABASE_INTERNAL_SECRET here equals JARVIS_INTERNAL_SECRET on leads.stayful.co.uk`,
        };
      }
      if (!res.ok) {
        return { ok: false, status: 'unavailable', error: `lead database returned HTTP ${res.status}` };
      }
      const body = (await res.json().catch(() => null)) as unknown;
      if (!looksLikeRetention(body)) {
        return { ok: false, status: 'unavailable', error: 'lead database returned an unexpected shape' };
      }
      if (body.unavailable) {
        return { ok: false, status: 'unavailable', error: 'lead database could not read its customers or payments' };
      }
      cache = { data: body, fetchedAt: Date.now() };
      return { ok: true, data: body };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      return { ok: false, status: 'unavailable', error: `lead database fetch failed (${reason})` };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
