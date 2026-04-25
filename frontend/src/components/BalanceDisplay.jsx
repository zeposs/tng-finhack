import React from 'react';
import { t } from '../state/strings.js';

export default function BalanceDisplay({ lang, balance, onBack }) {
  return (
    <div className="phone-frame flex flex-col bg-white">
      <div className="bg-tng-blue px-5 pt-6 pb-10 text-white rounded-b-[36px]">
        <button onClick={onBack} className="text-sm font-semibold opacity-80 active:opacity-50">
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-3xl font-extrabold">{t(lang, 'myBalance')}</h1>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        <div className="qm-card w-full text-center">
          <div className="text-base font-semibold text-slate-500">{t(lang, 'myBalance')}</div>
          <div className="mt-3 text-6xl font-extrabold text-tng-blue">
            RM {Number(balance ?? 0).toFixed(2)}
          </div>
          <div className="mt-3 text-sm text-slate-400">
            {t(lang, 'lastUpdated')}: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="px-5 pb-6">
        <button
          onClick={onBack}
          className="w-full rounded-2xl bg-tng-blue py-4 text-xl font-extrabold text-white active:scale-95"
        >
          {t(lang, 'home')}
        </button>
      </div>
    </div>
  );
}
