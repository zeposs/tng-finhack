import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchPromotions } from '../state/api.js';
import { t } from '../state/strings.js';

const CATEGORY_FALLBACK_PHOTOS = {
  detergent: 'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=640&q=80',
  tissue: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=640&q=80',
  chicken: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=640&q=80',
  apple: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=640&q=80',
  drink: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=640&q=80',
  noodles: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=640&q=80',
  shampoo: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=640&q=80',
  vitamin: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=640&q=80',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=640&q=80',
};

function detectCategory(itemName = '', merchant = '') {
  const text = `${itemName} ${merchant}`.toLowerCase();
  if (/(detergent|laundry|softener|clean)/.test(text)) return 'detergent';
  if (/(tissue|toilet|paper|napkin)/.test(text)) return 'tissue';
  if (/(chicken|meat|breast)/.test(text)) return 'chicken';
  if (/(apple|fruit|produce|vegetable)/.test(text)) return 'apple';
  if (/(milo|drink|beverage|coffee|tea|milk)/.test(text)) return 'drink';
  if (/(maggi|noodle|instant)/.test(text)) return 'noodles';
  if (/(shampoo|hair|conditioner)/.test(text)) return 'shampoo';
  if (/(vitamin|supplement|tablet|pill|health)/.test(text)) return 'vitamin';
  return 'grocery';
}

function getRelevantPhoto(itemName = '', merchant = '', explicitPhoto = '') {
  const category = detectCategory(itemName, merchant);
  return explicitPhoto || CATEGORY_FALLBACK_PHOTOS[category] || CATEGORY_FALLBACK_PHOTOS.grocery;
}

const ITEM_PROMOS = [
  {
    id: 'i1',
    merchant: 'AEON',
    item_name: 'Attack Detergent 2.5kg',
    detail: 'Household cleaning essentials promo',
    save_amount: 8,
    label: 'Show this at shop',
    accent: '#db2777',
    photo: 'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i2',
    merchant: 'AEON',
    item_name: 'Toilet Tissue 12-roll pack',
    detail: 'Daily use tissue bundle discount',
    save_amount: 6,
    label: 'Show this at shop',
    accent: '#db2777',
    photo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i3',
    merchant: 'Jaya Grocer',
    item_name: 'Fresh Chicken Breast 1kg',
    detail: 'Protein week special pricing',
    save_amount: 5,
    label: 'Show this at shop',
    accent: '#16a34a',
    photo: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i4',
    merchant: 'Jaya Grocer',
    item_name: 'Imported Apples 6pcs',
    detail: 'Fresh produce savings',
    save_amount: 4,
    label: 'Show this at shop',
    accent: '#16a34a',
    photo: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i5',
    merchant: '99 Speedmart',
    item_name: 'Milo 1kg Refill Pack',
    detail: 'Breakfast family pack offer',
    save_amount: 4.5,
    label: 'Show this at shop',
    accent: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i6',
    merchant: '99 Speedmart',
    item_name: 'Maggi Curry 5-pack',
    detail: 'Instant meal budget deal',
    save_amount: 2.5,
    label: 'Show this at shop',
    accent: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i7',
    merchant: 'Watsons',
    item_name: 'Loreal Shampoo 700ml',
    detail: 'Hair care monthly promo',
    save_amount: 10,
    label: 'Show this at shop',
    accent: '#0ea5e9',
    photo: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i8',
    merchant: 'Guardian',
    item_name: 'Vitamin C 60 tablets',
    detail: 'Health supplement discount',
    save_amount: 14,
    label: 'Show this at shop',
    accent: '#22c55e',
    photo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i9',
    merchant: 'AEON',
    item_name: 'Sunlight Dishwash 800ml',
    detail: 'Kitchen essentials value deal',
    save_amount: 3.5,
    label: 'Show this at shop',
    accent: '#db2777',
    photo: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i10',
    merchant: 'Jaya Grocer',
    item_name: 'Farm Eggs Grade A 10s',
    detail: 'Fresh daily protein savings',
    save_amount: 2.8,
    label: 'Show this at shop',
    accent: '#16a34a',
    photo: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i11',
    merchant: '99 Speedmart',
    item_name: 'Gardenia Bread Original',
    detail: 'Breakfast staple weekly promo',
    save_amount: 1.2,
    label: 'Show this at shop',
    accent: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i12',
    merchant: 'Watsons',
    item_name: 'Facial Cleanser 100ml',
    detail: 'Personal care member special',
    save_amount: 6.5,
    label: 'Show this at shop',
    accent: '#0ea5e9',
    photo: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i13',
    merchant: 'Guardian',
    item_name: 'Fish Oil 120 Softgels',
    detail: 'Heart health savings bundle',
    save_amount: 12,
    label: 'Show this at shop',
    accent: '#22c55e',
    photo: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i14',
    merchant: 'AEON',
    item_name: 'Prego Pasta Sauce 680g',
    detail: 'Family meal pantry promotion',
    save_amount: 4.2,
    label: 'Show this at shop',
    accent: '#db2777',
    photo: 'https://images.unsplash.com/photo-1515516969-d4008cc6241a?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i15',
    merchant: 'Jaya Grocer',
    item_name: 'Banana 1kg Bundle',
    detail: 'Fresh fruit daily value',
    save_amount: 2,
    label: 'Show this at shop',
    accent: '#16a34a',
    photo: 'https://images.unsplash.com/photo-1574226516831-e1dff420e37f?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i16',
    merchant: '99 Speedmart',
    item_name: 'Dutch Lady Milk 1L',
    detail: 'Household milk saver',
    save_amount: 2.3,
    label: 'Show this at shop',
    accent: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i17',
    merchant: 'Watsons',
    item_name: 'Toothpaste Twin Pack',
    detail: 'Oral care bundle discount',
    save_amount: 5,
    label: 'Show this at shop',
    accent: '#0ea5e9',
    photo: 'https://images.unsplash.com/photo-1559591935-c6c7b18ffb7f?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'i18',
    merchant: 'Guardian',
    item_name: 'Calcium + D3 90 tablets',
    detail: 'Bone care monthly deal',
    save_amount: 9,
    label: 'Show this at shop',
    accent: '#22c55e',
    photo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=640&q=80',
  },
];

