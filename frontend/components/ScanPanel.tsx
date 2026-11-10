"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ButtonGroup } from "@i-dot-ai-npm/component-library-react";
import { FileField } from "@/components/FileField";

/**
 * Photo of a note, from the camera or an upload.
 *
 * Desktop browsers ignore the file input's `capture` hint (it only opens the camera
 * on phones), so the camera is driven directly via getUserMedia instead.
 */
export function ScanPanel({
  onSubmit,
  submitting,
}: {
  onSubmit: (file: File) => void;
  submitting: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Release the camera if the panel closes while it's on.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      setError("Couldn't access the camera: " + (err as Error).message);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        choose(new File([blob], "camera-photo.jpg", { type: "image/jpeg" }));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div>
      <p className="govuk-body">
        Take a photo of a note (handwritten or printed) with your camera, or upload one.
      </p>
      {error && <p className="govuk-error-message">{error}</p>}

      <ButtonGroup>
        {!cameraOn ? (
          <Button type="button" secondary onClick={startCamera}>
            📷 Use camera
          </Button>
        ) : (
          <>
            <Button type="button" onClick={takePhoto}>
              Take photo
            </Button>
            <Button type="button" secondary onClick={stopCamera}>
              Cancel
            </Button>
          </>
        )}
      </ButtonGroup>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        hidden={!cameraOn}
        aria-label="Camera preview"
        style={{ maxWidth: "100%", borderRadius: 4 }}
      />

      {!cameraOn && (
        <FileField
          label="Or upload a photo"
          accept="image/*"
          capture="environment"
          onFile={choose}
        />
      )}

      {preview && !cameraOn && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Photo to process"
          className="govuk-!-margin-top-4"
          style={{ display: "block", maxWidth: "100%", maxHeight: 320, borderRadius: 4 }}
        />
      )}

      <div className="govuk-!-margin-top-4">
        <Button type="button" disabled={!file || submitting} onClick={() => file && onSubmit(file)}>
          {submitting ? "Processing..." : "Process image"}
        </Button>
      </div>
    </div>
  );
}
