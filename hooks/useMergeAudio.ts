"use client";

import { useCallback, useRef, useState } from "react";

const AUDIO_ENABLED_KEY = "merge-arena-audio-enabled";

export function useMergeAudio() {
  const [enabled, setEnabled] = useState(false);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  const enable = useCallback(() => {
    try {
      window.localStorage.setItem(AUDIO_ENABLED_KEY, "1");
    } catch {
      // Persisting the preference is best-effort; playback can still be enabled.
    }
    setEnabled(true);
  }, []);

  const disable = useCallback(() => {
    try {
      window.localStorage.setItem(AUDIO_ENABLED_KEY, "0");
    } catch {
      // Persisting the preference is best-effort.
    }
    audioElement.current?.pause();
    setEnabled(false);
  }, []);

  const play = useCallback(
    (soundFile?: string) => {
      const audio = audioElement.current;
      if (!enabled || !soundFile || !audio) return;

      audio.src = soundFile;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // A browser may still block playback if its audio policy changes after enabling.
      });
    },
    [enabled],
  );

  return {
    audioEnabled: enabled,
    audioElement,
    enableAudio: enable,
    disableAudio: disable,
    playMergeSound: play,
  };
}
