"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUDIO_ENABLED_KEY = "merge-arena-audio-enabled";

export function useMergeAudio() {
  const [enabled, setEnabled] = useState(false);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = useCallback(() => {
    const audio = audioElement.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

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
    stopPlayback();
    setEnabled(false);
  }, [stopPlayback]);

  const play = useCallback(
    (soundFile?: string) => {
      const audio = audioElement.current;
      if (!enabled || !soundFile || !audio) return;

      stopPlayback();
      audio.src = soundFile;
      audio.loop = false;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // A browser may still block playback if its audio policy changes after enabling.
      });
    },
    [enabled, stopPlayback],
  );

  return {
    audioEnabled: enabled,
    audioElement,
    enableAudio: enable,
    disableAudio: disable,
    playMergeSound: play,
  };
}
