import { useState } from 'react';

export default function ThumbprintOverlay({ onVerified }) {
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerified(true);
    setTimeout(() => onVerified(), 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-float-up">
      <div className="bg-white rounded-3xl p-10 mx-6 text-center shadow-2xl max-w-lg w-full">
        {!verified ? (
          <>
            <p className="text-2xl font-bold text-gray-800 mb-3">Verify Transaction</p>
            <p className="text-lg text-gray-500 mb-8">Please press your thumb below to confirm</p>

            <button
              onClick={handleVerify}
              className="w-44 h-44 mx-auto rounded-full bg-gradient-to-br from-tng-blue to-tng-blue-light flex items-center justify-center text-8xl shadow-xl active:scale-90 transition-transform cursor-pointer"
            >
              🔐
            </button>

            <p className="text-base text-gray-400 mt-6">Tap the icon to verify</p>
          </>
        ) : (
          <>
            <div className="w-32 h-32 mx-auto rounded-full bg-green-500 flex items-center justify-center text-7xl mb-5 animate-checkmark-pop">
              ✅
            </div>
            <p className="text-3xl font-bold text-green-600">Verified!</p>
            <p className="text-lg text-gray-500 mt-2">Transaction confirmed</p>
          </>
        )}
      </div>
    </div>
  );
}
