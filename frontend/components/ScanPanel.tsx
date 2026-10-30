"use client";

import { useState } from "react";
import { Button, FileUpload } from "@i-dot-ai-npm/component-library-react";

export function ScanPanel({
  onSubmit,
  submitting,
}: {
  onSubmit: (file: File) => void;
  submitting: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <p className="govuk-body">Capture or upload a photo of a note (handwritten or printed).</p>
      <FileUpload
        accept="image/*"
        capture="environment"
        aria-label="Photo of a note"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="govuk-!-margin-top-4">
        <Button type="button" disabled={!file || submitting} onClick={() => file && onSubmit(file)}>
          {submitting ? "Processing..." : "Process image"}
        </Button>
      </div>
    </div>
  );
}
