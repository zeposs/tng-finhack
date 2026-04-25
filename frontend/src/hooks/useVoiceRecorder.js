import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Encapsulates MediaRecorder lifecycle. Returns:
 *   { recording, supported, error, start, stop }
 * stop() resolves with a Blob.
 */
export function useVoiceRecorder() {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const resolveRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);

  const supported = typeof window !== 'undefined'
    && typeof window.MediaRecorder !== 'undefined'
    && !!navigator?.mediaDevices?.getUserMedia;

  // getUserMedia REQUIRES a secure context. localhost / 127.0.0.1 / *.localhost
  // count as secure even over plain http; LAN IPs (e.g. 192.168.x.x) do not,
  // and the API silently disappears or throws NotAllowedError.
  const isSecureContext = typeof window !== 'undefined'
    && (window.isSecureContext === true
        || ['localhost', '127.0.0.1', '::1'].includes(window.location?.hostname));

  const cleanup = useCallback(() => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (_) { /* ignore */ }
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError('not-supported');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      let mimeType = '';
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
      for (const m of candidates) {
        if (window.MediaRecorder.isTypeSupported(m)) { mimeType = m; break; }
      }
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (resolveRef.current) {
          resolveRef.current(blob);
          resolveRef.current = null;
        }
        cleanup();
      };

      recorder.start();
      setRecording(true);
      return true;
    } catch (err) {
      console.warn('Mic access failed:', err);
      let code = 'failed';
      switch (err?.name) {
        case 'NotAllowedError':
        case 'SecurityError':
          code = 'denied';
          break;
        case 'NotFoundError':
        case 'OverconstrainedError':
          code = 'no-device';
          break;
        case 'NotReadableError':
          code = 'busy';
          break;
        default:
          code = 'failed';
      }
      setError(code);
      cleanup();
      return false;
    }
  }, [cleanup, supported]);

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      try { recorder.stop(); } catch (_) { resolve(null); }
      setRecording(false);
    });
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  return { recording, supported, isSecureContext, error, start, stop };
}
