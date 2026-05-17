// ─── MCP Server Configuration ────────────────────────────────────────────────
//
// Each integration requires an authorization token stored as an env variable.
// Servers with missing tokens are excluded automatically — JARVIS degrades
// gracefully and tells Zac which integrations aren't available.
//
// Required env variables:
//   MONDAY_API_KEY          — Monday.com API token (Account > Admin > API)
//   GOOGLE_ACCESS_TOKEN     — Google OAuth access token (covers Drive/Gmail/Calendar)
//   SLACK_BOT_TOKEN         — Slack Bot OAuth token (xoxb-...)
//   CALENDLY_API_KEY        — Calendly Personal Access Token
//   GRANOLA_API_KEY         — Granola API token
//
// ─────────────────────────────────────────────────────────────────────────────

export interface MCPServer {
  type: 'url';
  url: string;
  name: string;
  authorization_token?: string;
}

export interface MCPConfig {
  servers: MCPServer[];
  missing: string[];
}

export function buildMcpServers(): MCPConfig {
  const servers: MCPServer[] = [];
  const missing: string[] = [];

  // ── Monday.com ──────────────────────────────────────────────────────────────
  if (process.env.MONDAY_API_KEY) {
    servers.push({
      type: 'url',
      url: 'https://mcp.monday.com/mcp',
      name: 'monday',
      authorization_token: `Bearer ${process.env.MONDAY_API_KEY}`,
    });
  } else {
    missing.push('Monday.com');
  }

  // ── Google Drive ─────────────────────────────────────────────────────────────
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    servers.push({
      type: 'url',
      url: 'https://drivemcp.googleapis.com/mcp/v1',
      name: 'google_drive',
      authorization_token: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`,
    });
  } else {
    missing.push('Google Drive');
  }

  // ── Gmail ────────────────────────────────────────────────────────────────────
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    servers.push({
      type: 'url',
      url: 'https://gmailmcp.googleapis.com/mcp/v1',
      name: 'gmail',
      authorization_token: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`,
    });
    // Gmail shares the same Google access token — no separate missing entry
  }

  // ── Google Calendar ──────────────────────────────────────────────────────────
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    servers.push({
      type: 'url',
      url: 'https://calendarmcp.googleapis.com/mcp/v1',
      name: 'google_calendar',
      authorization_token: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`,
    });
  }

  // ── Slack ────────────────────────────────────────────────────────────────────
  if (process.env.SLACK_BOT_TOKEN) {
    servers.push({
      type: 'url',
      url: 'https://mcp.slack.com/mcp',
      name: 'slack',
      authorization_token: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    });
  } else {
    missing.push('Slack');
  }

  // ── Calendly ─────────────────────────────────────────────────────────────────
  if (process.env.CALENDLY_API_KEY) {
    servers.push({
      type: 'url',
      url: 'https://mcp.calendly.com',
      name: 'calendly',
      authorization_token: `Bearer ${process.env.CALENDLY_API_KEY}`,
    });
  } else {
    missing.push('Calendly');
  }

  // ── Granola ──────────────────────────────────────────────────────────────────
  if (process.env.GRANOLA_API_KEY) {
    servers.push({
      type: 'url',
      url: 'https://mcp.granola.ai/mcp',
      name: 'granola',
      authorization_token: `Bearer ${process.env.GRANOLA_API_KEY}`,
    });
  } else {
    missing.push('Granola');
  }

  return { servers, missing };
}

// ── Integration display names for UI reporting ────────────────────────────────
export const INTEGRATION_LABELS: Record<string, string> = {
  monday: 'Monday.com',
  google_drive: 'Google Drive',
  gmail: 'Gmail',
  google_calendar: 'Google Calendar',
  slack: 'Slack',
  calendly: 'Calendly',
  granola: 'Granola',
};
