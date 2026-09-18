// Group a case's events by date, so the timeline and table show one entry per
// date - "a specific event" - pulling together the different pieces of
// information about that date, whichever submission each came from.

import { EventRow } from "@/lib/api";
import { Importance, topImportance } from "@/lib/importance";

const IMPORTANCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export interface DateGroup {
  date: string;
  top: Importance | null; // highest-priority piece of information on this date
  events: EventRow[]; // most important first
}

export function groupEventsByDate(events: EventRow[]): DateGroup[] {
  const byDate = new Map<string, EventRow[]>();
  for (const e of events) {
    const list = byDate.get(e.event_date) ?? [];
    list.push(e);
    byDate.set(e.event_date, list);
  }

  const groups: DateGroup[] = [];
  for (const [date, dateEvents] of byDate) {
    const sorted = [...dateEvents].sort(
      (a, b) => (IMPORTANCE_RANK[a.importance] ?? 3) - (IMPORTANCE_RANK[b.importance] ?? 3)
    );
    const counts = { high: 0, medium: 0, low: 0 };
    for (const e of sorted) {
      if (e.importance === "high") counts.high++;
      else if (e.importance === "medium") counts.medium++;
      else if (e.importance === "low") counts.low++;
    }
    groups.push({ date, top: topImportance(counts), events: sorted });
  }

  groups.sort((a, b) => a.date.localeCompare(b.date));
  return groups;
}
