import { useState, useEffect } from 'react'

export default function CallHelper({ onBack }) {
  const [calling, setCalling] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!calling) return
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [calling])

  const handleCall = () => {
    setCalling(true)
    setSeconds(0)
  }

  const handleEnd = () => {
    setCalling(false)
    setSeconds(0)
  }

  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-8">TnG Support</h2>

      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <p className="text-4xl mb-4">📞</p>
        <p className="text-xl text-gray-600 mb-2">1-300-88-2211</p>
        <p className="text-gray-400">Touch 'n Go Customer Service</p>

        {calling && (
          <p className="text-green-600 text-lg mt-4">
            Connected • {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>

      {!calling ? (
        <button
          onClick={handleCall}
          className="bg-green-500 text-white rounded-2xl px-8 py-4 text-2xl font-semibold hover:bg-green-600 active:scale-95 transition min-h-[80px] w-full mb-4"
        >
          Call Now
        </button>
      ) : (
        <button
          onClick={handleEnd}
          className="bg-red-500 text-white rounded-2xl px-8 py-4 text-2xl font-semibold hover:bg-red-600 active:scale-95 transition min-h-[80px] w-full mb-4"
        >
          End Call
        </button>
      )}

      <button
        onClick={onBack}
        className="bg-gray-600 text-white rounded-2xl px-8 py-4 text-2xl font-semibold hover:bg-gray-700 active:scale-95 transition min-h-[80px] w-full"
      >
        Back
      </button>
    </div>
  )
}
