"use client";

import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Input,
  InsetText,
  Textarea,
} from "@i-dot-ai-npm/component-library-react";
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
    <InsetText>
      <h2 className="govuk-heading-m">Review before saving to the case</h2>
      <Textarea readOnly value={pending.raw_text} rows={8} aria-label="Extracted text" />

      {confident ? (
        <p className="govuk-body govuk-!-margin-top-4">
          Document date inferred: {inferred} (high confidence)
        </p>
      ) : (
        <div className="govuk-!-margin-top-4">
          <p className="govuk-error-message">
            Couldn&apos;t confidently determine a date for this document from its content -
            please confirm one before it can be saved.
          </p>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Document date" />
        </div>
      )}

      <ButtonGroup class="govuk-!-margin-top-4">
        <Button
          type="button"
          disabled={saving || !date}
          onClick={() => onConfirm(date, confident ? "high" : "user_provided")}
        >
          {saving ? "Saving..." : "Save to case"}
        </Button>
        <Button type="button" secondary onClick={onDiscard}>
          Discard
        </Button>
      </ButtonGroup>
    </InsetText>
  );
}
