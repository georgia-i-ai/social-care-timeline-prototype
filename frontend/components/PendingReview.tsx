"use client";

import { useState } from "react";
import { PendingDocument } from "@/lib/api";

export function PendingReview({
  pending,
  onConfirm,
  onDiscard,
  saving,
}: {
  pending: PendingDocument;
  onConfirm: (documentDate: string, dateConfidence: "high" | "low" | "user_provided") => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const inferred = pending.document_date;
  const confident = Boolean(inferred) && pending.date_confidence === "high";
  const [date, setDate] = useState(inferred ?? new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-3 rounded border border-amber-300 bg-amber-50 p-4">
      <p className="font-medium">Review before saving to the case</p>
      <textarea
        readOnly
        value={pending.raw_text}
        className="w-full h-40 rounded border border-gray-300 p-2 text-sm bg-white"
      />

      {confident ? (
        <p className="text-sm text-green-700">
          Document date inferred: {inferred} (high confidence)
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-sm text-red-700">
            Couldn&apos;t confidently determine a date for this document from its content -
            please confirm one before it can be saved.
          </p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          disabled={saving || !date}
          onClick={() => onConfirm(date, confident ? "high" : "user_provided")}
          className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save to case"}
        </button>
        <button onClick={onDiscard} className="rounded bg-gray-200 px-4 py-2">
          Discard
        </button>
      </div>
    </div>
  );
}
