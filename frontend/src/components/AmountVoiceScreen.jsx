import React from 'react';
import { t } from '../state/strings.js';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';

export default function AmountVoiceScreen({
  lang,
  merchant,
  onBack,
  onVoiceCaptured,
  busy,
  errorText,
}) {
  const { recording, supported, isSecureContext, error, start, stop } = useVoiceRecorder();

  const startHold = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    await start();
  };

  const endHold = async (e) => {
    e?.preventDefault?.();
    if (!recording) return;
    const blob = await stop();
    if (blob) onVoiceCaptured(blob);
  };

  const blocked = !supported || !isSecureContext || !!error;

  return (
    <div className="phone-frame flex flex-col bg-white text-slate-900">
      <div className="bg-tng-blue px-4 pt-5 pb-4 text-white sm:px-5 sm:pt-6 sm:pb-5">
        <button onClick={onBack} className="text-sm font-semibold opacity-85 active:opacity-60">
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t(lang, 'amountVoiceTitle')}</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Merchant</div>
        <div className="mt-1 text-2xl font-extrabold text-slate-800 sm:text-3xl">{merchant || 'QR Merchant'}</div>
        <div className="mt-3 text-base font-bold text-tng-blue sm:text-lg">
          {t(lang, 'amountVoiceEnglishOnly')}
        </div>
        <div className="mt-2 text-base font-medium text-slate-600 sm:text-lg">
          {t(lang, 'amountVoiceHint')}
        </div>

        <button
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          disabled={busy || blocked}
          className={`mt-8 flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white shadow-soft transition active:scale-95 sm:h-32 sm:w-32 sm:text-6xl ${
            recording ? 'bg-red-500' : 'bg-violet-600'
          } ${busy || blocked ? 'cursor-not-allowed opacity-60' : ''}`}
          aria-label="Hold to say amount"
        >
          {recording ? '🔴' : '🎙️'}
        </button>

        <div className="mt-4 text-lg font-bold text-slate-700">
          {busy ? t(lang, 'amountVoiceProcessing') : recording ? t(lang, 'amountVoiceRelease') : t(lang, 'amountVoiceHold')}
        </div>

        {!!errorText && (
          <div className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
            {errorText}
          </div>
        )}
      </div>
    </div>
  );
}
