"use client";

import { useRef, useState } from "react";
import { Button, ButtonGroup } from "@i-dot-ai-npm/component-library-react";
import { FileField } from "@/components/FileField";

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
    <div>
      <p className="govuk-body">Record a short conversation, or upload an audio file.</p>
      {error && <p className="govuk-error-message">{error}</p>}

      <ButtonGroup>
        {!recording ? (
          <Button type="button" secondary onClick={startRecording}>
            ● Start recording
          </Button>
        ) : (
          <Button type="button" warning onClick={stopRecording}>
            ■ Stop
          </Button>
        )}
      </ButtonGroup>

      <FileField
        label="Or upload an audio file"
        accept="audio/*"
        onFile={(f) => f && setBlob(f)}
      />

      {blob && <audio controls src={URL.createObjectURL(blob)} />}

      <div className="govuk-!-margin-top-4">
        <Button type="button" disabled={!blob || submitting} onClick={() => blob && onSubmit(blob)}>
          {submitting ? "Processing..." : "Process recording"}
        </Button>
      </div>
    </div>
  );
}
