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

const COMMANDS: Record<string, ViewId> = {
  'command centre':  'command',
  'command center':  'command',
  'news':            'news',
  'briefing':        'news',
  'investments':     'investments',
  'portfolio':       'investments',
  'stocks':          'investments',
  'leads':           'leads',
  'sales':           'leads',
  'pipeline':        'leads',
  'tasks':           'tasks',
  'to do':           'tasks',
  'intelligence':    'intelligence',
  'log':             'log',
  'conversation':    'log',
  'transcript':      'log',
};

export function routeCommand(text: string): ViewId | null {
  const lower = text.toLowerCase();
  for (const [key, view] of Object.entries(COMMANDS)) {
    if (lower.includes(key)) return view;
  }
  return null;
}
