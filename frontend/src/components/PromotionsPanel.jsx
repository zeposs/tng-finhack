import React, { useEffect, useState } from 'react';
import { fetchPromotions } from '../state/api.js';
import { t } from '../state/strings.js';

const MERCHANT_ICONS = {
  'Jaya Grocer': '🥬',
  'AEON': '🛒',
  '99 Speedmart': '🏪',
};

export default function PromotionsPanel({ lang, onBack }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetchPromotions()
      .then((p) => setPromos(p))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="phone-frame flex flex-col bg-white">
      <div className="bg-tng-blue px-5 pt-6 pb-8 text-white rounded-b-[36px]">
        <button onClick={onBack} className="text-sm font-semibold opacity-80 active:opacity-50">
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-3xl font-extrabold">{t(lang, 'promotionsTitle')}</h1>
        <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
          🛡️ {t(lang, 'safeNote')}
        </div>
      </div>

      <div className="flex-1 px-5 py-5">
        {loading && (
          <div className="py-10 text-center text-slate-500">Loading…</div>
        )}
        {err && (
          <div className="py-10 text-center text-rose-500">Could not load promotions.</div>
        )}
        <div className="space-y-4">
          {promos.map((p) => (
            <div
              key={p.id}
              className="qm-card animate-float-in"
              style={{ borderLeft: `8px solid ${p.accent}` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                  style={{ background: `${p.accent}1a`, color: p.accent }}
                >
                  {MERCHANT_ICONS[p.merchant] || '🏷️'}
                </div>
                <div className="flex-1">
                  <div className="text-xl font-extrabold text-slate-800">
                    {p.merchant}
                  </div>
                  <div className="mt-1 text-base font-medium text-slate-600">
                    {p.title}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className="qm-pill text-sm font-bold"
                      style={{ background: `${p.accent}1a`, color: p.accent }}
                    >
                      {t(lang, 'save')}: RM {Number(p.save_amount).toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {p.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
