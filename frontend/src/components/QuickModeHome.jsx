import React from 'react';
import Logo from './Logo.jsx';
import { t } from '../state/strings.js';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';

function HeaderBar({ lang }) {
  const [isFullscreen, setIsFullscreen] = React.useState(!!document.fullscreenElement);

  React.useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* fullscreen not supported — silently ignore */
    }
  };

  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-0.5 sm:px-5 sm:pt-2.5">
      <span className="text-xs font-bold uppercase tracking-widest text-white/80 sm:text-sm">
        {t(lang, 'myBalance')}
      </span>
      <button
        onClick={toggleFullscreen}
        className="rounded-xl active:scale-90 transition-transform"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        <Logo size={44} />
        <div className="mt-0.5 text-center text-[9px] font-bold text-white/60 leading-none">
          {isFullscreen ? '⊠ EXIT' : '⛶ FULL'}
        </div>
      </button>
    </div>
  );
}

function BalanceCard({ balance, lang, refreshing, onRefresh }) {
  const [showBalance, setShowBalance] = React.useState(true);
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <div className="px-4 pb-1.5 text-white sm:px-5 sm:pb-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">💳</span>
        <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {showBalance ? `RM ${Number(balance ?? 0).toFixed(2)}` : 'RM ****'}
        </span>
        <button
          onClick={() => setShowBalance((v) => !v)}
          className="ml-1 inline-flex items-center rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold text-white active:scale-95"
          aria-label={showBalance ? 'Hide balance' : 'Show balance'}
          title={showBalance ? 'Hide balance' : 'Show balance'}
        >
          {showBalance ? '🙈' : '👁️'}
        </button>
      </div>
      <button
        onClick={onRefresh}
        className="mt-1 flex items-center gap-1 text-[11px] opacity-85 active:opacity-60 sm:text-xs"
      >
        <span>{t(lang, 'lastUpdated')}: {hh}:{mm}</span>
        <span className={refreshing ? 'animate-spin' : ''}>↻</span>
      </button>
    </div>
  );
}

function ActionTile({ onClick, icon, iconBg, label, hint, color, accent, minHeight = 80 }) {
  return (
    <button
      onClick={onClick}
      className="qm-btn bg-white"
      style={{ border: `2px solid ${accent}22`, minHeight }}
    >
      <div className="qm-btn-icon h-12 w-12 text-3xl" style={{ background: iconBg, color }}>
        {icon}
      </div>
      <div className="text-sm font-extrabold" style={{ color }}>{label}</div>
      <div className="text-[10px] font-medium leading-tight text-slate-500">
        {hint}
      </div>
    </button>
  );
}

