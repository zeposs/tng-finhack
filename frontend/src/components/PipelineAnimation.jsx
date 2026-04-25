import { useState, useEffect } from 'react';

const PIPELINE_STEPS = [
  { icon: '🎙️', label: 'Voice Input', desc: 'Processing audio...' },
  { icon: '🧠', label: 'Intent Detection', desc: 'Understanding command...' },
  { icon: '⚙️', label: 'Action Execution', desc: 'Running action...' },
  { icon: '✅', label: 'Confirmation', desc: 'Preparing response...' },
];

export default function PipelineAnimation({ onComplete, statusText }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= PIPELINE_STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(() => onComplete?.(), 600);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-8 animate-float-up">
      <p className="text-3xl font-bold text-tng-blue mb-3">Processing your request...</p>
      <p className="text-lg text-gray-400 mb-4">LangChain Agent Pipeline</p>

      {/* Live status from backend */}
      {statusText && (
        <div className="bg-gray-100 rounded-xl px-5 py-2.5 mb-6 w-full max-w-md">
          <p className="text-base text-gray-600 font-mono text-center">{statusText}</p>
        </div>
      )}

      {/* Pipeline nodes */}
      <div className="flex flex-col gap-2 w-full max-w-md">
        {PIPELINE_STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep;

          return (
            <div key={i}>
              <div
                className={`flex items-center gap-4 p-5 rounded-xl transition-all duration-500 ${
                  isActive
                    ? 'bg-tng-blue text-white shadow-lg scale-105 animate-node-glow'
                    : isDone
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 ${
                  isActive ? 'bg-white/20' : isDone ? 'bg-green-200' : 'bg-gray-200'
                }`}>
                  {isDone ? '✓' : step.icon}
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">{step.label}</p>
                  <p className={`text-base ${isActive ? 'text-white/70' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                    {isDone ? 'Complete' : isActive ? step.desc : 'Waiting...'}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className={`w-1 h-5 transition-colors duration-300 rounded ${
                    isDone ? 'bg-green-400' : isActive ? 'bg-tng-blue' : 'bg-gray-200'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
