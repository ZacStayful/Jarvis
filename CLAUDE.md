# CLAUDE.md — JARVIS Project Memory

You are working on JARVIS, the voice-driven command centre for Zac, founder
of Stayful (UK short-term-rental hospitality). Read this file before doing
anything else — it captures conventions and architectural decisions that
aren't obvious from the code.

Run `git log --oneline -20` to see what changed recently. Each commit
message is a self-contained explanation of intent.

---

## Branch & deploy model

- Production branch: `main` → Vercel **production** deploy.
- Feature branches → Vercel **preview** deploys at branch URLs.
- Work in progress lives on a feature branch. When stable, open a PR
  into `main`. The PR body should explain the *why*.
- Push every commit with `git push -u origin <branch>` — retries on
  network errors only (2/4/8/16s).
- Checks: `npx tsc --noEmit && npm test && npm run build`. Tests are
  vitest, under `lib/__tests__/`. `lib/__tests__/fixtures/utterances.ts`
  is the shared table of Zac's real phrasings and what each must do —
  add to it whenever a matcher changes.

---

## Model IDs (strict)

- All Anthropic API calls use one of:
  - `claude-opus-4-7`
  - `claude-sonnet-4-6`
  - `claude-haiku-4-5-20251001`
- **Never** use older dated IDs like `claude-sonnet-4-20250514` or
  `claude-opus-4-5`. If you see a dated ID in code, that's a bug.

---

## Staff: JARVIS and Janet

Zac talks to a two-person team that shares one conversation:

- **JARVIS** — managing director. Operations, pipeline, Lucy, Monday,
  calendar, email, investments, news, decisions. Opens every session.
- **Janet** — ad creative director. Ads, angles, creative, copy,
  web-meeting evidence, campaign performance. Calm, measured, precise.

