import React from 'react';
import MockQR from './MockQR.jsx';
import { t } from '../state/strings.js';

export default function SuccessScreen({ lang, kind, amount, merchant, balance, onDone }) {
  const isPayment = kind === 'payment';
  const timestamp = new Date();
  const ts = timestamp.toLocaleString();
  const txRef = `TNG${timestamp.getTime().toString().slice(-8)}`;
  const safeMerchant = merchant || 'QR Merchant';
  const payload = JSON.stringify({ kind, amount, merchant: safeMerchant, ts, txRef });

  return (
    <div className="phone-frame flex flex-col bg-white">
      <div className="bg-emerald-500 rounded-b-[28px] px-4 pt-6 pb-7 text-center text-white sm:rounded-b-[36px] sm:px-5 sm:pt-8 sm:pb-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-4xl text-emerald-500 shadow-soft sm:h-20 sm:w-20 sm:text-5xl">
          ✓
        </div>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
          {isPayment ? t(lang, 'paymentSuccess') : t(lang, 'topupSuccess')}
        </h1>
        <div className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          RM {Number(amount ?? 0).toFixed(2)}
        </div>
        {isPayment && safeMerchant && (
          <div className="mt-1 text-sm opacity-90">to {safeMerchant}</div>
        )}
      </div>

      <div className="flex-1 px-4 py-4 sm:px-5 sm:py-6">
        {isPayment ? (
          <div className="qm-card space-y-3 sm:space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Merchant Receipt
              </div>
              <div className="mt-2 space-y-1 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-emerald-700">PAID</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-800">RM {Number(amount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Merchant</span>
                  <span className="text-right font-bold text-slate-800">{safeMerchant}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ref No.</span>
                  <span className="font-mono text-xs font-bold text-slate-700">{txRef}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Paid At</span>
                  <span className="text-right text-xs font-semibold text-slate-700">{ts}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="text-xs font-semibold text-slate-500 sm:text-sm">Show this receipt QR to merchant</div>
              <div className="mt-3 rounded-2xl border-4 border-tng-blue p-2.5 sm:p-3">
                <MockQR payload={payload} size={190} />
              </div>
              <div className="mt-3 text-xs text-slate-400">{ts}</div>
            </div>
          </div>
        ) : (
          <div className="qm-card text-center">
            <div className="text-sm font-semibold text-slate-500">{t(lang, 'myBalance')}</div>
            <div className="mt-2 text-4xl font-extrabold text-tng-blue sm:text-5xl">
              RM {Number(balance ?? 0).toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-6">
        <button
          onClick={onDone}
          className="w-full rounded-2xl bg-tng-blue py-3.5 text-lg font-extrabold text-white active:scale-95 sm:py-4 sm:text-xl"
        >
          {t(lang, 'done')}
        </button>
      </div>
    </div>
  );
}
