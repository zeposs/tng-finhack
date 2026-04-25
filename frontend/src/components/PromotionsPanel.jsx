import React, { useEffect, useMemo, useState } from 'react';
import { fetchPromotions } from '../state/api.js';
import { t } from '../state/strings.js';

const MERCHANT_MEDIA = {
  'Jaya Grocer': {
    icon: '🥬',
    photo:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=640&q=80',
  },
  AEON: {
    icon: '🛒',
    photo:
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=640&q=80',
  },
  '99 Speedmart': {
    icon: '🏪',
    photo:
      'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=640&q=80',
  },
  Watsons: {
    icon: '🧴',
    photo:
      'https://images.unsplash.com/photo-1629198725094-4fb63c84af84?auto=format&fit=crop&w=640&q=80',
  },
  Guardian: {
    icon: '💊',
    photo:
      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=640&q=80',
  },
  'Tealive': {
    icon: '🧋',
    photo:
      'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=640&q=80',
  },
};

const EXTRA_PROMOS = [
  {
    id: 'x1',
    merchant: 'Watsons',
    title: 'RM10 off skincare and personal care items (min spend RM60)',
    save_amount: 10,
    label: 'Show this at shop',
    accent: '#0ea5e9',
  },
  {
    id: 'x2',
    merchant: 'Guardian',
    title: '20% off vitamins, supplements, and first-aid essentials',
    save_amount: 14,
    label: 'Show this at shop',
    accent: '#22c55e',
  },
  {
    id: 'x3',
    merchant: 'Tealive',
    title: 'Buy 1 Free 1 selected tea and beverage menu items',
    save_amount: 7,
    label: 'Show this at shop',
    accent: '#a855f7',
  },
  {
    id: 'x4',
    merchant: 'AEON',
    title: 'Extra RM6 off detergent, tissue, and home cleaning supplies',
    save_amount: 6,
    label: 'Show this at shop',
    accent: '#db2777',
  },
];

const MATERIAL_TITLE_BY_MERCHANT = {
  'Jaya Grocer': 'Fresh vegetables, fruits, and produce - 15% off',
  AEON: 'Household materials: tissue, detergent, and toiletries deals',
  '99 Speedmart': 'Daily essentials and pantry items - RM5 off min spend RM30',
};

export default function PromotionsPanel({ lang, onBack }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [activeMerchant, setActiveMerchant] = useState('All');

  useEffect(() => {
    fetchPromotions()
      .then((p) => setPromos(Array.isArray(p) ? p : []))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  const mergedPromos = useMemo(() => {
    const normalized = promos.map((p, idx) => ({
      ...p,
      id: p.id ?? `api-${idx}`,
      title: MATERIAL_TITLE_BY_MERCHANT[p.merchant] || p.title,
      label: p.label || t(lang, 'showAtShop'),
    }));
    return [...normalized, ...EXTRA_PROMOS];
  }, [lang, promos]);

  const merchantTabs = useMemo(() => {
    const names = Array.from(new Set(mergedPromos.map((p) => p.merchant)));
    return ['All', ...names];
  }, [mergedPromos]);

  const visiblePromos = useMemo(
    () =>
      activeMerchant === 'All'
        ? mergedPromos
        : mergedPromos.filter((p) => p.merchant === activeMerchant),
    [activeMerchant, mergedPromos],
  );

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
        <div className="mb-4 overflow-x-auto">
          <div className="flex min-w-max gap-2 pr-2">
            {merchantTabs.map((name) => {
              const active = activeMerchant === name;
              return (
                <button
                  key={name}
                  onClick={() => setActiveMerchant(name)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    active
                      ? 'border-tng-blue bg-tng-blue text-white'
                      : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="py-10 text-center text-slate-500">Loading…</div>
        )}
        {err && (
          <div className="py-10 text-center text-rose-500">Could not load promotions.</div>
        )}
        <div className="space-y-4">
          {visiblePromos.map((p) => (
            <div
              key={p.id}
              className="qm-card animate-float-in"
              style={{ borderLeft: `8px solid ${p.accent}` }}
            >
              <div className="flex items-start gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                  <div
                    className="absolute inset-0 flex items-center justify-center text-3xl"
                    style={{ background: `${p.accent}1a`, color: p.accent }}
                  >
                    {MERCHANT_MEDIA[p.merchant]?.icon || '🏷️'}
                  </div>
                  <img
                    src={MERCHANT_MEDIA[p.merchant]?.photo}
                    alt={p.merchant}
                    className="relative z-10 h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
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
