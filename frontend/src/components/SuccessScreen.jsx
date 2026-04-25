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
      <div className="bg-emerald-500 px-5 pt-8 pb-10 text-center text-white rounded-b-[36px]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-5xl text-emerald-500 shadow-soft">
          ✓
        </div>
        <h1 className="mt-3 text-3xl font-extrabold">
          {isPayment ? t(lang, 'paymentSuccess') : t(lang, 'topupSuccess')}
        </h1>
        <div className="mt-1 text-4xl font-extrabold tracking-tight">
          RM {Number(amount ?? 0).toFixed(2)}
        </div>
        {isPayment && safeMerchant && (
          <div className="mt-1 text-sm opacity-90">to {safeMerchant}</div>
        )}
      </div>

      <div className="flex-1 px-5 py-6">
        {isPayment ? (
          <div className="qm-card space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Merchant Receipt
              </div>
              <div className="mt-2 space-y-1 text-sm">
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
              <div className="text-sm font-semibold text-slate-500">Show this receipt QR to merchant</div>
              <div className="mt-3 rounded-2xl border-4 border-tng-blue p-3">
                <MockQR payload={payload} size={220} />
              </div>
              <div className="mt-3 text-xs text-slate-400">{ts}</div>
            </div>
          </div>
        ) : (
          <div className="qm-card text-center">
            <div className="text-sm font-semibold text-slate-500">{t(lang, 'myBalance')}</div>
            <div className="mt-2 text-5xl font-extrabold text-tng-blue">
              RM {Number(balance ?? 0).toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-6">
        <button
          onClick={onDone}
          className="w-full rounded-2xl bg-tng-blue py-4 text-xl font-extrabold text-white active:scale-95"
        >
          {t(lang, 'done')}
        </button>
      </div>
    </div>
  );
}
