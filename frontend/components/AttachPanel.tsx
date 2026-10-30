"use client";

import { useState } from "react";
import { Button, FileUpload } from "@i-dot-ai-npm/component-library-react";

export function AttachPanel({
  onSubmit,
  submitting,
}: {
  onSubmit: (file: File) => void;
  submitting: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <p className="govuk-body">Attach a text note (.txt/.md) or an image file (.jpg/.png).</p>
      <FileUpload
        accept=".txt,.md,.jpg,.jpeg,.png"
        aria-label="Note to attach"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="govuk-!-margin-top-4">
        <Button type="button" disabled={!file || submitting} onClick={() => file && onSubmit(file)}>
          {submitting ? "Processing..." : "Process file"}
        </Button>
      </div>
    </div>
  );
}
