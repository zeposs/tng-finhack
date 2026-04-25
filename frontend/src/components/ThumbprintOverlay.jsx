import React, { useState } from 'react';
import { t } from '../state/strings.js';

export default function ThumbprintOverlay({ lang, onVerified, onCancel }) {
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);

  const handlePress = () => {
    if (verifying || done) return;
    setVerifying(true);
    setTimeout(() => {
      setDone(true);
      setTimeout(onVerified, 700);
    }, 900);
  };

  return (
    <div className="phone-frame flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-white">
      <div className="w-full text-center">
        <div className="text-sm uppercase tracking-widest opacity-60">Security</div>
        <h1 className="mt-2 text-3xl font-extrabold">{t(lang, 'verifyTitle')}</h1>
        <p className="mt-2 text-base opacity-80">{t(lang, 'verifyHint')}</p>
      </div>

      <button
        onClick={handlePress}
        className="relative flex h-56 w-56 items-center justify-center rounded-full bg-white/5 active:scale-95"
        aria-label={t(lang, 'verifyTitle')}
      >
        {!done && (
          <span
            className={`absolute inset-0 rounded-full bg-tng-yellow/30 ${
              verifying ? 'animate-pulse-ring' : ''
            }`}
          />
        )}
        <div
          className={`flex h-44 w-44 items-center justify-center rounded-full text-7xl transition-all ${
            done
              ? 'bg-emerald-500 text-white scale-110'
              : verifying
              ? 'bg-tng-yellow text-tng-blue-dark'
              : 'bg-white/10 text-white/70'
          }`}
        >
          {done ? '✓' : '👆'}
        </div>
      </button>

      <div className="text-center">
        <div className={`text-2xl font-extrabold ${done ? 'text-emerald-400' : ''}`}>
          {done ? t(lang, 'verified') : verifying ? '…' : ' '}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 rounded-full border-2 border-white/20 px-6 py-2 text-sm font-semibold opacity-80 active:opacity-50"
        >
          {t(lang, 'confirmCancel')}
        </button>
      </div>
    </div>
  );
}
