// ─────────────────────────────────────────────────────────────────────────────
// JARVIS view routes
//
// The rich views that app/page.tsx can mount in the main panel. All routing
// is decided on the client (see applyNavIntents in app/page.tsx); the chat
// route no longer detects commands — it is told which view is open via
// `activeView` in the request body.
// ─────────────────────────────────────────────────────────────────────────────

export type ViewRoute = 'news-briefing' | 'investment-dashboard' | null;
