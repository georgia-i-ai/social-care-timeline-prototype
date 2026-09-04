"use client";

import { useState } from "react";

export function ScanPanel({
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
        Capture or upload a photo of a note (handwritten or printed).
      </p>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={!file || submitting}
        onClick={() => file && onSubmit(file)}
        className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Process image"}
      </button>
    </div>
  );
}
