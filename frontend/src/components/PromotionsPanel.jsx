import { useState, useEffect } from 'react';
import { getPromotions } from '../api';

const FALLBACK_PROMOS = [
  { id: 1, merchant: 'Jaya Grocer', discount: '15% off fresh produce', savings: 'RM12', label: 'Show this at shop', icon: '🛒' },
  { id: 2, merchant: 'AEON', discount: 'Buy 2 Free 1 on household items', savings: 'RM8', label: 'Show this at shop', icon: '🏬' },
  { id: 3, merchant: '99 Speedmart', discount: 'RM5 off min spend RM30', savings: 'RM5', label: 'Show this at shop', icon: '🏪' },
];

const CARD_COLORS = [
  'from-green-400 to-green-600',
  'from-blue-400 to-blue-600',
  'from-orange-400 to-orange-600',
];

export default function PromotionsPanel({ onBack }) {
  const [promos, setPromos] = useState(FALLBACK_PROMOS);

  useEffect(() => {
    getPromotions()
      .then((data) => {
        if (data.promotions?.length) setPromos(data.promotions);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="px-6 pt-6 pb-8 animate-float-up">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-2xl active:scale-90 transition-transform cursor-pointer"
        >
          ←
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Promotions & Deals</h2>
      </div>

      <div className="flex flex-col gap-5">
        {promos.map((promo, i) => (
          <div
            key={promo.id || i}
            className={`bg-gradient-to-r ${CARD_COLORS[i % CARD_COLORS.length]} rounded-2xl p-6 text-white shadow-lg`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-3xl mb-2">{promo.icon}</p>
                <p className="text-xl font-bold">{promo.merchant}</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2">
                <p className="text-sm">Save</p>
                <p className="text-xl font-bold">{promo.savings}</p>
              </div>
            </div>
            <p className="text-lg font-medium mb-4">{promo.discount}</p>
            <div className="bg-white/20 rounded-xl py-3 px-5 text-center">
              <p className="text-base font-semibold">{promo.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
        <p className="text-base text-yellow-700">View only - no purchases can be made from this page</p>
      </div>
    </div>
  );
}
