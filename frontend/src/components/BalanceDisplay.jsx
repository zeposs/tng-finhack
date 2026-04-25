export default function BalanceDisplay({ balance, onBack }) {
  return (
    <div className="text-center py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <p className="text-gray-500 text-xl mb-2">Your Balance</p>
        <p className="text-5xl font-bold text-green-600">RM {balance.toFixed(2)}</p>
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
