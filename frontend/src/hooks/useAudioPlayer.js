import { useCallback, useRef } from 'react';

/** Play a base64 audio blob returned by /api/tts. */
export function useAudioPlayer() {
  const audioRef = useRef(null);
  const pendingRef = useRef(null);
  const unlockBoundRef = useRef(false);

  const bindUnlockHandler = useCallback((replay) => {
    if (unlockBoundRef.current) return;
    unlockBoundRef.current = true;

    const handler = () => {
      if (pendingRef.current) replay(pendingRef.current.b64, pendingRef.current.mime, true);
      window.removeEventListener('pointerdown', handler, true);
      window.removeEventListener('touchstart', handler, true);
      window.removeEventListener('keydown', handler, true);
      unlockBoundRef.current = false;
    };

    window.addEventListener('pointerdown', handler, true);
    window.addEventListener('touchstart', handler, true);
    window.addEventListener('keydown', handler, true);
  }, []);

  const play = useCallback((b64, mime = 'audio/mpeg', fromUnlock = false) => {
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
        promise.catch((err) => {
          console.warn('TTS playback blocked:', err);
          if (!fromUnlock) {
            // Mobile browsers may block async playback. Save audio and replay
            // on the next user gesture (tap / hold / key press).
            pendingRef.current = { b64, mime };
            bindUnlockHandler(play);
          }
        });
      }
      if (fromUnlock) pendingRef.current = null;
    } catch (err) {
      console.warn('Failed to play audio:', err);
    }
  }, [bindUnlockHandler]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (_) { /* ignore */ }
      audioRef.current = null;
    }
  }, []);

  return { play, stop };
}
