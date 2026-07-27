"use client";

import { useCallback, useRef, useState } from "react";

const AUDIO_ENABLED_KEY = "merge-arena-audio-enabled";

export function useMergeAudio() {
  const [enabled, setEnabled] = useState(false);
  const context = useRef<AudioContext | null>(null);

  const enable = useCallback(async () => {
    try {
      context.current ??= new AudioContext();
      await context.current.resume();
      window.localStorage.setItem(AUDIO_ENABLED_KEY, "1");
      setEnabled(true);
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Full-screen and audio permissions are optional; celebrations still animate.
      setEnabled(true);
    }
  }, []);

  const disable = useCallback(() => {
    try {
      window.localStorage.setItem(AUDIO_ENABLED_KEY, "0");
    } catch {
      // Persisting the preference is best-effort.
    }
    setEnabled(false);
  }, []);

  const play = useCallback(() => {
    const audio = context.current;
    if (!enabled || !audio || audio.state !== "running") return;

    try {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(523.25, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(783.99, audio.currentTime + 0.22);
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.42);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.43);
    } catch {
      // Web Audio may be unavailable on kiosk hardware; the visual celebration continues.
    }
  }, [enabled]);

  return { audioEnabled: enabled, enableAudio: enable, disableAudio: disable, playMergeSound: play };
}
