export default function SuccessScreen({ data, onDone }) {
  return (
    <div className="text-center py-12">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center">
        <span className="text-5xl text-white">✓</span>
      </div>

      <h2 className="text-3xl font-bold text-green-600 mb-4">Success!</h2>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <p className="text-2xl font-semibold text-gray-800 mb-2">{data?.message}</p>
        {data?.new_balance !== undefined && (
          <p className="text-xl text-green-600 mt-2">
            New Balance: RM {data.new_balance.toFixed(2)}
          </p>
        )}
      </div>

      {data?.action === 'make_payment' && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <p className="text-gray-500 mb-2">Payment QR Code</p>
          <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-2">
            <div className="grid grid-cols-5 gap-1 p-4">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-400">
            {data?.merchant} • RM {data?.amount?.toFixed(2)} • {data?.timestamp?.slice(0, 19).replace('T', ' ')}
          </p>
        </div>
      )}

      <button
        onClick={onDone}
        className="bg-blue-600 text-white rounded-2xl px-8 py-4 text-2xl font-semibold hover:bg-blue-700 active:scale-95 transition min-h-[80px]"
      >
        Done
      </button>
    </div>
  )
}
