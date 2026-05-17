// ─────────────────────────────────────────────────────────────────────────────
// News Category Definitions
// Maps category IDs to NewsAPI search queries, labels, and visual config.
// Ordered by strategic priority for Stayful.
// ─────────────────────────────────────────────────────────────────────────────

export interface NewsCategory {
  id: string;
  label: string;
  shortLabel: string;
  color: string;          // CSS hex — used for category badge
  queries: string[];      // NewsAPI search queries (use first 1-2 to avoid rate limits)
  pageSize: number;       // Articles to fetch per query
  strategicPriority: 1 | 2 | 3; // 1 = highest relevance to Zac
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  {
    id: 'regulatory',
    label: 'Regulatory & Compliance',
    shortLabel: 'Regulatory',
    color: '#e53e3e',
    queries: [
      'UK short term rental regulation licensing',
      'England planning permission property landlord law 2025',
    ],
    pageSize: 5,
    strategicPriority: 1,
  },
  {
    id: 'str-property',
    label: 'STR & Property Market',
    shortLabel: 'STR / Property',
    color: '#d4a017',
    queries: [
      'Airbnb short term rental UK property management',
      'UK property market landlord 2025',
    ],
    pageSize: 5,
    strategicPriority: 1,
  },
  {
    id: 'interest-rates',
    label: 'Interest Rates & Monetary Policy',
    shortLabel: 'Rates',
    color: '#d4a017',
    queries: [
      'Bank of England interest rates UK monetary policy',
      'UK mortgage rates inflation 2025',
    ],
    pageSize: 4,
    strategicPriority: 1,
  },
  {
    id: 'uk-business',
    label: 'UK Business',
    shortLabel: 'UK Business',
    color: '#5d8156',
    queries: [
      'UK business economy growth 2025',
    ],
    pageSize: 5,
    strategicPriority: 2,
  },
  {
    id: 'uk-politics',
    label: 'UK Politics',
    shortLabel: 'UK Politics',
    color: '#5d8156',
    queries: [
      'UK government policy economy Labour 2025',
    ],
    pageSize: 4,
    strategicPriority: 2,
  },
  {
    id: 'ai-tech',
    label: 'AI & Technology',
    shortLabel: 'AI / Tech',
    color: '#6b9de8',
    queries: [
      'artificial intelligence business automation 2025',
      'AI property technology proptech',
    ],
    pageSize: 4,
    strategicPriority: 2,
  },
  {
    id: 'competitor',
    label: 'Competitor Intelligence',
    shortLabel: 'Competitors',
    color: '#d4a017',
    queries: [
      'Airbnb VRBO property management company UK news',
    ],
    pageSize: 4,
    strategicPriority: 2,
  },
  {
    id: 'international',
    label: 'International Markets',
    shortLabel: 'International',
    color: '#5d8156',
    queries: [
      'international markets UK economy impact global',
    ],
    pageSize: 3,
    strategicPriority: 3,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Priority visual config — maps priority string to display properties
// ─────────────────────────────────────────────────────────────────────────────

export interface PriorityConfig {
  label: string;
  color: string;         // Border + badge color
  bgTint: string;        // Subtle card background tint
  icon: string;          // Emoji indicator
}

export const PRIORITY_CONFIG: Record<string, PriorityConfig> = {
  red: {
    label: 'CRITICAL',
    color: '#e53e3e',
    bgTint: 'rgba(229, 62, 62, 0.06)',
    icon: '⚠',
  },
  amber: {
    label: 'MONITOR',
    color: '#d4a017',
    bgTint: 'rgba(212, 160, 23, 0.06)',
    icon: '◆',
  },
  gold: {
    label: 'OPPORTUNITY',
    color: '#f0c040',
    bgTint: 'rgba(240, 192, 64, 0.06)',
    icon: '✦',
  },
  green: {
    label: 'INTEL',
    color: '#5d8156',
    bgTint: 'rgba(93, 129, 86, 0.06)',
    icon: '●',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_CATEGORY_IDS = NEWS_CATEGORIES.map(c => c.id);

export function getCategoryById(id: string): NewsCategory | undefined {
  return NEWS_CATEGORIES.find(c => c.id === id);
}

export function getCategoryLabel(id: string): string {
  return getCategoryById(id)?.shortLabel ?? id;
}

export function getCategoryColor(id: string): string {
  return getCategoryById(id)?.color ?? '#5d8156';
}

// Sort articles: red first, then amber, gold, green
const PRIORITY_ORDER = { red: 0, amber: 1, gold: 2, green: 3 };
export function sortByPriority<T extends { priority: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 4) -
      (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 4)
  );
}