Whoever comes in names themself **and their job title** (Zac's rule):
`handoverLines` on a toggle/voice switch, `introLine` ahead of a nav ack
when opening a view changes the speaker (`ackAs` in `app/page.tsx`), and
the HAND-OFF prompt block for server hand-offs. `persona.title` is the one
source for the title text.

Everything that differs between them is data in `lib/personas.ts`
(identity prompt, remit, greeting banks, handover/presence/thinking
lines, error line, ElevenLabs voice env var + settings). Adding a third
person is a data change.

- `activePersona` in `app/page.tsx` is who Zac is talking to. Switch via
  the header toggle or by voice (`lib/persona-commands.ts`: "switch to
  Janet", "Janet, …"). Talking *about* someone never switches.
- Every assistant message carries `speaker`. Bubbles label it; the TTS
  queue sends `persona` to `/api/speak`, which picks
  `ELEVENLABS_VOICE_ID_JARVIS` / `ELEVENLABS_VOICE_ID_JANET` (fallback
  `ELEVENLABS_VOICE_ID`).
- **Hand-offs**: a reply may end with `<handoff to="janet">brief</handoff>`
  (or `to="jarvis"`). `/api/chat` holds the tag back, emits a `speaker`
  event and runs one more streamed turn as the other person, with the
  brief in a HAND-OFF block. The client gets two messages, two voices.
  After a hand-off the active persona is the last speaker.
- Dashboards (sales, news, Lucy, portfolio, investments) are JARVIS's;
  opening one switches to him silently.

**Marketing department** (shipped by the sibling PR, kept as the data layer):
- Read-only view of the private `ZacStayful/stayful-ads` repo:
  `lib/ads/department.ts` (server only, `STAYFUL_ADS_GITHUB_TOKEN`, 1h
  cache), `/api/marketing`, `components/views/MarketingDepartmentView.tsx`.
  Never commit ad data here; never call Meta; never write to stayful-ads.
- `detectMarketingCommand` (`lib/commandRouter.ts`) runs in the chain
  before news ("department briefing" would otherwise open the news). It
  opens the view and routes to Janet unless JARVIS was named. Neither name
  is a marketing pattern — addressing is `persona-commands`.
- `/api/chat` attaches the MARKETING CONTEXT block (+ the MARKETING
  DEPARTMENT rules in the prompt) for Janet always, and for JARVIS on a
  marketing question or while `activeView === 'marketing-department'`.
  Janet owns the ads and their performance; JARVIS owns budget and the
  scaling decision; they hand over with the `<handoff>` tag, never inline
  `[JARVIS]`/`[JANET]` tags. If a reply still carries tags, `lib/ads/speakers.ts`
  labels the parts in the bubbles and `stripMarkdownForSpeech` drops them
  from speech.
- **Janet's two write actions** (the only writes to stayful-ads, both
  behind an approval card): `create_ad_brief` → `lib/janet/ads-writer.ts`
  appends to `briefs/queue.csv` (status `approved`), writes
  `briefs/B###.md`, adds a dated `DECISIONS.md` line; `build_ad` →
  `workflow_dispatch` on the repo's build workflow. `useJARVIS.approveAction`
  routes these to `/api/janet/brief` (Claude has no tool for them) and adds
  a local, announced confirmation in Janet's voice. Needs
  `STAYFUL_ADS_GITHUB_WRITE_TOKEN`; the brief id is assigned at save time.
- **Live Meta performance** (`lib/janet/meta.ts`, read-only insights) is
  attached to the marketing context only when `META_ACCESS_TOKEN` +
  `META_AD_ACCOUNT_ID` exist. `flagWeakening` is the pure rule (CTR down
  ≥20% or cost per lead up ≥25%, with rising frequency or both). Without a
  token Janet answers from the snapshot's verdicts.
- **Capacity** (lead-database buyers the landlord leads support, and the
  bottleneck): the snapshot's `capacity` block is the only source — never
  Supabase, Monday or Meta from here. `isCapacityQuestion` runs in the
  chain ahead of marketing/retention and goes to JARVIS unless Janet was
  addressed (`capacityGoesToJarvis`). It changes no view unless Zac asks to
  see the department. The server attaches the MARKETING CONTEXT for it in
  any view, and the CAPACITY rules sit in `marketingDepartmentRules`.
- **Scaling layers** (stayful-ads, 10 Oct): for JARVIS only, the context also quotes
  `HOW_META_SCALES.md`, `READING_THE_NUMBERS.md`, `SITUATIONS.md`, `ACCOUNT_LEARNINGS.md` and the last 12
  journal rows; the HOW JARVIS DECIDES block makes him name the situation (S-number) and answer in six parts.
  `SCALING_PLAN.md` is quoted without section 13 (it pushed the file past the 30k cap) and history only via
  `compactHistory` (raw lines are ~10k characters, and the cap keeps the start, i.e. the oldest weeks).
  The view's lanes panel uses the pure helpers in `lib/ads/lanes.ts`.

---

## The utterance chain (the critical flow)

Voice and typed input go through the same `handleUtterance` in
`app/page.tsx`:

```
stopSpeaking() + cancel remaining speech + interrupt() if a reply is in flight
  ↓
detectPersonaSwitch        // "switch to Janet", "Janet, …" → switch (+ remainder)
  ↓
isPresenceCheck            // "are you there?" (whole utterance) → instant local line
  ↓
handleNewsRequest          // news intent / category switch / summarise
  ↓
handleNewsConversation     // stop / no-more while the briefing is open
  ↓
applyNavIntents            // sales, portfolio, lucy, investments, legacy panes
  ↓                        //   → { consumed, openedView, deep }
sendMessage(text, deep, { inputMode, persona, activeView, viewJustOpened, viewContext })
```

`consumed` means the message was fully handled locally (sales open, sales
question, "stop"). Opening a view is *not* consumed: the ack plays and
Claude's reply is queued after it. `openedView` is passed explicitly
because React state hasn't flushed in the same tick.

---

## Routing: the client owns it

`/api/chat` does **no** intent detection and emits no route events. The
body tells it `activeView` / `viewJustOpened` / `viewContext` and the
prompt gets an ACTIVE VIEW block (and LIVE VIEW DATA, e.g. the sales
metrics line from `lib/sales/context.ts`). Two view systems remain:

- `routedView` (`ViewRoute`: `news-briefing` | `investment-dashboard` |
  `marketing-department` | `retention-dashboard`) and the boolean
  `salesOpen` / `lucyOpen` / `portfolioOpen` — the real views.
- `activeView` (`ViewId`) — the legacy mock panes (`command`, `tasks`,
  `intelligence`, `log`), reachable by explicit command or nav dots.

`clearAllViews()` before setting any of them.

---

## Lead database retention (JARVIS's dashboard)

The lead-database SaaS (operators buying landlord leads at £15) has its own
funnel and churn, in two places that neither alone covers:

- **Monday board `18420649520`** ("Stayful Lead database enquiries") is the
  funnel. Every enquiry lands there; the lead-database app writes the six
  subscription labels and `Customer start/end date`; sales labels are set by
  hand. Board and column IDs live only in `lib/retention/monday.ts` — the
  board has two "Customer start date" columns and `date_mm5ft19y` is the
  real one. The **Status column's activity log** is what gives "booked in
  period" and "ever sat a meeting"; it does not reach back to May, so the
  payload carries `history.from` and the funnel states how many customers
  are *assumed* to have sat a meeting (`assumedSatCount`).
- **The lead-database app** (`ZacStayful/lead-database`, leads.stayful.co.uk)
  owns churn, tenure-in-invoices, MRR and cancel reasons. JARVIS reads its
  `GET /api/internal/retention` with `LEAD_DATABASE_INTERNAL_SECRET` (equal
  to `JARVIS_INTERNAL_SECRET` there). Without it the view still shows the
  funnel and marks churn "approximate" from the board's labels.

The two are joined on **customer email** (`lib/retention/join.ts`). All the
arithmetic is pure (`funnel.ts`, `join.ts`, `context.ts`) and tested in
`lib/__tests__/retention.test.ts`; `/api/retention` just orchestrates.

Chain: `handleRetentionRequest` runs after marketing and before news / nav
intents, so "open the lead database" is not Lucy's and "churn rate" is not
the sales dashboard's. The open is **consumed** like sales: ack → loading
lines → a local spoken briefing (`buildRetentionBriefing`) when the data
lands. While open, a question about its numbers (`isRetentionQuestion`)
skips the sales detector and goes to Claude with `buildRetentionContextLine`
as LIVE VIEW DATA; "close/back" closes it. Never write to the board or the
lead database from here.

---

## Intent matching convention (strict / loose)

`lib/intent-utils.ts` is the shared toolkit. Every matcher splits:

- **strict** patterns: explicit phrases, match anywhere ("open lucy",
  "what's the latest news", "how are we doing").
- **loose** patterns: bare nouns ("news", "monday", "holdings", "leads"),
  match only when `isCommandShaped(text)` — starts with a nav verb or is
  ≤ 4 words after `normalise()` strips wake words and politeness.

Presence and stop/no-more are whole-utterance (`isWholeUtterance`, ≤ 4
words). Category switching while the briefing is open needs a switch
verb, a news noun, or a bare word (`isCategorySwitch`). "I had a
conversation with a landlord about the pipeline" must reach Claude; the
fixture file pins this.

Matchers: `lib/voice-presence.ts`, `lib/voice-news-intents.ts`,
`lib/jarvis-design.ts` (`routeCommand`), `lib/lucy-commands.ts`,
`lib/portfolio/commands.ts`, `lib/sales/commands.ts`
(`detectSalesCommand`, `isSalesQuestion`), `lib/investment-commands.ts`,
`lib/persona-commands.ts`. Regex on normalised text; order matters when
patterns overlap.

---

## Speech: queue, streaming, chaining

`hooks/useTTS.ts` is a queue. `speak(text, persona)` interrupts;
`enqueue(text, persona)` appends; `stop()` clears. One reused audio
element (iOS), next chunk prefetched while the current plays,
`isSpeaking` true from first enqueue to drain, `onEnd` only on a natural
drain, `currentText` = the whole group (echo filter needs it).

- Replies are spoken **as they stream**: the effect in `app/page.tsx`
  feeds every unspoken assistant message to `nextSpeakableChunks`
  (`lib/speech-chunks.ts`): first complete sentence immediately, then
  ~60-char batches, flushed on finish. Markdown is stripped; text after
  `<action_request` / `<handoff` is never spoken.
- Nav acks use `speak`, replies use `enqueue`, so the ack plays and the
  answer follows. There is no "muzzle the next reply" flag any more.
- A **thinking filler** (`persona.thinkingLines`) plays after 3 s of
  silence while loading; the first sentence is queued behind it.
- Restored history (timestamp older than mount) and `local` messages are
  never spoken by the effect; `say()` speaks local lines itself.

---

## Mic policy, talk-over and echo

- Mic is off while **thinking** (`isLoading && !isSpeaking`) and, unless
  talk-over is on, while **speaking**. Never re-arm the mic with ad-hoc
  timeouts; the always-on effect owns it (`micOff` in `app/page.tsx`).
- **Talk-over is opt-in** (header ear button, localStorage
  `jarvis_talk_over`, default off). With it on, the mic stays live during
  speech and a non-echo partial stops speech and marks the streaming
  message `cancelledSpeechRef`; the final transcript then calls
  `useJARVIS.interrupt()` (abort, keep text so far) and sends the new
  message. `requestSeqRef` in useJARVIS makes stale request handlers
  no-ops. **Lesson (shipped and reverted twice):** a live mic during TTS on
  speakers makes JARVIS hear himself, interrupt himself and answer his own
  words — the recogniser renders his speech back with digits, "£27" and
  dropped "sir", which the echo filter cannot always catch. The filter
  cannot carry a live mic alone; only headphones make talk-over safe. Do
  not make it the default again.
- Echo filter `isLikelyEcho` (`lib/voice-echo-filter.ts`) is applied to
  finals while speaking **or within 2 s of speech ending**, never later.
  Keep the bias toward the user: a blocked real response looks broken; an
  echo that slips through is a one-off glitch. Run the "political news"
  case mentally before tightening it.
- `useVoiceInput` reads its callbacks through refs — the recogniser's
  handlers live for the whole session, so this is what keeps them seeing
  current state.
- Touch devices (`pointer: coarse`) default to tap-to-talk; `/api/speak`
  playback needs a gesture there, which the greeting fallback supplies.

---

## `useTTS.onEnd` is the only real "audio played" signal

`speak()` resolves whether or not audio actually played; autoplay
rejection clears the queue and reports `onError('Audio playback
blocked')`. The greeting in `app/page.tsx` (and `app/login/page.tsx`)
sets its sessionStorage flag only in `onEnd`, and re-arms on the first
`keydown`/`pointerdown` when playback was blocked.

---

## Greeting

`buildGreeting(persona, now)` in `lib/jarvis-lines.ts`: time band
(London) × weekday flavour from the persona's banks. Added to the feed as
a `local` message on every mount; spoken once per tab session. No Claude
round-trip — the feed must not start with 3 s of silence.

---

## Memory

- `sessionId` lives in `sessionStorage` (`jarvis_session_id`) so a refresh
  resumes the KV session. New tab = new session.
- `summarise_session` fires on `visibilitychange: hidden` / `pagehide`
  with `keepalive`, trimmed to 40 messages, throttled. Transcript lines
  carry `JARVIS:` / `JANET:` attribution.
- Needs `JARVIS_INTERNAL_TOKEN` === `NEXT_PUBLIC_JARVIS_INTERNAL_TOKEN` in
  Vercel (see SETUP-STATUS.md). Without them memory is silently off.

---

## Approval flow (write actions)

Never auto-execute a write. Every write emits an
`<action_request>{...}</action_request>` JSON block at the END of the
response (format in `lib/jarvis-system-prompt.ts`). The frontend renders
an approval card. Approval turns (`JARVIS_APPROVAL:` / `JARVIS_DENY:`)
skip intent detection and hand-offs on the server.

---

## Never go silent, never a capability list

Every message gets a real reply. The prompt's "can't make out the words"
rule applies **only** to unintelligible input; a general question, a joke,
small talk or an off-tool topic is a clear request and gets answered in
character. API errors become a spoken persona `errorLine` with the
technical detail in `errorDetail` on the message (shown small, never
spoken, never sent back to the API).

---

## API route security (middleware.ts)

- Routes without the login cookie fall into three lists in `middleware.ts`:
  `SERVICE_ROUTES` (Retell, n8n, Twilio, Resend, AssemblyAI, Calendly
  functions — locked by `JARVIS_API_SECRET` via `x-jarvis-secret` / Bearer /
  `?key=`, open until that env var is set) and `PUBLIC_LEAD_ROUTES` (leads'
  browsers — open, so each route validates input with
  `lib/public-lead-input.ts`) and `SELF_AUTHENTICATED_ROUTES` (`/api/cron`
  checks `CRON_SECRET`, `/api/intelligence` checks HMAC-signed links,
  `/api/calendly/webhook` checks Calendly's signature and must never 401 —
  Calendly disables subscriptions after repeated errors). A new no-login
  route goes in one of the three lists; never add a bare bypass.

---

## What to write to this file

Add a section when you make a decision a future agent couldn't infer from
the code: a convention adopted across files, a non-obvious gotcha (race,
autoplay quirk), an architectural choice with alternatives. Don't
duplicate what filenames or comments already say. Keep it under ~200
lines; trim aggressively.
