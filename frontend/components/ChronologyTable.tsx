"use client";

import { EventRow } from "@/lib/api";

const IMPORTANCE_BG: Record<string, string> = {
  high: "bg-red-100",
  medium: "bg-amber-100",
  low: "bg-green-100",
};

export function ChronologyTable({
  events,
  onSelect,
  focusedEventId,
}: {
  events: EventRow[];
  onSelect: (event: EventRow) => void;
  focusedEventId: number | null;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No events yet - add an input below.</p>;
  }

  const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Summary</th>
            <th className="px-3 py-2">Importance</th>
            <th className="px-3 py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((event) => (
            <tr
              key={event.id}
              onClick={() => onSelect(event)}
              className={`cursor-pointer border-t border-gray-100 hover:brightness-95 ${
                IMPORTANCE_BG[event.importance] ?? ""
              } ${event.id === focusedEventId ? "ring-2 ring-inset ring-pink-500" : ""}`}
            >
              <td className="px-3 py-2 whitespace-nowrap">{event.event_date}</td>
              <td className="px-3 py-2 whitespace-nowrap">{event.category}</td>
              <td className="px-3 py-2">{event.summary}</td>
              <td className="px-3 py-2 whitespace-nowrap capitalize">{event.importance}</td>
              <td className="px-3 py-2 text-gray-600">{event.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
