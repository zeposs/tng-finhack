import { useState, useRef, useEffect, useCallback } from 'react';

export default function VoiceRecorder({ onRecordingComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState('Connecting to microphone...');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const level = Math.min(1, rms * 4);
    setAudioLevel(level);

    animFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for real-time level
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      animFrameRef.current = requestAnimationFrame(updateAudioLevel);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
        setStatus('Processing your voice...');
        onRecordingComplete(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Listening... Speak now!');

      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } catch {
      onCancel('microphone_denied');
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Visualizer bar count
  const BAR_COUNT = 20;
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const center = BAR_COUNT / 2;
    const dist = Math.abs(i - center) / center;
    const height = Math.max(4, audioLevel * (1 - dist * 0.6) * 80);
    return height;
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-8 animate-float-up">
      <p className="text-3xl font-bold text-tng-blue mb-2">
        {isRecording ? 'Listening...' : 'Processing...'}
      </p>
      <p className="text-gray-500 mb-6 text-xl">{status}</p>

      {/* Audio level waveform visualizer */}
      <div className="flex items-center justify-center gap-1 h-20 mb-6 w-full max-w-md">
        {bars.map((h, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: '6px',
              height: `${h}px`,
              backgroundColor: audioLevel > 0.05
                ? `rgba(239, 68, 68, ${0.5 + audioLevel * 0.5})`
                : '#d1d5db',
            }}
          />
        ))}
      </div>

      {/* Audio level indicator text */}
      <div className="mb-6 text-center">
        {isRecording && (
          <p className={`text-base font-medium ${audioLevel > 0.05 ? 'text-red-500' : 'text-gray-400'}`}>
            {audioLevel > 0.3 ? 'Loud and clear!' :
             audioLevel > 0.05 ? 'Hearing you...' :
             'Waiting for voice...'}
          </p>
        )}
      </div>

      {/* Pulsing mic button */}
      <div className="relative mb-8">
        {isRecording && (
          <>
            <div
              className="absolute rounded-full bg-red-400/30 animate-pulse-ring"
              style={{
                inset: `-${audioLevel * 20}px`,
              }}
            />
            <div
              className="absolute rounded-full bg-red-400/20 animate-pulse-ring"
              style={{
                inset: `-${audioLevel * 30}px`,
                animationDelay: '0.4s',
              }}
            />
          </>
        )}
        <button
          onClick={stopRecording}
          className="relative w-36 h-36 rounded-full bg-red-500 flex items-center justify-center text-white text-6xl shadow-xl transition-transform active:scale-90 z-10 cursor-pointer"
          style={{
            transform: `scale(${1 + audioLevel * 0.1})`,
          }}
        >
          🎙️
        </button>
      </div>

      <p className="text-4xl font-mono text-gray-700 mb-8">{formatTime(seconds)}</p>

      <button
        onClick={stopRecording}
        className="bg-tng-blue text-white px-12 py-4 rounded-full text-xl font-semibold shadow-md active:scale-95 transition-transform cursor-pointer"
      >
        Done Speaking
      </button>

      <button
        onClick={() => {
          stopTimer();
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            streamRef.current?.getTracks().forEach(t => t.stop());
          }
          onCancel('cancelled');
        }}
        className="mt-5 text-gray-400 text-lg underline cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
