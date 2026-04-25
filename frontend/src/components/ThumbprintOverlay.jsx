import { useState } from 'react'

export default function ThumbprintOverlay({ onVerify }) {
  const [verified, setVerified] = useState(false)

  const handleTap = () => {
    if (verified) return
    setVerified(true)
    setTimeout(onVerify, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4">
        <p className="text-2xl font-semibold text-gray-800 mb-6">
          Please verify — press your thumb here
        </p>

        <button
          onClick={handleTap}
          className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
            verified
              ? 'bg-green-500 scale-105'
              : 'bg-blue-100 hover:bg-blue-200 active:scale-95 cursor-pointer'
          }`}
        >
          {verified ? (
            <span className="text-6xl">✅</span>
          ) : (
            <span className="text-6xl">🔐</span>
          )}
        </button>

        <p className="text-xl mt-4 text-gray-600">
          {verified ? 'Verified!' : 'Tap to verify'}
        </p>
      </div>
    </div>
  )
}
