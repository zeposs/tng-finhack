import axios from 'axios';
import { blobToWav16k } from '../hooks/audioConvert.js';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
});

export async function fetchBalance() {
  const { data } = await api.get('/balance');
  return data;
}

export async function fetchPromotions() {
  const { data } = await api.get('/promotions');
  return data.promotions || [];
}

export async function fetchHealth() {
  const { data } = await api.get('/health');
  return data;
}

export async function sendVoice(audioBlob, language = 'en') {
  // Convert MediaRecorder output (typically webm/opus @ 48 kHz) into the
  // 16 kHz mono WAV that DashScope ASR expects. Falls back to the raw blob
  // if AudioContext decoding fails for any reason.
  let uploadBlob = audioBlob;
  let ext = 'wav';
  let sampleRate = 16000;
  try {
    const { wav, sampleRate: sr } = await blobToWav16k(audioBlob);
    uploadBlob = wav;
    sampleRate = sr;
  } catch (err) {
    console.warn('Audio resample failed; sending raw blob.', err);
    if (audioBlob.type.includes('wav')) ext = 'wav';
    else if (audioBlob.type.includes('mp3') || audioBlob.type.includes('mpeg')) ext = 'mp3';
    else if (audioBlob.type.includes('ogg')) ext = 'ogg';
    else ext = 'webm';
  }

  const form = new FormData();
  form.append('audio', uploadBlob, `voice.${ext}`);
  form.append('language', language);
  form.append('sample_rate', String(sampleRate));
  const { data } = await api.post('/voice', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function sendText(text, language = 'en') {
  const { data } = await api.post('/agent', { text, language });
  return data;
}

export async function commitPayment(amount, merchant) {
  const { data } = await api.post('/payment', { amount, merchant });
  return data;
}

export async function commitTopup(amount) {
  const { data } = await api.post('/topup', { amount });
  return data;
}

export async function speak(text, language = 'en') {
  const { data } = await api.post('/tts', { text, language });
  return data;
}
