import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export async function getBalance() {
  const res = await api.get('/balance');
  return res.data;
}

export async function makePayment(amount, merchant) {
  const res = await api.post('/payment', { amount, merchant });
  return res.data;
}

export async function topUp(amount) {
  const res = await api.post('/topup', { amount });
  return res.data;
}

export async function getPromotions() {
  const res = await api.get('/promotions');
  return res.data;
}

export async function sendVoice(audioBlob, language = 'en') {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('language', language);
  const res = await api.post('/voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function sendTextCommand(text) {
  const res = await api.post('/agent', { text });
  return res.data;
}

export async function getTTS(text, language = 'en') {
  const res = await api.post('/tts', { text, language }, {
    responseType: 'blob',
  });
  return res.data;
}
