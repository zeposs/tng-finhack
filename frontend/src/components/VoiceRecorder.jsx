export default function VoiceRecorder() {
  return (
    <div className="text-center py-20">
      <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
        <span className="text-5xl">🎙️</span>
      </div>
      <p className="text-2xl font-semibold text-red-600">Listening...</p>
      <p className="text-gray-500 mt-2 text-lg">Speak your command now</p>
    </div>
  )
}
