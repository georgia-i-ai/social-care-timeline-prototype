// Shared reviewer-priority ("importance") styling and helpers.
//
// "Importance" is how much a human reviewer should prioritise looking at a
// passage (an escalation, a disclosure, a missed appointment, ...). It is NOT
// a risk score for the family — see the extraction prompt on the backend.

export const IMPORTANCE_LEVELS = ["high", "medium", "low"] as const;
export type Importance = (typeof IMPORTANCE_LEVELS)[number];

// Row/panel tint (light background).
export const IMPORTANCE_BG: Record<string, string> = {
  high: "bg-red-100",
  medium: "bg-amber-100",
  low: "bg-green-100",
};

// Solid dot / marker colour.
export const IMPORTANCE_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};

// Border to pair with IMPORTANCE_BG.
export const IMPORTANCE_BORDER: Record<string, string> = {
  high: "border-red-300",
  medium: "border-amber-300",
  low: "border-green-300",
};

interface Counts {
  high: number;
  medium: number;
  low: number;
}

/** The highest-priority level with at least one flagged event, or null if none. */
export function topImportance(counts: Counts): Importance | null {
  if (counts.high > 0) return "high";
  if (counts.medium > 0) return "medium";
  if (counts.low > 0) return "low";
  return null;
}

/** e.g. "3 high · 2 med · 4 low", or "No items flagged" when all zero. */
export function flaggedSummary(counts: Counts): string {
  const parts: string[] = [];
  if (counts.high > 0) parts.push(`${counts.high} high`);
  if (counts.medium > 0) parts.push(`${counts.medium} med`);
  if (counts.low > 0) parts.push(`${counts.low} low`);
  return parts.length > 0 ? parts.join(" · ") : "No items flagged";
}
