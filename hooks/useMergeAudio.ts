"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUDIO_ENABLED_KEY = "merge-arena-audio-enabled";

export function useMergeAudio() {
  const [enabled, setEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const audioElements = useRef(new Map<string, HTMLAudioElement>());

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    updateFullscreenState();
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

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

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // The browser may reject an exit request while it is already closing full-screen mode.
    }
  }, []);

  const playFallbackTone = useCallback(() => {
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

  const play = useCallback(
    (soundFile?: string) => {
      if (!enabled) return;

      if (!soundFile) {
        playFallbackTone();
        return;
      }

      try {
        let audio = audioElements.current.get(soundFile);
        if (!audio) {
          audio = new Audio(soundFile);
          audio.preload = "auto";
          audioElements.current.set(soundFile, audio);
        }
        audio.currentTime = 0;
        void audio.play().catch(() => playFallbackTone());
      } catch {
        playFallbackTone();
      }
    },
    [enabled, playFallbackTone],
  );

  return {
    audioEnabled: enabled,
    isFullscreen,
    enableAudio: enable,
    disableAudio: disable,
    exitFullscreen,
    playMergeSound: play,
  };
}
