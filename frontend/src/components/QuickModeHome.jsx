export default function QuickModeHome({ balance, onVoice, onPromotions, onBalance, onCallHelper }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-blue-900 mb-2">Quick Mode</h1>
      <p className="text-gray-500 mb-6 text-lg">Touch 'n Go eWallet</p>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <p className="text-gray-500 text-xl mb-1">Your Balance</p>
        <p className="text-4xl font-bold text-green-600">RM {balance.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={onBalance}
          className="bg-blue-600 text-white rounded-2xl p-6 text-2xl font-semibold hover:bg-blue-700 active:scale-95 transition min-h-[80px]"
        >
          💰 Balance
        </button>
        <button
          onClick={onPromotions}
          className="bg-purple-600 text-white rounded-2xl p-6 text-2xl font-semibold hover:bg-purple-700 active:scale-95 transition min-h-[80px]"
        >
          🏷️ Deals
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={onVoice}
          className="bg-red-500 text-white rounded-2xl p-6 text-2xl font-semibold hover:bg-red-600 active:scale-95 transition min-h-[80px] animate-pulse"
        >
          🎙️ Voice
        </button>
        <button
          onClick={onCallHelper}
          className="bg-gray-600 text-white rounded-2xl p-6 text-2xl font-semibold hover:bg-gray-700 active:scale-95 transition min-h-[80px]"
        >
          📞 Helper
        </button>
      </div>

      <button
        onClick={onCallHelper}
        className="w-full bg-green-500 text-white rounded-2xl p-4 text-xl font-semibold hover:bg-green-600 active:scale-95 transition min-h-[80px]"
      >
        👨‍👩‍👧 Call Family
      </button>
    </div>
  )
}
