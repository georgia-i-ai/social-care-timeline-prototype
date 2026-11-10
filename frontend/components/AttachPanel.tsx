"use client";

import { useState } from "react";
import { Button } from "@i-dot-ai-npm/component-library-react";
import { FileField } from "@/components/FileField";

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
      <p className="govuk-body">Attach a text note (.txt/.md), an image (.jpg/.png) or an audio recording (.wav/.mp3/.m4a/.ogg/.flac).</p>
      <FileField label="Choose a file to attach" accept=".txt,.md,.jpg,.jpeg,.png,.wav,.mp3,.m4a,.ogg,.flac" onFile={setFile} />
      <div className="govuk-!-margin-top-4">
        <Button type="button" disabled={!file || submitting} onClick={() => file && onSubmit(file)}>
          {submitting ? "Processing..." : "Process file"}
        </Button>
      </div>
    </div>
  );
}
