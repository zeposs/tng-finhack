import { useState, useEffect } from 'react'
import axios from 'axios'

const dummyPromos = [
  { id: 1, merchant: 'Jaya Grocer', discount: '15% off fresh produce', savings: 'RM12', label: 'Show this at shop' },
  { id: 2, merchant: 'AEON', discount: 'Buy 2 Free 1 on household items', savings: 'RM8', label: 'Show this at shop' },
  { id: 3, merchant: '99 Speedmart', discount: 'RM5 off min spend RM30', savings: 'RM5', label: 'Show this at shop' },
]

export default function PromotionsPanel({ onBack }) {
  const [promos, setPromos] = useState([])

  useEffect(() => {
    axios.get('/api/promotions')
      .then(res => setPromos(res.data.promotions))
      .catch(() => setPromos(dummyPromos))
  }, [])

  const displayPromos = promos.length > 0 ? promos : dummyPromos

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-purple-700 mb-6">Promotions & Deals</h2>

      <div className="space-y-4 mb-6">
        {displayPromos.map((promo) => (
          <div key={promo.id} className="bg-white rounded-2xl shadow-lg p-5 text-left">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-800">{promo.merchant}</h3>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-lg font-semibold">
                Save: {promo.savings}
              </span>
            </div>
            <p className="text-lg text-gray-600 mb-2">{promo.discount}</p>
            <p className="text-sm text-gray-400">{promo.label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="bg-gray-600 text-white rounded-2xl px-8 py-4 text-2xl font-semibold hover:bg-gray-700 active:scale-95 transition min-h-[80px]"
      >
        Back
      </button>
    </div>
  )
}
