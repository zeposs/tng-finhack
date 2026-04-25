import React, { useMemo, useState } from 'react';
import { t } from '../state/strings.js';

const QUICK_AMOUNTS = [10, 20, 50, 100];

export default function PaymentPanel({ lang, onBack, onProceed }) {
  const [merchant, setMerchant] = useState('Jaya Grocer');
  const [amountText, setAmountText] = useState('50');

  const amount = useMemo(() => {
    const n = Number(String(amountText).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }, [amountText]);

  const canProceed = merchant.trim().length > 0 && amount > 0;

  return (
    <div className="phone-frame flex flex-col bg-white">
      <div className="bg-tng-blue rounded-b-[28px] px-4 pt-5 pb-6 text-white sm:rounded-b-[36px] sm:px-5 sm:pt-6 sm:pb-8">
        <button onClick={onBack} className="text-sm font-semibold opacity-80 active:opacity-50">
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t(lang, 'payTitle')}</h1>
        <div className="mt-1 text-sm opacity-90">{t(lang, 'paySub')}</div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:space-y-4 sm:px-5 sm:py-5">
        <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-3.5 sm:p-4">
          <div className="text-base font-bold text-emerald-800">{t(lang, 'scanPay')}</div>
          <div className="mt-1 text-sm text-emerald-700">{t(lang, 'scanPayHint')}</div>
          <button
            onClick={() => void onProceed({ merchant: 'QR Merchant', amount: 18.9 })}
            className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
          >
            {t(lang, 'scanNowDemo')}
          </button>
        </div>

        <div className="rounded-2xl border-2 border-slate-100 bg-white p-3.5 shadow-sm sm:p-4">
          <div className="text-base font-bold text-slate-800">{t(lang, 'payMerchant')}</div>

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(lang, 'merchant')}
          </label>
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-base focus:border-tng-blue focus:outline-none"
            placeholder={t(lang, 'merchantPlaceholder')}
          />

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(lang, 'amountRm')}
          </label>
          <input
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-base focus:border-tng-blue focus:outline-none"
            placeholder="50.00"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((n) => (
              <button
                key={n}
                onClick={() => setAmountText(String(n))}
                className="rounded-full border-2 border-tng-blue/20 bg-blue-50 px-3 py-1 text-sm font-bold text-tng-blue active:scale-95"
              >
                RM {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-6">
        <button
          disabled={!canProceed}
          onClick={() => void onProceed({ merchant: merchant.trim(), amount })}
          className={`w-full rounded-2xl py-3.5 text-base font-extrabold text-white transition sm:py-4 sm:text-lg ${
            canProceed ? 'bg-tng-blue active:scale-95' : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          {t(lang, 'continuePay')}
        </button>
      </div>
    </div>
  );
}
