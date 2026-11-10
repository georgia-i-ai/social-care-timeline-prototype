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
  onConfirm: (
    documentDate: string,
    dateConfidence: "high" | "low" | "user_provided",
    rawText: string
  ) => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const inferred = pending.document_date;
  const confident = Boolean(inferred) && pending.date_confidence === "high";
  const [date, setDate] = useState(inferred ?? new Date().toISOString().slice(0, 10));
  // Only machine transcriptions (scans, images, audio) are editable; a text file
  // already says what its author wrote.
  const editable = pending.media_ext !== null && pending.media_ext !== ".txt";
  const [text, setText] = useState(pending.raw_text);

  return (
    <InsetText>
      <h2 className="govuk-heading-m">Review before saving to the case</h2>
      {editable && (
        <p className="govuk-hint">
          Correct any transcription mistakes before saving. If you change the text, the
          events are extracted again from your corrected version when you save.
        </p>
      )}
      <Textarea
        readOnly={!editable}
        value={pending.raw_text}
        onChange={(e) => setText(e.target.value)}
        rows={editable ? 12 : 8}
        aria-label={editable ? "Transcribed text (editable)" : "Extracted text"}
      />

      <div className="govuk-!-margin-top-4">
        {confident ? (
          <p className="govuk-body govuk-!-margin-bottom-2">
            Document date inferred from the content (high confidence). Change it if it&apos;s
            wrong.
          </p>
        ) : (
          <p className="govuk-error-message">
            Couldn&apos;t confidently determine a date for this document from its content -
            please confirm one before it can be saved.
          </p>
        )}
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Document date" />
      </div>

      <ButtonGroup class="govuk-!-margin-top-4">
        <Button
          type="button"
          disabled={saving || !date || !text.trim()}
          onClick={() => onConfirm(date, confident && date === inferred ? "high" : "user_provided", text)}
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
