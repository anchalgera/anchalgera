import { useCallback, useEffect, useRef, useState } from "react";

export type AudioRecorderOptions = {
  onChunk: (blob: Blob, sequence: number) => Promise<void> | void;
  mimeType?: string;
  timeslice?: number;
};

export type AudioRecorder = {
  start: () => Promise<void>;
  stop: () => void;
  isRecording: boolean;
  error?: string;
};

export function useAudioRecorder({ onChunk, mimeType = "audio/webm", timeslice = 5000 }: AudioRecorderOptions): AudioRecorder {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const chunkSequenceRef = useRef(0);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.addEventListener("dataavailable", async (event) => {
        if (event.data.size > 0) {
          try {
            chunkSequenceRef.current += 1;
            await onChunk(event.data, chunkSequenceRef.current);
          } catch (err) {
            console.error("Failed to upload audio chunk", err);
          }
        }
      });

      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      });

      recorder.start(timeslice);
      mediaRecorderRef.current = recorder;
      chunkSequenceRef.current = 0;
      setIsRecording(true);
      setError(undefined);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to start audio recorder");
    }
  }, [mimeType, onChunk, timeslice]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { start, stop, isRecording, error };
}
