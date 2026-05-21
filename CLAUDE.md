# CLAUDE.md — JARVIS Project Memory

You are working on JARVIS, the personal voice-driven command centre for
Zac, founder of Stayful (UK short-term-rental hospitality). Read this
file before doing anything else — it captures conventions and
architectural decisions that aren't obvious from the code.

Run `git log --oneline -20` to see what changed recently. Each commit
message is a self-contained explanation of intent.

---

## Branch & deploy model

- Production branch: `main` → Vercel **production** deploy.
- Feature branches (e.g. `claude/setup-jarvis-project-*`) → Vercel
  **preview** deploys at branch URLs.
- Work in progress lives on a feature branch. When stable, open a PR
  into `main`. The PR body should explain the *why*. Merging pushes
  production forward.
- Push every commit with `git push -u origin <branch>` — retries on
  network errors only (2/4/8/16s).

---

## Model IDs (strict)

- All Anthropic API calls use one of:
  - `claude-opus-4-7`
  - `claude-sonnet-4-6`
  - `claude-haiku-4-5-20251001`
- **Never** use older dated IDs like `claude-sonnet-4-20250514` or
  `claude-opus-4-5`. The news pipeline was migrated to `sonnet-4-6` for
  speed. If you see a dated ID in code, that's a bug.

---

## Voice transcript pipeline (the critical flow)

Every final transcript (voice or text input) flows through this exact
chain in `app/page.tsx`. Each handler returns `true` to short-circuit:

```
stopSpeaking()
  ↓
handlePresenceCheck(text)    // "are you there?" → instant local ack
  ↓
handleNewsRequest(text)      // news intent / category routing / summarise
  ↓
handleNewsConversation(text) // stop/no-more during open briefing
  ↓
applyNavIntents(text)        // non-news nav: portfolio, lucy, leads, etc
  ↓
sendMessage(text)            // Claude fallback (always responds)
```

Both the voice path (`useVoiceInput.onFinalTranscript`) and the typed
path (`handleSend`) use this same chain. If you add a new local
intercept, wire it into **both**.

**Why this order matters:**
- Presence checks must respond in <500ms (no Claude round-trip).
- News routing is owned locally so the briefing opens instantly with
  the right category filter — don't move it back into Claude's
  `/api/chat` route detector.
- `applyNavIntents` runs *after* the local handlers, so a news intent
  is already resolved by the time we get there.

---

## Routing split: `routedView` vs `activeView`

There are two view-state systems and they aren't interchangeable:

- `routedView` (type `ViewRoute` from `lib/commandRouter.ts`): the
  **rich modern views** — `news-briefing`, `investment-dashboard`,
  etc. Set directly from `app/page.tsx` (local handlers) **or** via
  `useJARVIS.onRoute` (server-side detection in `/api/chat`).
- `activeView` (type `ViewId` from `lib/jarvis-design.ts`): the
  **legacy pane system** — `news`, `investments`, `leads`, etc. Driven
  by `routeCommand()` regex in `applyNavIntents`.

The render tree in `app/page.tsx` checks `routedView` first, so
`activeView` is effectively invisible when a `routedView` is set.
Prefer `routedView` for any new feature.

---

## Voice intent matchers (where to add new phrases)

- `lib/voice-news-intents.ts` — news/category/summarise/stop patterns.
- `lib/voice-presence.ts` — presence-check phrases ("are you there?").
- `lib/lucy-commands.ts` — Lucy-specific.
- `lib/portfolio/commands.ts` — portfolio-specific.
- `lib/commandRouter.ts` — server-side detection inside `/api/chat`.
- `lib/jarvis-design.ts` (`routeCommand`) — legacy keyword → ViewId.

Add new utterance phrasings to the matcher closest to the feature.
Patterns are regex against `text.toLowerCase()`. Order matters when
patterns can overlap (first match wins in `detectCategoryFocus`).

---

## Suppressing TTS overlap

