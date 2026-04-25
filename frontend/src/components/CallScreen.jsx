import React, { useEffect, useState } from 'react';
import { t } from '../state/strings.js';

export default function CallScreen({ lang, kind, onBack }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const isHelper = kind === 'helper';
  const title = isHelper ? t(lang, 'callingTng') : t(lang, 'callFamily');
  const subtitle = isHelper ? t(lang, 'tngNumber') : t(lang, 'yourSon');
  const icon = isHelper ? '📞' : '👨‍👩‍👧';

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="phone-frame flex flex-col items-center justify-between bg-gradient-to-b from-tng-blue-dark to-slate-900 p-6 text-white">
      <div className="w-full text-center">
        <div className="text-sm uppercase tracking-widest opacity-60">{title}</div>
        <div className="mt-2 text-3xl font-extrabold">{subtitle}</div>
        <div className="mt-1 text-base opacity-70">{mm}:{ss}</div>
      </div>

      <div className="relative flex h-44 w-44 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse-ring" />
        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-emerald-500 text-6xl shadow-soft">
          {icon}
        </div>
      </div>

      <button
        onClick={onBack}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-3xl text-white shadow-soft active:scale-95"
        aria-label="End call"
      >
        ✕
      </button>
    </div>
  );
}
