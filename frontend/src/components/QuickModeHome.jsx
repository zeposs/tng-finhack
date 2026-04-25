import React from 'react';
import Logo from './Logo.jsx';
import { t } from '../state/strings.js';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';

function HeaderBar({ onVoiceMode, onHelp, lang }) {
  return (
    <div className="flex items-start justify-between px-5 pt-5">
      <button
        onClick={onVoiceMode}
        className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur active:scale-95"
        aria-label={t(lang, 'voiceMode')}
      >
        <span className="text-xl leading-none">🔊</span>
        <span className="leading-tight text-left">
          {t(lang, 'voiceMode').split(' ').map((w, i) => (
            <span key={i} className="block text-[11px]">{w}</span>
          ))}
        </span>
      </button>

      <Logo size={64} />

      <button
        onClick={onHelp}
        className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur active:scale-95"
        aria-label={t(lang, 'help')}
      >
        <span className="text-xl leading-none">❓</span>
        <span className="text-[13px]">{t(lang, 'help')}</span>
      </button>
    </div>
  );
}

function BalanceCard({ balance, lang, refreshing, onRefresh }) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <div className="px-5 pb-5 text-white">
      <div className="text-base font-semibold opacity-90">{t(lang, 'myBalance')}</div>
      <div className="mt-1 text-5xl font-extrabold tracking-tight">
        RM {Number(balance ?? 0).toFixed(2)}
      </div>
      <button
        onClick={onRefresh}
        className="mt-1 flex items-center gap-1 text-sm opacity-90 active:opacity-60"
      >
        <span>{t(lang, 'lastUpdated')}: {hh}:{mm}</span>
        <span className={refreshing ? 'animate-spin' : ''}>↻</span>
      </button>
    </div>
  );
}

function ActionTile({ onClick, icon, iconBg, label, hint, color, accent }) {
  return (
    <button
      onClick={onClick}
      className="qm-btn bg-white"
      style={{ border: `2px solid ${accent}22` }}
    >
      <div className="qm-btn-icon" style={{ background: iconBg, color }}>
        {icon}
      </div>
      <div className="text-2xl font-extrabold" style={{ color }}>{label}</div>
      <div className="text-[13px] font-medium leading-tight text-slate-500">
        {hint}
      </div>
    </button>
  );
}

function PrimaryBottomAction({ onClick, icon, label, hint, bgClass, ringClass }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[112px] w-full flex-col items-center justify-center rounded-3xl px-3 py-3 text-center shadow-soft transition active:scale-[0.97] sm:min-h-[132px] sm:px-4 sm:py-4 ${bgClass} ${ringClass}`}
    >
      <div className="text-3xl leading-none sm:text-4xl">{icon}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:mt-2 sm:text-3xl">{label}</div>
      <div className="mt-1 text-xs font-medium text-white/90 leading-snug sm:text-sm">{hint}</div>
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
        className={`flex min-h-[112px] w-full select-none flex-col items-center justify-center rounded-3xl px-3 py-3 text-center shadow-soft transition sm:min-h-[132px] sm:px-4 sm:py-4 ${
          recording
            ? 'scale-[0.98] bg-gradient-to-b from-red-500 to-red-600 ring-2 ring-red-200'
            : 'active:scale-[0.97] bg-gradient-to-b from-violet-500 to-violet-600 ring-2 ring-violet-200'
        } ${disabled || blocked ? 'cursor-not-allowed opacity-70' : ''}`}
      >
        <div className="text-3xl leading-none sm:text-4xl">{recording ? '🔴' : '🎙️'}</div>
        <div className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:mt-2 sm:text-3xl">{t(lang, 'voice')}</div>
        <div className="mt-1 text-xs font-medium leading-snug text-white/90 sm:text-sm">
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

function ChatBox({ lang, messages, onSubmit, busy }) {
  const [text, setText] = React.useState('');

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        {t(lang, 'chatboxTitle')}
      </div>
      <div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-2">
        {messages?.length ? messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-snug ${
              m.role === 'user'
                ? 'ml-auto bg-tng-blue text-white'
                : 'mr-auto bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {m.text}
          </div>
        )) : (
          <div className="text-sm text-slate-500">{t(lang, 'chatboxPlaceholder')}</div>
        )}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const msg = text.trim();
          if (!msg) return;
          onSubmit(msg);
          setText('');
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(lang, 'typeMessage')}
          className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:border-tng-blue focus:outline-none"
        />
        <button
          disabled={busy}
          className={`rounded-xl px-3 py-2 text-sm font-bold text-white ${
            busy ? 'bg-slate-400' : 'bg-tng-blue active:scale-95'
          }`}
          type="submit"
        >
          {busy ? t(lang, 'thinking') : t(lang, 'send')}
        </button>
      </form>
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
  onHelper,
  onFamily,
  onVoiceMode,
  onHelp,
  chatMessages,
  voiceBusy,
  onVoiceCaptured,
  onChatSubmit,
}) {
  return (
    <div className="phone-frame flex flex-col">
      <div className="bg-tng-blue rounded-b-[36px] pb-3" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <HeaderBar onVoiceMode={onVoiceMode} onHelp={onHelp} lang={lang} />
        <div className="mt-1">
          <BalanceCard
            balance={balance}
            lang={lang}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4">
        <ChatBox
          lang={lang}
          messages={chatMessages}
          onSubmit={onChatSubmit}
          busy={voiceBusy}
        />

        <div className="h-4" />

        <div className="grid grid-cols-2 gap-4">
          <ActionTile
            onClick={onDeals}
            icon="📢"
            iconBg="#fef3c7"
            color="#d97706"
            accent="#f59e0b"
            label={t(lang, 'deals')}
            hint={t(lang, 'dealsHint')}
          />
          <ActionTile
            onClick={onHelper}
            icon="📞"
            iconBg="#dbeafe"
            color="#1652A1"
            accent="#1652A1"
            label={t(lang, 'helper')}
            hint={t(lang, 'helperHint')}
          />
        </div>

        <div className="pt-4">
          <button
            onClick={onFamily}
            className="qm-btn w-full flex-row gap-4 bg-white"
            style={{ minHeight: 104, border: '2px solid #fbcfe822' }}
          >
            <div className="qm-btn-icon" style={{ background: '#fce7f3', color: '#db2777' }}>
              👨‍👩‍👧
            </div>
            <div className="flex flex-col items-start">
              <div className="text-2xl font-extrabold text-pink-600">
                {t(lang, 'family')}
              </div>
              <div className="text-[13px] font-medium text-slate-500">
                {t(lang, 'familyHint')}
              </div>
            </div>
          </button>
        </div>

        <div className="mb-4" />
      </div>

      <div
        className="border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
          {t(lang, 'quickActions')}
        </div>
        <div className="grid grid-cols-2 gap-3">
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
