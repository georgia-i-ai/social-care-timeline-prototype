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

// Text colour - darker shades than IMPORTANCE_DOT, so they stay readable on white.
export const IMPORTANCE_TEXT: Record<string, string> = {
  high: "text-red-700",
  medium: "text-amber-700",
  low: "text-green-700",
};

// Colour for the design kit's <Tag>.
export const IMPORTANCE_TAG: Record<string, "red" | "yellow" | "green"> = {
  high: "red",
  medium: "yellow",
  low: "green",
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
