"use client";

import { Fragment } from "react";
import { EventRow } from "@/lib/api";
import { IMPORTANCE_BG, IMPORTANCE_DOT } from "@/lib/importance";
import { groupEventsByDate } from "@/lib/groupEvents";

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

  const groups = groupEventsByDate(events);

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Summary</th>
            <th className="px-3 py-2">Importance</th>
            <th className="px-3 py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.date}>
              <tr className="border-t border-gray-200 bg-gray-100">
                <td className="px-3 py-2 font-medium whitespace-nowrap" colSpan={4}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        group.top ? IMPORTANCE_DOT[group.top] : "bg-gray-400"
                      }`}
                    />
                    {group.date}
                  </span>
                </td>
              </tr>
              {group.events.map((event) => (
                <tr
                  key={event.id}
                  onClick={() => onSelect(event)}
                  className={`cursor-pointer border-t border-gray-100 hover:brightness-95 ${
                    IMPORTANCE_BG[event.importance] ?? ""
                  } ${event.id === focusedEventId ? "ring-2 ring-inset ring-pink-500" : ""}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{event.category}</td>
                  <td className="px-3 py-2">{event.summary}</td>
                  <td className="px-3 py-2 whitespace-nowrap capitalize">{event.importance}</td>
                  <td className="px-3 py-2 text-gray-600">{event.reason}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