function PrimaryBottomAction({ onClick, icon, label, hint, bgClass, ringClass }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[68px] w-full flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-center shadow-soft transition active:scale-[0.97] ${bgClass} ${ringClass}`}
    >
      <div className="text-3xl leading-none">{icon}</div>
      <div className="mt-0.5 text-sm font-extrabold tracking-tight text-white">{label}</div>
      <div className="text-[10px] font-medium text-white/90 leading-snug">{hint}</div>
    </button>
  );
}

function WeChatHoldVoiceButton({ lang, onCaptured, disabled }) {
  const { recording, supported, isSecureContext, error, start, stop } = useVoiceRecorder();

  const startHold = async (e) => {
    e?.preventDefault?.();
    if (disabled) return;
    await start();
  };

  const endHold = async (e) => {
    e?.preventDefault?.();
    if (!recording) return;
    const blob = await stop();
    if (blob) onCaptured(blob);
  };

  const blocked = !supported;
  const showError = blocked || error;

  return (
    <div className="w-full">
      <button
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
        disabled={disabled || blocked}
        className={`flex min-h-[68px] w-full select-none flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-center shadow-soft transition ${
          recording
            ? 'scale-[0.98] bg-gradient-to-b from-red-500 to-red-600 ring-2 ring-red-200'
            : 'active:scale-[0.97] bg-gradient-to-b from-violet-500 to-violet-600 ring-2 ring-violet-200'
        } ${disabled || blocked ? 'cursor-not-allowed opacity-70' : ''}`}
      >
        <div className="text-3xl leading-none">{recording ? '🔴' : '🎙️'}</div>
        <div className="mt-0.5 text-sm font-extrabold tracking-tight text-white">{t(lang, 'voice')}</div>
        <div className="text-[10px] font-medium leading-snug text-white/90">
          {recording ? t(lang, 'releaseToSend') : t(lang, 'holdToTalk')}
        </div>
      </button>
      {showError && (
        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {blocked
            ? t(lang, 'micFailed')
            : (!isSecureContext ? t(lang, 'micInsecureHint') : t(lang, 'micDeniedHint'))}
        </div>
      )}
    </div>
  );
}

function ChatBox({ lang, messages }) {
  const listRef = React.useRef(null);
  const endRef = React.useRef(null);
  const scrollTimerRef = React.useRef(null);
  const lastUserQuestion = [...(messages || [])].reverse().find((m) => m?.role === 'user')?.text || '';

  React.useEffect(() => {
    if (!endRef.current || !listRef.current) return;
    endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleScroll = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.classList.add('is-scrolling');
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => el.classList.remove('is-scrolling'), 1000);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col px-0">
      <div className="mb-1 flex items-center justify-between gap-1.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t(lang, 'chatboxTitle')}
        </div>
        {lastUserQuestion && (
          <div className="max-w-[68%] truncate rounded-full bg-tng-blue/10 px-2 py-0.5 text-[10px] font-semibold text-tng-blue">
            {lastUserQuestion}
          </div>
        )}
      </div>
      <div ref={listRef} onScroll={handleScroll} className="chat-scroll flex-1 space-y-1.5 overflow-y-auto rounded-2xl bg-transparent p-0">
        {messages?.length ? messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`rounded-xl px-2.5 py-1.5 leading-snug ${
              m.role === 'user'
                ? 'ml-auto max-w-[88%] bg-tng-blue text-xs text-white sm:text-sm'
                : 'mr-auto w-full rounded-2xl border border-tng-blue/25 bg-white px-2.5 py-2 text-base font-bold leading-tight text-slate-800 shadow-sm sm:px-3 sm:py-2.5 sm:text-xl'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-tng-blue/70 sm:text-xs">
                Assistant reply
              </div>
            )}
            {m.text}
          </div>
        )) : (
          <div className="rounded-2xl border border-tng-blue/20 bg-white px-3 py-3 shadow-sm">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-tng-blue/60">
              Welcome to TalknGo
            </div>
            <p className="text-sm font-semibold leading-snug text-slate-700">
              👋 Hi! I'm your voice assistant.
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-base leading-none">🎙️</span>
                <span><strong>Hold</strong> the purple button below and speak your request.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-base leading-none">💬</span>
                <span>Try saying: <em>"What's my balance?"</em>, <em>"Pay RM 5 to Grab"</em>, or <em>"Reload RM 50"</em>.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-base leading-none">📢</span>
                <span>Tap <strong>Deals</strong> to see today's promotions.</span>
              </li>
            </ul>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

export default function QuickModeHome({
  balance,
  refreshing,
  lang,
  onRefresh,
  onPay,
  onDeals,
  onVoice,
  onFamily,
  onVoiceMode,
  onHelp,
  chatMessages,
  voiceBusy,
  onVoiceCaptured,
}) {
  return (
    <div className="phone-frame flex flex-col">
      <div className="bg-tng-blue pb-0.5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <HeaderBar lang={lang} />
        <div className="mt-0.5">
          <BalanceCard
            balance={balance}
            lang={lang}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-4 pt-2.5 sm:px-5 sm:pt-4">
        <div className="min-h-0 flex-1">
          <ChatBox
            lang={lang}
            messages={chatMessages}
          />
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <ActionTile
            onClick={onDeals}
            icon="📢"
            iconBg="#fef3c7"
            color="#d97706"
            accent="#f59e0b"
            minHeight={78}
            label={t(lang, 'deals')}
            hint={t(lang, 'dealsHint')}
          />
          <ActionTile
            onClick={onFamily}
            icon="👨‍👩‍👧"
            iconBg="#fce7f3"
            color="#db2777"
            accent="#db2777"
            minHeight={78}
            label={t(lang, 'family')}
            hint={t(lang, 'familyHint')}
          />
        </div>

        <div className="mb-0.5" />
      </div>

      <div
        className="border-t border-slate-200 bg-white/95 px-3 pt-2 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        <div className="grid grid-cols-2 gap-2">
          <PrimaryBottomAction
            onClick={onPay}
            icon="📷"
            label={t(lang, 'pay')}
            hint={t(lang, 'payHint')}
            bgClass="bg-gradient-to-b from-emerald-500 to-emerald-600"
            ringClass="ring-2 ring-emerald-200"
          />
          <WeChatHoldVoiceButton
            lang={lang}
            onCaptured={onVoiceCaptured}
            disabled={voiceBusy}
          />
        </div>
      </div>
    </div>
  );
}
