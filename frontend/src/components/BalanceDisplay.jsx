import React from 'react';
import { t } from '../state/strings.js';

export default function BalanceDisplay({ lang, balance, onBack }) {
  return (
    <div className="phone-frame flex flex-col bg-white">
      <div
        className="bg-tng-blue rounded-b-[28px] px-4 pt-5 pb-7 text-white sm:rounded-b-[36px] sm:px-5 sm:pt-6 sm:pb-10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button onClick={onBack} className="text-sm font-semibold opacity-80 active:opacity-50">
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t(lang, 'myBalance')}</h1>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 sm:px-5">
        <div className="qm-card w-full text-center">
          <div className="text-sm font-semibold text-slate-500 sm:text-base">{t(lang, 'myBalance')}</div>
          <div className="mt-2 text-5xl font-extrabold text-tng-blue sm:mt-3 sm:text-6xl">
            RM {Number(balance ?? 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-400 sm:mt-3 sm:text-sm">
            {t(lang, 'lastUpdated')}: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div
        className="px-4 pb-4 sm:px-5 sm:pb-6"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={onBack}
          className="w-full rounded-2xl bg-tng-blue py-3.5 text-lg font-extrabold text-white active:scale-95 sm:py-4 sm:text-xl"
        >
          {t(lang, 'home')}
        </button>
      </div>
    </div>
  );
}
