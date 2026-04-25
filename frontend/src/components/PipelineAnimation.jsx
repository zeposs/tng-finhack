import { useState, useEffect } from 'react'

const stages = [
  { icon: '🎙️', label: 'Voice Input' },
  { icon: '🧠', label: 'Intent Detection' },
  { icon: '⚙️', label: 'Action Execution' },
  { icon: '✅', label: 'Confirmation' },
]

export default function PipelineAnimation() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % stages.length)
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-center py-16">
      <p className="text-2xl font-semibold text-blue-600 mb-8">Thinking...</p>

      <div className="flex items-center justify-center gap-2 mb-8">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                i === activeIndex
                  ? 'bg-blue-500 text-white scale-110 shadow-lg'
                  : i < activeIndex
                  ? 'bg-green-400 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              <span className="text-2xl">{stage.icon}</span>
              <span className="text-xs mt-1">{stage.label}</span>
            </div>
            {i < stages.length - 1 && (
              <div className="w-8 h-1 bg-gray-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-100 rounded-lg p-4 max-w-xs mx-auto">
        <p className="text-gray-600 text-sm">Powered by LangChain + Qwen AI</p>
      </div>
    </div>
  )
}
