import { useCallback, useRef } from 'react';

/** Play a base64 audio blob returned by /api/tts. */
export function useAudioPlayer() {
  const audioRef = useRef(null);

  const play = useCallback((b64, mime = 'audio/mpeg') => {
    if (!b64) return;
    try {
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);
      audioRef.current = audio;
      const promise = audio.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err) => console.warn('TTS playback blocked:', err));
      }
    } catch (err) {
      console.warn('Failed to play audio:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (_) { /* ignore */ }
      audioRef.current = null;
    }
  }, []);

  return { play, stop };
}
