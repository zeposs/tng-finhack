/**
 * Convert any browser-recorded audio Blob into a 16 kHz mono PCM-16 WAV Blob,
 * which is the canonical input shape for DashScope ASR (fun-asr-realtime,
 * paraformer-realtime-v2, etc.).
 *
 * Pipeline:
 *   Blob -> arrayBuffer -> AudioContext.decodeAudioData -> AudioBuffer
 *        -> OfflineAudioContext (downmix + resample) -> Float32 mono
 *        -> Int16 PCM -> RIFF/WAV header -> Blob
 */

const TARGET_SAMPLE_RATE = 16000;

function audioBufferToMonoFloat32(buffer) {
  const channels = buffer.numberOfChannels;
  if (channels === 1) return buffer.getChannelData(0);
  const len = buffer.length;
  const mono = new Float32Array(len);
  for (let ch = 0; ch < channels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i += 1) mono[i] += data[i];
  }
  for (let i = 0; i < len; i += 1) mono[i] /= channels;
  return mono;
}

function float32ToInt16(input) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    let s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // format = PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);          // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function blobToWav16k(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('AudioContext not supported');

  const arrayBuf = await blob.arrayBuffer();
  // A short-lived AudioContext just for decoding; allowed to be at any rate.
  const decodeCtx = new Ctx();
  let decoded;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    try { await decodeCtx.close(); } catch (_) { /* ignore */ }
  }

  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Offline) {
    // Fallback: encode original sample rate
    const mono = audioBufferToMonoFloat32(decoded);
    const pcm = float32ToInt16(mono);
    return { wav: encodeWav(pcm, decoded.sampleRate), sampleRate: decoded.sampleRate };
  }

  const targetLength = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offline = new Offline(1, targetLength, TARGET_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();

  const mono = audioBufferToMonoFloat32(rendered);
  const pcm = float32ToInt16(mono);
  return { wav: encodeWav(pcm, TARGET_SAMPLE_RATE), sampleRate: TARGET_SAMPLE_RATE };
}
