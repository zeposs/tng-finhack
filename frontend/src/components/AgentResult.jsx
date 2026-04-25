export default function AgentResult({ data, onVerify, onDone, onReplaySpeech }) {
  if (!data) return null;

  const needsVerify = data.needs_verification;
  const isBalance = data.action === 'balance';

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-8 animate-float-up">
      {/* Transcription */}
      {data.transcription && (
        <div className="bg-gray-100 rounded-xl px-6 py-3 mb-6 w-full max-w-md">
          <p className="text-sm text-gray-400 mb-1">You said:</p>
          <p className="text-lg text-gray-700 italic">&ldquo;{data.transcription}&rdquo;</p>
        </div>
      )}

      {/* Error details */}
      {data.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-3 mb-6 w-full max-w-md">
          <p className="text-sm text-red-400 mb-1">Error detail:</p>
          <p className="text-sm text-red-600 font-mono break-all">{data.error}</p>
        </div>
      )}

      {/* Icon */}
      <div className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl mb-6 shadow-lg ${
        isBalance ? 'bg-blue-100' : data.action === 'payment' ? 'bg-green-100' : data.action === 'topup' ? 'bg-purple-100' : 'bg-gray-100'
      }`}>
        {isBalance ? '💰' : data.action === 'payment' ? '💳' : data.action === 'topup' ? '📥' : '🤖'}
      </div>

      {/* Response text */}
      <p className="text-2xl font-bold text-gray-800 text-center mb-4 px-4 leading-snug">{data.text}</p>

      {/* Action buttons */}
      <div className="flex flex-col gap-4 mt-8 w-full max-w-md">
        {data.text && (
          <button
            onClick={onReplaySpeech}
            className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl text-lg font-semibold transition-transform active:scale-95 cursor-pointer"
          >
            🔊 Read Aloud
          </button>
        )}
        {needsVerify && (
          <button
            onClick={onVerify}
            className="w-full bg-tng-blue text-white py-5 rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-transform cursor-pointer"
          >
            🔐 Verify with Thumbprint
          </button>
        )}
        <button
          onClick={onDone}
          className={`w-full py-4 rounded-2xl text-xl font-semibold transition-transform active:scale-95 cursor-pointer ${
            needsVerify ? 'bg-gray-100 text-gray-600' : 'bg-tng-blue text-white shadow-lg'
          }`}
        >
          {needsVerify ? 'Cancel' : 'Done'}
        </button>
      </div>
    </div>
  );
}
