export default function AgentResult({ data, transcription }) {
  if (!data) return null

  return (
    <div className="text-center py-12">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <p className="text-gray-500 text-lg mb-2">You said:</p>
        <p className="text-xl text-gray-700 mb-4">"{transcription}"</p>

        <div className="border-t pt-4">
          <p className="text-gray-500 text-lg mb-2">AI Response:</p>
          <p className="text-2xl font-semibold text-blue-700">{data.message}</p>
        </div>
      </div>

      {data.requires_verify && (
        <p className="text-orange-500 text-lg animate-pulse">
          Thumbprint verification required...
        </p>
      )}
    </div>
  )
}
