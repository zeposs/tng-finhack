import React, { useEffect, useState } from 'react';
import { t } from '../state/strings.js';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';

function MicErrorPanel({ lang, error, isSecureContext, onRetry }) {
  if (!error) return null;

  let titleKey = 'micFailed';
  let hintKey = null;

  if (error === 'insecure' || (!isSecureContext && error === 'denied')) {
    titleKey = 'micInsecure';
    hintKey = 'micInsecureHint';
  } else if (error === 'denied') {
    titleKey = 'micDenied';
    hintKey = 'micDeniedHint';
  } else if (error === 'no-device') {
    titleKey = 'micNoDevice';
  } else if (error === 'busy') {
    titleKey = 'micBusy';
  } else if (error === 'not-supported') {
    titleKey = 'micFailed';
  }

  const showInsecureHostHint =
    error === 'insecure' &&
    typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">⚠️</span>
        <div className="flex-1">
          <div className="text-base font-bold text-amber-900">{t(lang, titleKey)}</div>
          {hintKey && (
            <div className="mt-1 text-sm text-amber-800">{t(lang, hintKey)}</div>
          )}
          {showInsecureHostHint && (
            <div className="mt-2 break-all rounded-lg bg-white px-2 py-1 font-mono text-xs text-slate-600">
              You are on: {window.location.origin}
            </div>
          )}
          <button
            onClick={onRetry}
            className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white active:scale-95"
          >
            {t(lang, 'micRetry')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VoiceRecorder({ lang, onAudioCaptured, onTextSubmit, onCancel }) {
  const { recording, supported, isSecureContext, error, start, stop } = useVoiceRecorder();
  const [text, setText] = useState('');
  const [autoStarted, setAutoStarted] = useState(false);

  useEffect(() => {
    if (!autoStarted && supported && isSecureContext) {
      setAutoStarted(true);
      start();
    }
  }, [autoStarted, supported, isSecureContext, start]);

  const handleStop = async () => {
    const blob = await stop();
    if (blob) onAudioCaptured(blob);
  };

  const handleMicTap = () => {
    if (recording) handleStop();
    else start();
  };

  const showMicError = !!error || !supported || !isSecureContext;
  const statusLine = recording
    ? t(lang, 'listening')
    : showMicError
      ? t(lang, 'tapToTalk')
      : t(lang, 'tapToTalk');

  return (
    <div className="phone-frame flex flex-col bg-white">
      <div className="bg-tng-blue rounded-b-[28px] px-4 pt-5 pb-6 text-white sm:rounded-b-[36px] sm:px-5 sm:pt-6 sm:pb-8">
        <button onClick={onCancel} className="text-sm font-semibold opacity-80 active:opacity-50">
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t(lang, 'voice')}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
        <div className="rounded-2xl bg-slate-50 p-3.5 sm:p-4">
          <div className="text-sm font-semibold text-slate-500">{t(lang, 'examples')}</div>
          <ul className="mt-1 space-y-1 text-sm font-medium text-slate-700 sm:text-base">
            <li>• "{t(lang, 'example1')}"</li>
            <li>• "{t(lang, 'example2')}"</li>
            <li>• "{t(lang, 'example3')}"</li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-400">
            {t(lang, 'typedFallback')}
          </div>
          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) onTextSubmit(text.trim());
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t(lang, 'example1')}
              className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2.5 text-base focus:border-tng-blue focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-tng-blue px-4 py-2.5 text-sm font-bold text-white active:scale-95 sm:text-base"
            >
              {t(lang, 'send')}
            </button>
          </form>
        </div>

        {showMicError && (
          <MicErrorPanel
            lang={lang}
            error={error || (!isSecureContext ? 'insecure' : 'not-supported')}
            isSecureContext={isSecureContext}
            onRetry={start}
          />
        )}
      </div>

      <div className="border-t border-slate-100 bg-white px-4 pb-5 pt-4 sm:px-6 sm:pb-7 sm:pt-5">
        <div className="mb-3 text-center">
          <div className="text-lg font-extrabold text-slate-800 sm:text-xl">{statusLine}</div>
          {recording && (
            <div className="mt-1 text-xs text-slate-500 sm:text-sm">{t(lang, 'tapToStop')}</div>
          )}
        </div>

        <div className="flex justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
            {recording && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-400/40 animate-pulse-ring" />
                <span
                  className="absolute inset-0 rounded-full bg-red-400/30 animate-pulse-ring"
                  style={{ animationDelay: '0.5s' }}
                />
              </>
            )}
            <button
              onClick={handleMicTap}
              disabled={!supported || !isSecureContext}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-soft transition active:scale-95 sm:h-24 sm:w-24 sm:text-4xl ${
                recording
                  ? 'bg-red-500'
                  : showMicError
                    ? 'bg-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-tng-blue'
              }`}
              aria-label={recording ? t(lang, 'tapToStop') : t(lang, 'tapToTalk')}
            >
              🎙️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
