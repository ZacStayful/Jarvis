import { isCommandShaped, normalise } from '@/lib/intent-utils';

export const C = {
  bg:       '#050c05',
  surface:  '#0b190a',
  surfHi:   '#112010',
  border:   '#1b3318',
  borderHi: '#2c4e28',
  primary:  '#5d8156',
  bright:   '#7aba6e',
  dim:      '#3a5236',
  text:     '#d4ecd2',
  textMid:  '#7fa87c',
  textLow:  '#3e5e3c',
  amber:    '#f4a435',
  red:      '#e04444',
  gold:     '#c79a12',
  cyan:     '#38c4b4',
} as const;

export type ViewId =
  | 'command'
  | 'news'
  | 'investments'
  | 'leads'
  | 'tasks'
  | 'intelligence'
  | 'log';

// Legacy keyword panes. Only explicit, command-shaped utterances open them
// ("open tasks", "show the command centre"); an ordinary sentence that
// happens to contain "log" or "to do" never does. The words owned by the
// real features (news, investments, portfolio, leads, sales, pipeline) are
// routed by their own matchers in app/page.tsx before this runs.
const COMMANDS: Array<{ pattern: RegExp; view: ViewId }> = [
  { pattern: /\bcommand\s+cent(?:re|er)\b/, view: 'command' },
  { pattern: /\btasks?\b|\bto[- ]?dos?\b|\btask\s+cent(?:re|er)\b/, view: 'tasks' },
  { pattern: /\bintelligence\b/, view: 'intelligence' },
  { pattern: /\bconversation\s+log\b|\btranscripts?\b|\b(?:the\s+)?log\b/, view: 'log' },
];

export function routeCommand(text: string): ViewId | null {
  if (!isCommandShaped(text)) return null;
  const lower = normalise(text);
  for (const { pattern, view } of COMMANDS) {
    if (pattern.test(lower)) return view;
  }
  return null;
}
