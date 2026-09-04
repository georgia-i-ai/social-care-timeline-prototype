"use client";

import { useRef, useState } from "react";

export function RecordPanel({
  onSubmit,
  submitting,
}: {
  onSubmit: (blob: Blob) => void;
  submitting: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        setBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setError("Couldn't access the microphone: " + (err as Error).message);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Record a short conversation, or upload an audio file.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 items-center">
        {!recording ? (
          <button onClick={startRecording} className="rounded bg-gray-200 px-4 py-2">
            ● Start recording
          </button>
        ) : (
          <button onClick={stopRecording} className="rounded bg-red-600 text-white px-4 py-2">
            ■ Stop
          </button>
        )}
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setBlob(f);
          }}
        />
      </div>

      {blob && <audio controls src={URL.createObjectURL(blob)} />}

      <button
        disabled={!blob || submitting}
        onClick={() => blob && onSubmit(blob)}
        className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Process recording"}
      </button>
    </div>
  );
}
