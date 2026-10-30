"use client";

import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@i-dot-ai-npm/component-library-react";
import { EventRow } from "@/lib/api";
import { IMPORTANCE_BG, IMPORTANCE_DOT, IMPORTANCE_TAG } from "@/lib/importance";
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
    return <p className="govuk-hint">No events yet - add an input above.</p>;
  }

  const groups = groupEventsByDate(events);

  return (
    <Table smallTextUntilTablet>
      <TableHead>
        <TableRow>
          <TableHeader>Category</TableHeader>
          <TableHeader>Summary</TableHeader>
          <TableHeader>Importance</TableHeader>
          <TableHeader>Reason</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {groups.map((group) => (
          <Fragment key={group.date}>
            <TableRow class="bg-gray-100">
              <TableCell colSpan={4} noWrap>
                <span className="inline-flex items-center gap-2 font-bold">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      group.top ? IMPORTANCE_DOT[group.top] : "bg-gray-400"
                    }`}
                  />
                  {group.date}
                </span>
              </TableCell>
            </TableRow>
            {group.events.map((event) => (
              <TableRow
                key={event.id}
                onClick={() => onSelect(event)}
                class={`cursor-pointer hover:brightness-95 ${IMPORTANCE_BG[event.importance] ?? ""} ${
                  event.id === focusedEventId ? "ring-2 ring-inset ring-pink-500" : ""
                }`}
              >
                <TableCell noWrap>{event.category}</TableCell>
                <TableCell>{event.summary}</TableCell>
                <TableCell noWrap>
                  <Tag colour={IMPORTANCE_TAG[event.importance] ?? "grey"}>{event.importance}</Tag>
                </TableCell>
                <TableCell>{event.reason}</TableCell>
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
