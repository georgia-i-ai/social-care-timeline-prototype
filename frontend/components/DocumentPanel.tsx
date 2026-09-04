"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { DocumentOut } from "@/lib/api";

const IMPORTANCE_COLOR: Record<string, string> = {
  high: "#ffb3b3",
  medium: "#ffe08a",
  low: "#c9e8c9",
};

function renderHighlighted(
  text: string,
  highlights: DocumentOut["highlights"],
  focusedEventId: number | null
): ReactNode[] {
  if (highlights.length === 0) return [text];

  const pieces: ReactNode[] = [];
  let cursor = 0;
  highlights.forEach((span, i) => {
    if (span.start > cursor) pieces.push(text.slice(cursor, span.start));
    const isFocused = span.event_id !== null && span.event_id === focusedEventId;
    pieces.push(
      <mark
        key={i}
        id={span.event_id !== null ? `event-${span.event_id}` : undefined}
        title={`[${span.category ?? ""}] ${span.reason ?? ""}`}
        style={{
          backgroundColor: IMPORTANCE_COLOR[span.importance ?? ""] ?? "#dddddd",
          borderRadius: 3,
          padding: "1px 2px",
          outline: isFocused ? "3px solid #d6336c" : undefined,
          outlineOffset: isFocused ? 1 : undefined,
        }}
      >
        {text.slice(span.start, span.end)}
      </mark>
    );
    cursor = span.end;
  });
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return pieces;
}

export function DocumentPanel({
  document,
  focusedEventId,
  expanded,
  onToggle,
  apiBase,
}: {
  document: DocumentOut;
  focusedEventId: number | null;
  expanded: boolean;
  onToggle: () => void;
  apiBase: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded || focusedEventId == null) return;
    const el = containerRef.current?.querySelector(`#event-${focusedEventId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [expanded, focusedEventId]);

  const label = document.source_label ?? document.source_type;
  const isImage = document.source_type === "image" && document.media_url;
  const isAudio = document.source_type === "audio" && document.media_url;

  return (
    <div className="rounded border border-gray-200">
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2 bg-gray-50 font-medium flex justify-between items-center"
      >
        <span>
          {document.document_date} — {label} ({document.source_type})
        </span>
        <span>{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div ref={containerRef} className="p-3 space-y-3">
          {document.date_confidence === "user_provided" && (
            <p className="text-xs text-gray-500">
              Date was manually confirmed (not confidently extracted).
            </p>
          )}
          <div className={isImage ? "grid grid-cols-2 gap-3" : ""}>
            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${apiBase}${document.media_url}`}
                alt="Original"
                className="max-w-full rounded border"
              />
            )}
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {renderHighlighted(document.raw_text, document.highlights, focusedEventId)}
            </div>
          </div>
          {isAudio && <audio controls src={`${apiBase}${document.media_url}`} className="w-full" />}
        </div>
      )}
    </div>
  );
}
