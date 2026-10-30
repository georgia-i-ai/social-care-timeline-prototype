"use client";

import { Tag } from "@i-dot-ai-npm/component-library-react";
import { EventRow } from "@/lib/api";
import { IMPORTANCE_BG, IMPORTANCE_BORDER, IMPORTANCE_DOT, IMPORTANCE_TAG } from "@/lib/importance";
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
    return <p className="govuk-hint">No events yet - add an input above.</p>;
  }

  const groups = groupEventsByDate(events);

  return (
    <ol className="relative ml-3 border-l-2 border-gray-200" style={{ listStyle: "none", paddingLeft: 0 }}>
      {groups.map((group) => (
        <li key={group.date} className="relative pb-5 pl-6">
          <span
            className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-2 ring-white ${
              group.top ? IMPORTANCE_DOT[group.top] : "bg-gray-400"
            }`}
          />
          <div className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-2">{group.date}</div>

          <ul className="space-y-2" style={{ listStyle: "none", paddingLeft: 0 }}>
            {group.events.map((event) => {
              const focused = event.id === focusedEventId;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(event)}
                    className="flex w-full flex-wrap items-center gap-2 text-left"
                  >
                    <Tag
                      colour={IMPORTANCE_TAG[event.importance] ?? "grey"}
                      style={focused ? { outline: "3px solid #d6336c", outlineOffset: 1 } : undefined}
                    >
                      {event.importance}
                    </Tag>
                    <span className="govuk-body-s govuk-!-margin-bottom-0">{event.category}</span>
                  </button>

                  {focused && (
                    <div
                      className={`mt-1 space-y-1 rounded border p-3 ${
                        IMPORTANCE_BORDER[event.importance] ?? "border-gray-200"
                      } ${IMPORTANCE_BG[event.importance] ?? ""}`}
                    >
                      <p className="govuk-body-s govuk-!-margin-bottom-1">{event.summary}</p>
                      {event.reason && (
                        <p className="govuk-body-s govuk-!-margin-bottom-1 text-gray-600">{event.reason}</p>
                      )}
                      {event.people_involved && (
                        <p className="govuk-body-s govuk-!-margin-bottom-1 text-gray-600">
                          People: {event.people_involved}
                        </p>
                      )}
                      <p className="govuk-body-s govuk-!-margin-bottom-0">
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
