export default function SuccessScreen({ data, onDone }) {
  const isPayment = data?.action === 'payment';

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-8 animate-float-up">
      {/* Green success checkmark */}
      <div className="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center text-7xl mb-5 shadow-xl animate-checkmark-pop">
        ✅
      </div>

      <p className="text-3xl font-bold text-green-600 mb-2">Success!</p>
      <p className="text-xl text-gray-600 text-center mb-8 px-4">{data?.text || 'Transaction completed'}</p>

      {/* QR Code for payment */}
      {isPayment && (
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8 w-full max-w-md">
          <p className="text-lg text-gray-400 mb-4">Payment QR Code</p>
          <div className="w-52 h-52 mx-auto mb-4 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-48 h-48">
              <rect x="5" y="5" width="25" height="25" fill="#000" rx="2" />
              <rect x="70" y="5" width="25" height="25" fill="#000" rx="2" />
              <rect x="5" y="70" width="25" height="25" fill="#000" rx="2" />
              <rect x="10" y="10" width="15" height="15" fill="#fff" rx="1" />
              <rect x="75" y="10" width="15" height="15" fill="#fff" rx="1" />
              <rect x="10" y="75" width="15" height="15" fill="#fff" rx="1" />
              <rect x="14" y="14" width="7" height="7" fill="#000" rx="1" />
              <rect x="79" y="14" width="7" height="7" fill="#000" rx="1" />
              <rect x="14" y="79" width="7" height="7" fill="#000" rx="1" />
              <rect x="35" y="5" width="5" height="5" fill="#000" />
              <rect x="45" y="5" width="5" height="5" fill="#000" />
              <rect x="55" y="5" width="5" height="5" fill="#000" />
              <rect x="35" y="15" width="5" height="5" fill="#000" />
              <rect x="50" y="15" width="5" height="5" fill="#000" />
              <rect x="35" y="25" width="5" height="5" fill="#000" />
              <rect x="45" y="25" width="5" height="5" fill="#000" />
              <rect x="55" y="25" width="5" height="5" fill="#000" />
              <rect x="5" y="35" width="5" height="5" fill="#000" />
              <rect x="15" y="35" width="5" height="5" fill="#000" />
              <rect x="25" y="35" width="5" height="5" fill="#000" />
              <rect x="40" y="35" width="5" height="5" fill="#000" />
              <rect x="55" y="35" width="5" height="5" fill="#000" />
              <rect x="70" y="35" width="5" height="5" fill="#000" />
              <rect x="85" y="35" width="5" height="5" fill="#000" />
              <rect x="5" y="45" width="5" height="5" fill="#000" />
              <rect x="20" y="45" width="5" height="5" fill="#000" />
              <rect x="35" y="45" width="5" height="5" fill="#000" />
              <rect x="45" y="45" width="5" height="5" fill="#000" />
              <rect x="60" y="45" width="5" height="5" fill="#000" />
              <rect x="75" y="45" width="5" height="5" fill="#000" />
              <rect x="90" y="45" width="5" height="5" fill="#000" />
              <rect x="10" y="55" width="5" height="5" fill="#000" />
              <rect x="25" y="55" width="5" height="5" fill="#000" />
              <rect x="40" y="55" width="5" height="5" fill="#000" />
              <rect x="50" y="55" width="5" height="5" fill="#000" />
              <rect x="65" y="55" width="5" height="5" fill="#000" />
              <rect x="80" y="55" width="5" height="5" fill="#000" />
              <rect x="35" y="65" width="5" height="5" fill="#000" />
              <rect x="45" y="65" width="5" height="5" fill="#000" />
              <rect x="55" y="65" width="5" height="5" fill="#000" />
              <rect x="70" y="65" width="5" height="5" fill="#000" />
              <rect x="85" y="65" width="5" height="5" fill="#000" />
              <rect x="35" y="75" width="5" height="5" fill="#000" />
              <rect x="50" y="75" width="5" height="5" fill="#000" />
              <rect x="65" y="75" width="5" height="5" fill="#000" />
              <rect x="80" y="75" width="5" height="5" fill="#000" />
              <rect x="90" y="75" width="5" height="5" fill="#000" />
              <rect x="35" y="85" width="5" height="5" fill="#000" />
              <rect x="45" y="85" width="5" height="5" fill="#000" />
              <rect x="60" y="85" width="5" height="5" fill="#000" />
              <rect x="70" y="85" width="5" height="5" fill="#000" />
              <rect x="85" y="85" width="5" height="5" fill="#000" />
              <rect x="90" y="85" width="5" height="5" fill="#000" />
              <rect x="40" y="40" width="20" height="20" fill="#003087" rx="3" />
              <text x="50" y="54" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">TnG</text>
            </svg>
          </div>
          <p className="text-base text-gray-400">
            {new Date().toLocaleString('en-MY')}
          </p>
        </div>
      )}

      <button
        onClick={onDone}
        className="w-full max-w-md bg-tng-blue text-white py-5 rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-transform cursor-pointer"
      >
        Done
      </button>
    </div>
  );
}
