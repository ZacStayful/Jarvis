# JARVIS — Stayful Command Centre

> Exclusive AI command centre for Zac, founder of Stayful.

## Phase 1 — Foundation (Current)

Text-based command interface with Claude AI, JARVIS personality, password authentication, and futuristic UI.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_GITHUB/Stayful-Jarvis.git
cd Stayful-Jarvis
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required for Phase 1:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `JARVIS_PASSWORD` | Choose a strong password |
| `SESSION_SECRET` | Random 32+ character string |

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run locally

```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Phase 1: JARVIS Foundation"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB/Stayful-Jarvis.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import the `Stayful-Jarvis` GitHub repo
3. Add environment variables (same as `.env.local`)
4. Deploy

### 3. Domain

In Vercel project settings → Domains → Add `jarvis.stayful.co.uk`

Add a CNAME record in your DNS:
```
jarvis → cname.vercel-dns.com
```

---

## Architecture

```
/app
  /api/auth     → Password authentication (POST = login, DELETE = logout)
  /api/chat     → Claude API streaming endpoint
  /login        → Login page
  /page.tsx     → Main JARVIS interface
  /globals.css  → Design system (CSS variables, animations)

/components
  JarvisEye.tsx       → Animated eye with state-driven behaviour
  ChatInterface.tsx   → Message history + input
  StatusBar.tsx       → Bottom status bar with live clock

/middleware.ts  → Route protection (auth required for all except /login)
```

---

## Build Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Foundation | ✅ LIVE | Next.js, auth, Claude API, text chat, UI |
| 2 — Voice | ⬜ Next | AssemblyAI + ElevenLabs integration |
| 3 — UI/UX | ⬜ | Full view system, navigation, animations |
| 4 — Integrations | ⬜ | Monday.com, Gmail, Slack, Calendly, Granola |
| 5 — Intelligence | ⬜ | News briefing, investment advisory, pattern spotting |
| 6 — Learning | ⬜ | Transcript logging, Obsidian sync, end-of-day summaries |
| 7 — Lucy Loop | ⬜ | Lucy triggering, post-call data ingestion |
| 8 — Polish | ⬜ | Session memory, cross-session context, performance |

---

## Environment Variables (Vercel)

Set in Vercel dashboard → Project → Settings → Environment Variables:

```
ANTHROPIC_API_KEY=
JARVIS_PASSWORD=
SESSION_SECRET=
ASSEMBLYAI_API_KEY=4610edab175d4b29a43ac9d60dee2cd9
ELEVENLABS_API_KEY=        (Phase 2)
ELEVENLABS_VOICE_ID=       (Phase 2)
```

---

*JARVIS is an exclusive system. Authorised access only.*