`skipNextAssistantSpeechRef` in `app/page.tsx` exists because nav-ack
acknowledgments + Claude's chat reply + briefing summary could all
speak at once. The pattern:

```ts
if (ack && !muted) {
  skipNextAssistantSpeechRef.current = true;  // muzzle next assistant message TTS
  speak(ack);
}
```

The auto-speak `useEffect` (line ~135) consumes the flag once and
resets it. **Local handlers that don't call `sendMessage` don't need
this** — Claude never replies, so nothing to muzzle.

---

## Barge-in (interrupt JARVIS by speaking)

A `useEffect` in `app/page.tsx` watches `useVoiceInput.partialTranscript`
and calls `stopSpeaking()` whenever it becomes non-empty while
`isSpeaking` is true. This gives true conversational interrupt —
JARVIS halts the moment the recogniser detects you've started
talking, not after you finish a sentence.

Don't replace this with a `onFinalTranscript`-based stop: that fires
only after 1.5s of trailing silence, which is too late for natural
turn-taking. Echo from speaker → mic can occasionally produce a
spurious partial during JARVIS playback; if this becomes a problem,
add a minimum-length threshold (≥3 chars) or a 300ms grace window
after `speak()` starts before honouring partials.

---

## `useTTS.onEnd` is the only real "audio played" signal

`speak()` resolves whether or not `audio.play()` actually played.
Browsers block autoplay before any user gesture and the rejection is
caught internally. To detect actual playback success (e.g. for
"greeted on login" sessionStorage flag), use `onEnd` in the useTTS
options, not the promise return.

This is exactly what the login-page greeting does — see
`app/login/page.tsx` for the autoplay-fallback pattern (try on mount,
arm `keydown`/`pointerdown` listener as backup, consume on first
successful playback).

---

## News briefing — fast path

- `/api/news` accepts a `categories: string[]` body field for
  upstream filtering. One category → ~4–8 articles → typically one
  Sonnet batch → ~3–5s instead of ~10s for full briefing.
- Drive it from voice via `newsCategoriesFilter` state in
  `app/page.tsx`; pass through `initialCategories` prop to
  `NewsBriefingView`.
- Use a React `key` prop on `NewsBriefingView` (the joined category
  list) so switching categories remounts and refetches cleanly.
- Voice summary endpoint: `/api/news/voice-summary` — takes the
  article list + optional category, returns a 3–5 sentence flowing
  Sonnet 4.6 synthesis. Not a verbatim read.
- "Summarise the news" when briefing is already open re-narrates the
  cached `loadedArticlesRef` set instead of asking "what type?". See
  `isSummariseRequest` in `lib/voice-news-intents.ts` and the
  summarise branch at the top of `handleNewsRequest` in `app/page.tsx`.
  If a *different* category is named in the same utterance, it falls
  through to the switch+refetch path and `onComplete` narrates the
  fresh load.

---

## Approval flow (write actions)

JARVIS never auto-executes write actions. Every write must emit an
`<action_request>{...}</action_request>` JSON block at the END of the
response. See `lib/jarvis-system-prompt.ts` for the exact format and
required fields per ACTION_TYPE. The frontend parses this and renders
an approval card. Don't bypass this — it's load-bearing.

---

## Never go silent

System prompt enforces: every user message gets a response. If the
intent is unclear, Claude must briefly list 4–6 most-likely
capabilities and ask which fits — never "I don't understand", never
silence. See the "WHEN YOU CAN'T TELL WHAT ZAC IS ASKING" section in
`lib/jarvis-system-prompt.ts`.

---

## What to write to this file

Add a new section when you make a decision a future agent couldn't
infer from reading the code. Examples worth recording:
- New convention or pattern adopted across files.
- A non-obvious gotcha (race, autoplay quirk, browser quirk).
- An architectural choice that has alternatives (so future you doesn't
  re-debate).

**Don't** duplicate things obvious from filenames or comments. This
file should stay tight — under ~200 lines. Trim aggressively.
