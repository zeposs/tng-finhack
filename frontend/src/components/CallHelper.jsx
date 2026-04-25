import { useState } from 'react';

export default function CallHelper({ onBack }) {
  const [calling, setCalling] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-8 animate-float-up relative">
      <button
        onClick={onBack}
        className="absolute top-4 left-6 w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-2xl active:scale-90 transition-transform cursor-pointer"
      >
        ←
      </button>

      {!calling ? (
        <>
          <div className="w-28 h-28 rounded-full bg-card-red flex items-center justify-center text-6xl mb-5 shadow-xl">
            📞
          </div>
          <p className="text-2xl font-bold text-gray-800 mb-2">Call Helper</p>
          <p className="text-lg text-gray-500 mb-8 text-center">
            Get help from Touch 'n Go customer support
          </p>
          <button
            onClick={() => setCalling(true)}
            className="bg-card-red text-white px-10 py-5 rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-transform cursor-pointer"
          >
            📞 Call Support
          </button>
          <p className="text-lg text-gray-400 mt-4">1-300-738-888</p>
        </>
      ) : (
        <>
          <div className="w-28 h-28 rounded-full bg-green-500 flex items-center justify-center text-6xl mb-5 shadow-xl animate-pulse">
            📞
          </div>
          <p className="text-2xl font-bold text-gray-800 mb-2">Calling...</p>
          <p className="text-lg text-gray-500 mb-3">Touch 'n Go Support</p>
          <p className="text-3xl font-mono text-gray-700 mb-10">1-300-738-888</p>
          <button
            onClick={() => { setCalling(false); onBack(); }}
            className="bg-red-500 text-white px-10 py-5 rounded-full text-xl font-bold shadow-lg active:scale-95 transition-transform cursor-pointer"
          >
            End Call
          </button>
        </>
      )}
    </div>
  );
}
