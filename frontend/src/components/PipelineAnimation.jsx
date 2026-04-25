import React, { useEffect, useState } from 'react';
import { t } from '../state/strings.js';

const NODES = [
  { key: 'pipelineVoice',   icon: '🎙️' },
  { key: 'pipelineIntent',  icon: '🧠' },
  { key: 'pipelineAction',  icon: '⚙️' },
  { key: 'pipelineConfirm', icon: '✅' },
];

/**
 * 4-node animated LangGraph pipeline visual. Plays during the THINKING state.
 * Visual only — the real work is done by the backend agent.
 */
export default function PipelineAnimation({ lang }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % NODES.length);
    }, 700);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="phone-frame flex flex-col items-center justify-center bg-gradient-to-b from-tng-blue to-tng-blue-dark px-5 text-white">
      <div className="text-sm font-semibold uppercase tracking-widest opacity-70">
        LangGraph Pipeline
      </div>
      <div className="mt-1 text-3xl font-extrabold">{t(lang, 'thinking')}</div>

      <div className="mt-10 flex w-full flex-col gap-3">
        {NODES.map((n, i) => {
          const state =
            i < active ? 'done' : i === active ? 'active' : 'idle';
          return (
            <div
              key={n.key}
              className={`flex items-center gap-4 rounded-2xl border-2 px-4 py-4 transition-all ${
                state === 'active'
                  ? 'border-tng-yellow bg-white/15 animate-pipeline-glow'
                  : state === 'done'
                  ? 'border-emerald-300/50 bg-white/10'
                  : 'border-white/15 bg-white/5'
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition ${
                  state === 'active'
                    ? 'bg-tng-yellow text-tng-blue-dark'
                    : state === 'done'
                    ? 'bg-emerald-400/90 text-white'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {state === 'done' ? '✓' : n.icon}
              </div>
              <div className="flex-1">
                <div className={`text-lg font-bold ${state === 'idle' ? 'opacity-60' : ''}`}>
                  {t(lang, n.key)}
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={
                      state === 'active'
                        ? 'flow-line h-full w-1/2 animate-flow'
                        : state === 'done'
                        ? 'h-full w-full bg-emerald-300/70'
                        : 'h-full w-0'
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-tng-yellow" />
        Powered by LangChain + Qwen
      </div>
    </div>
  );
}
