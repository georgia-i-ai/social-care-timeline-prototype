"use client";

import { EventRow } from "@/lib/api";
import { IMPORTANCE_BG, IMPORTANCE_BORDER, IMPORTANCE_DOT } from "@/lib/importance";
import { groupEventsByDate } from "@/lib/groupEvents";

export function CaseTimeline({
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

  const groups = groupEventsByDate(events);

  return (
    <ol className="relative ml-3 border-l-2 border-gray-200">
      {groups.map((group) => (
        <li key={group.date} className="relative pb-5 pl-6">
          <span
            className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-2 ring-white ${
              group.top ? IMPORTANCE_DOT[group.top] : "bg-gray-400"
            }`}
          />
          <div className="text-sm font-medium whitespace-nowrap">{group.date}</div>

          <ul className="mt-2 space-y-2">
            {group.events.map((event) => {
              const focused = event.id === focusedEventId;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(event)}
                    className="flex w-full flex-wrap items-center gap-2 text-left"
                  >
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        IMPORTANCE_BG[event.importance] ?? "bg-gray-100"
                      } ${focused ? "outline outline-2 outline-offset-1 outline-pink-500" : ""}`}
                    >
                      {event.importance}
                    </span>
                    <span className="text-sm">{event.category}</span>
                  </button>

                  {focused && (
                    <div
                      className={`mt-1 space-y-1 rounded border p-3 text-sm ${
                        IMPORTANCE_BORDER[event.importance] ?? "border-gray-200"
                      } ${IMPORTANCE_BG[event.importance] ?? ""}`}
                    >
                      <p>{event.summary}</p>
                      {event.reason && <p className="text-xs text-gray-600">{event.reason}</p>}
                      {event.people_involved && (
                        <p className="text-xs text-gray-500">People: {event.people_involved}</p>
                      )}
                      <p className="text-xs text-blue-700">
                        ↓ Highlighted in the source document.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
