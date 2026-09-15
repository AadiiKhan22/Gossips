"use client";

import * as React from "react";

export type RecorderStatus = "idle" | "recording" | "error";

export interface RecordedVoiceMessage {
  file: File;
  durationSeconds: number;
}

function pickSupportedMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: "audio/mp4", extension: "m4a" },
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
    { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  ];

  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  // Let the browser choose; used for the File's type/name only as a fallback.
  return { mimeType: "", extension: "webm" };
}

export function useVoiceRecorder() {
  const [status, setStatus] = React.useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const startedAtRef = React.useRef<number>(0);
  const intervalRef = React.useRef<number | null>(null);
  const formatRef = React.useRef<{ mimeType: string; extension: string }>({
    mimeType: "",
    extension: "webm",
  });

  const cleanup = React.useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const start = React.useCallback(async () => {
    setError(null);

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice recording isn't supported in this browser.");
      setStatus("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const format = pickSupportedMimeType();
      formatRef.current = format;

      const recorder = format.mimeType
        ? new MediaRecorder(stream, { mimeType: format.mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setStatus("recording");

      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      setError("Microphone access was denied.");
      setStatus("error");
      cleanup();
    }
  }, [cleanup]);

  const stop = React.useCallback((): Promise<RecordedVoiceMessage | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }

      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));

      recorder.onstop = () => {
        const format = formatRef.current;
        const mimeType = recorder.mimeType || format.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        setStatus("idle");

        if (blob.size === 0) {
          resolve(null);
          return;
        }

        const file = new File([blob], `voice-message-${Date.now()}.${format.extension}`, {
          type: mimeType,
        });
        resolve({ file, durationSeconds });
      };

      recorder.stop();
    });
  }, [cleanup]);

  const cancel = React.useCallback(() => {
    mediaRecorderRef.current?.stop();
    cleanup();
    setStatus("idle");
    setElapsedSeconds(0);
  }, [cleanup]);

  React.useEffect(() => cleanup, [cleanup]);

  return { status, elapsedSeconds, error, start, stop, cancel };
}
