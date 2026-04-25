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
      <div className="bg-tng-blue px-5 pt-6 pb-8 text-white rounded-b-[36px]">
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
          <div className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-base">
            <div className="text-xs uppercase tracking-wider opacity-60">You said</div>
            <div className="mt-1 font-semibold">"{result.text}"</div>
          </div>
        )}
      </div>

      <div className="flex-1 px-5 py-6">
        <div className="qm-card animate-float-in">
          <div className="text-sm font-semibold uppercase tracking-wider text-tng-blue">
            Assistant
          </div>
          <div className="mt-2 text-2xl font-extrabold leading-snug text-slate-800">
            {speech}
          </div>

          {payload.tool === 'check_balance' && (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-5 text-center">
              <div className="text-sm font-semibold text-emerald-700">{t(lang, 'myBalance')}</div>
              <div className="mt-1 text-5xl font-extrabold text-emerald-800">
                RM {Number(payload.balance ?? 0).toFixed(2)}
              </div>
            </div>
          )}

          {payload.tool === 'make_payment' && payload.ok && (
            <div className="mt-4 rounded-2xl bg-purple-50 p-5">
              <div className="text-sm font-semibold text-purple-700">Payment</div>
              <div className="mt-1 text-3xl font-extrabold text-purple-800">
                RM {Number(payload.amount).toFixed(2)}
              </div>
              <div className="mt-1 text-base text-slate-600">to {payload.merchant}</div>
            </div>
          )}

          {payload.tool === 'top_up_wallet' && payload.ok && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-5">
              <div className="text-sm font-semibold text-amber-700">Top Up</div>
              <div className="mt-1 text-3xl font-extrabold text-amber-800">
                + RM {Number(payload.amount).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 pb-6">
        <button
          onClick={onCancel}
          className="rounded-2xl border-2 border-slate-200 bg-white py-4 text-lg font-bold text-slate-600 active:scale-95"
        >
          {t(lang, 'confirmCancel')}
        </button>
        <button
          onClick={onApprove}
          className="rounded-2xl bg-tng-blue py-4 text-lg font-bold text-white active:scale-95"
        >
          {requiresVerification ? t(lang, 'confirmApprove') : t(lang, 'done')}
        </button>
      </div>
    </div>
  );
}
