"use client";

import { useState } from "react";

export function AttachPanel({
  onSubmit,
  submitting,
}: {
  onSubmit: (file: File) => void;
  submitting: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Attach a text note (.txt/.md) or an image file (.jpg/.png).
      </p>
      <input
        type="file"
        accept=".txt,.md,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={!file || submitting}
        onClick={() => file && onSubmit(file)}
        className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Process file"}
      </button>
    </div>
  );
}