export default function PromotionsPanel({ lang, onBack }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [activeMerchant, setActiveMerchant] = useState('All');
  const tabButtonRefs = useRef({});
  const touchStartRef = useRef({ x: null, y: null });

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
      item_name: p.item_name || p.title || 'Special item',
      detail: p.detail || 'Limited-time in-store promotion',
      label: p.label || t(lang, 'showAtShop'),
      photo: getRelevantPhoto(p.item_name || p.title || '', p.merchant || '', p.photo),
      accent: p.accent || ITEM_PROMOS[idx % ITEM_PROMOS.length].accent,
    }));
    return [...normalized, ...ITEM_PROMOS];
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

  useEffect(() => {
    const btn = tabButtonRefs.current[activeMerchant];
    if (btn && typeof btn.scrollIntoView === 'function') {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeMerchant]);

  const moveMerchantBySwipe = (direction) => {
    const currentIdx = merchantTabs.indexOf(activeMerchant);
    if (currentIdx < 0) return;
    const nextIdx = direction === 'next'
      ? Math.min(currentIdx + 1, merchantTabs.length - 1)
      : Math.max(currentIdx - 1, 0);
    if (nextIdx !== currentIdx) setActiveMerchant(merchantTabs[nextIdx]);
  };

  const onTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches?.[0]?.clientX ?? null,
      y: e.touches?.[0]?.clientY ?? null,
    };
  };

  const onTouchEnd = (e) => {
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    if (startX == null || startY == null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? startX;
    const endY = e.changedTouches?.[0]?.clientY ?? startY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    touchStartRef.current = { x: null, y: null };

    // Only handle intentional horizontal swipes; keep vertical scrolling natural.
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0) moveMerchantBySwipe('next'); // swipe left
    else moveMerchantBySwipe('prev'); // swipe right
  };

  return (
    <div className="phone-frame flex flex-col bg-white">
      <div className="bg-tng-blue px-4 pt-5 pb-5 text-white">
        <button onClick={onBack} className="text-sm font-semibold opacity-80 active:opacity-50">
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-2xl font-extrabold">{t(lang, 'promotionsTitle')}</h1>
        <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
          🛡️ {t(lang, 'safeNote')}
        </div>
      </div>

      <div
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="no-scrollbar mb-2 overflow-x-auto">
          <div className="flex min-w-max gap-2 pr-2">
            {merchantTabs.map((name) => {
              const active = activeMerchant === name;
              return (
                <button
                  key={name}
                  ref={(el) => {
                    if (el) tabButtonRefs.current[name] = el;
                  }}
                  onClick={() => setActiveMerchant(name)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
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
        <div className="space-y-2.5">
          {visiblePromos.map((p) => (
            <div
              key={p.id}
              className="animate-float-in rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm"
              style={{ borderLeft: `5px solid ${p.accent}` }}
            >
              <div className="flex items-start gap-2.5">
                <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                  <img
                    src={p.photo}
                    alt={p.item_name || p.merchant}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const fallback = getRelevantPhoto(p.item_name, p.merchant);
                      const backup = CATEGORY_FALLBACK_PHOTOS.grocery;
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      } else if (e.currentTarget.src !== backup) {
                        e.currentTarget.src = backup;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-extrabold leading-tight text-slate-800">
                    {p.item_name}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {p.merchant}
                  </div>
                  <div className="mt-0.5 text-sm font-medium leading-snug text-slate-600">
                    {p.detail}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span
                      className="rounded-full px-3 py-1 text-sm font-bold"
                      style={{ background: `${p.accent}1a`, color: p.accent }}
                    >
                      {t(lang, 'save')}: RM {Number(p.save_amount).toFixed(2)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {p.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onBack}
          className="w-full rounded-2xl bg-tng-blue py-3 text-lg font-extrabold text-white active:scale-95"
        >
          {t(lang, 'home')}
        </button>
      </div>
    </div>
  );
}
