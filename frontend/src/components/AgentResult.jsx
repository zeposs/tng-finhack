import React from 'react';
import { t } from '../state/strings.js';

function ToolBadge({ tool }) {
  const map = {
    check_balance: { label: 'Check Balance', color: 'bg-emerald-100 text-emerald-700' },
    make_payment:  { label: 'Make Payment',  color: 'bg-purple-100 text-purple-700' },
    top_up_wallet: { label: 'Top Up',        color: 'bg-amber-100 text-amber-700' },
    verify_identity: { label: 'Verify',      color: 'bg-blue-100 text-blue-700' },
    unknown:       { label: 'Unknown',       color: 'bg-slate-100 text-slate-700' },
  };
  const item = map[tool] || map.unknown;
  return (
    <span className={`qm-pill ${item.color}`}>{item.label}</span>
  );
}

export default function AgentResult({ lang, result, onApprove, onCancel }) {
  if (!result) return null;
  const payload = result.payload || {};
  const speech = payload.speech || '';
  const requiresVerification = !!payload.requires_verification;

  return (
    <div className="phone-frame flex flex-col bg-white">
      <div className="bg-tng-blue rounded-b-[28px] px-4 pt-5 pb-6 text-white sm:rounded-b-[36px] sm:px-5 sm:pt-6 sm:pb-8">
        <button onClick={onCancel} className="text-sm font-semibold opacity-80 active:opacity-50">
          ← {t(lang, 'back')}
        </button>
        <div className="mt-2 flex items-center gap-2">
          <ToolBadge tool={result.tool} />
          {result.used_llm && (
            <span className="qm-pill bg-white/15 text-white">via LangChain</span>
          )}
        </div>
        {result.text && (
          <div className="mt-3 rounded-2xl bg-white/10 px-3.5 py-2.5 text-sm sm:px-4 sm:py-3 sm:text-base">
            <div className="text-xs uppercase tracking-wider opacity-60">You said</div>
            <div className="mt-1 font-semibold">"{result.text}"</div>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-4 sm:px-5 sm:py-6">
        <div className="qm-card animate-float-in">
          <div className="text-sm font-semibold uppercase tracking-wider text-tng-blue">
            Assistant
          </div>
          <div className="mt-2 text-xl font-extrabold leading-snug text-slate-800 sm:text-2xl">
            {speech}
          </div>

          {payload.tool === 'check_balance' && (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center sm:p-5">
              <div className="text-sm font-semibold text-emerald-700">{t(lang, 'myBalance')}</div>
              <div className="mt-1 text-4xl font-extrabold text-emerald-800 sm:text-5xl">
                RM {Number(payload.balance ?? 0).toFixed(2)}
              </div>
            </div>
          )}

          {payload.tool === 'make_payment' && payload.ok && (
            <div className="mt-4 rounded-2xl bg-purple-50 p-4 sm:p-5">
              <div className="text-sm font-semibold text-purple-700">Payment</div>
              <div className="mt-1 text-2xl font-extrabold text-purple-800 sm:text-3xl">
                RM {Number(payload.amount).toFixed(2)}
              </div>
              <div className="mt-1 text-base text-slate-600">to {payload.merchant}</div>
            </div>
          )}

          {payload.tool === 'top_up_wallet' && payload.ok && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 sm:p-5">
              <div className="text-sm font-semibold text-amber-700">Top Up</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-800 sm:text-3xl">
                + RM {Number(payload.amount).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4 sm:gap-3 sm:px-5 sm:pb-6">
        <button
          onClick={onCancel}
          className="rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-base font-bold text-slate-600 active:scale-95 sm:py-4 sm:text-lg"
        >
          {t(lang, 'confirmCancel')}
        </button>
        <button
          onClick={onApprove}
          className="rounded-2xl bg-tng-blue py-3.5 text-base font-bold text-white active:scale-95 sm:py-4 sm:text-lg"
        >
          {requiresVerification ? t(lang, 'confirmApprove') : t(lang, 'done')}
        </button>
      </div>
    </div>
  );
}
