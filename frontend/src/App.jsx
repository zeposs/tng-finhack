import React, { useCallback, useEffect, useState } from 'react';

import QuickModeHome from './components/QuickModeHome.jsx';
import VoiceRecorder from './components/VoiceRecorder.jsx';
import PipelineAnimation from './components/PipelineAnimation.jsx';
import AgentResult from './components/AgentResult.jsx';
import ThumbprintOverlay from './components/ThumbprintOverlay.jsx';
import SuccessScreen from './components/SuccessScreen.jsx';
import PaymentPanel from './components/PaymentPanel.jsx';
import ScannerScreen from './components/ScannerScreen.jsx';
import PromotionsPanel from './components/PromotionsPanel.jsx';
import BalanceDisplay from './components/BalanceDisplay.jsx';
import CallScreen from './components/CallScreen.jsx';
import AmountVoiceScreen from './components/AmountVoiceScreen.jsx';

import {
  fetchBalance,
  sendVoice,
  sendText,
  commitPayment,
  commitTopup,
  phraseReply,
  speak,
} from './state/api.js';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';

const STATE = Object.freeze({
  HOME:        'HOME',
  PAY:         'PAY',
  SCANNER:     'SCANNER',
  AMOUNT_VOICE:'AMOUNT_VOICE',
  LISTENING:   'LISTENING',
  THINKING:    'THINKING',
  RESULT:      'RESULT',
  VERIFYING:   'VERIFYING',
  SUCCESS:     'SUCCESS',
  PROMOTIONS:  'PROMOTIONS',
  BALANCE:     'BALANCE',
  FAMILY:      'FAMILY',
});

export default function App() {
  const [appState, setAppState] = useState(STATE.HOME);
  /** English only: passed to /api/voice and /api/agent as language (STT language_hints + agent). */
  const lang = 'en';
  const [balance, setBalance] = useState(250.0);
  const [refreshing, setRefreshing] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [paymentPrefill, setPaymentPrefill] = useState({ amount: 0, merchant: '' });
  const [scannerSource, setScannerSource] = useState('generic');
  const [pendingScan, setPendingScan] = useState(null);
  const [amountVoiceBusy, setAmountVoiceBusy] = useState(false);
  const [amountVoiceError, setAmountVoiceError] = useState('');

  const parseAmountFromSpeechText = useCallback((text) => {
    if (!text) return NaN;
    const raw = String(text).toLowerCase().replace(/,/g, '');
    const digitMatch = raw.match(/(?:rm|myr|\$)?\s*(\d+(?:\.\d{1,2})?)/i);
    if (digitMatch?.[1]) {
      const n = Number(digitMatch[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const words = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
      ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
      seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
      sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    };
    const parseWord = (tok) => {
      const t = tok.trim().toLowerCase();
      if (words[t] !== undefined) return words[t];
      const hy = t.split('-');
      if (hy.length === 2 && words[hy[0]] !== undefined && words[hy[1]] !== undefined) {
        return words[hy[0]] + words[hy[1]];
      }
      return null;
    };
    const ringgit = raw.match(/\b([a-z-]+)\s+ringgit\s+([a-z-]+)\b/);
    if (ringgit) {
      const whole = parseWord(ringgit[1]);
      const cents = parseWord(ringgit[2]);
      if (whole != null && cents != null && cents >= 0 && cents < 100) {
        return Number(`${whole}.${String(cents).padStart(2, '0')}`);
      }
      if (whole != null) return whole;
    }
    const point = raw.match(/\b([a-z-]+)\s+point\s+([a-z-]+)\b/);
    if (point) {
      const whole = parseWord(point[1]);
      const frac = parseWord(point[2]);
      if (whole != null && frac != null) {
        if (frac < 10) return Number(`${whole}.0${frac}`);
        if (frac < 100) return Number(`${whole}.${String(frac).padStart(2, '0')}`);
        return whole;
      }
    }
    return NaN;
  }, []);
  const [homeChat, setHomeChat] = useState([]);
  const [homeVoiceBusy, setHomeVoiceBusy] = useState(false);

  const { play: playAudio } = useAudioPlayer();

  const refreshBalance = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchBalance();
      if (typeof data?.balance === 'number') setBalance(data.balance);
    } catch (err) {
      console.warn('Balance fetch failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const speech = await phraseReply(
          '(Quick Mode home opened.)',
          lang,
          { tool: 'welcome_hint', quick_mode: true },
        );
        if (!cancelled && speech) {
          setHomeChat([{ role: 'assistant', text: speech }]);
        }
      } catch {
        /* no API key / phrase — chat stays empty until first voice turn */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Speak the agent's text reply via /api/tts (best effort).
  const speakResponse = useCallback(
    async (text) => {
      if (!text) return;
      try {
        const audio = await speak(text, lang);
        if (audio?.audio_b64) playAudio(audio.audio_b64, audio.mime || 'audio/mpeg');
      } catch (err) {
        console.warn('TTS failed:', err);
      }
    },
    [lang, playAudio],
  );

  const processAgentResult = useCallback(
    (result) => {
      setAgentResult(result);
      setAppState(STATE.RESULT);
      const speech = result?.payload?.speech;
      if (speech) speakResponse(speech);
    },
    [speakResponse],
  );

  const appendHomeChat = useCallback((role, text) => {
    if (!text) return;
    setHomeChat((prev) => [...prev.slice(-11), { role, text }]);
  }, []);

  const processHomeResult = useCallback((result) => {
    const userText = result?.text?.trim();
    const speech = result?.payload?.speech?.trim();
    if (userText) appendHomeChat('user', userText);

    // Tools that need thumbprint verification → hand off to the full agent flow.
    // This covers top_up_wallet and any other tool with requires_verification: true.
    if (result?.payload?.requires_verification) {
      if (speech) {
        appendHomeChat('assistant', speech);
        speakResponse(speech);
      }
      processAgentResult(result);
      return;
    }

    if (speech) {
      appendHomeChat('assistant', speech);
      speakResponse(speech);
    }

    // Update balance from any tool that returns a current or post-transaction balance.
    const newBal = result?.payload?.balance_after ?? result?.payload?.balance;
    if (typeof newBal === 'number' && newBal >= 0) {
      setBalance(newBal);
    }

    if (result?.tool === 'make_payment' && result?.payload?.next_screen === 'scanner') {
      const amount = Number(result?.payload?.prefill?.amount ?? result?.payload?.amount ?? 0);
      const merchant = String(result?.payload?.prefill?.merchant ?? result?.payload?.merchant ?? '').trim();
      setPaymentPrefill({
        amount: Number.isFinite(amount) ? amount : 0,
        merchant,
      });
      setScannerSource('agent');
      setAppState(STATE.SCANNER);
    }
  }, [appendHomeChat, processAgentResult, speakResponse]);

  const proceedManualPayment = useCallback(
    async ({ amount, merchant }) => {
      const safeAmount = Number(amount);
      const safeMerchant = (merchant || 'Merchant').trim() || 'Merchant';
      if (!Number.isFinite(safeAmount) || safeAmount <= 0) return;

      const payload = {
        tool: 'make_payment',
        ok: true,
        amount: safeAmount,
        merchant: safeMerchant,
        balance_before: balance,
        requires_verification: true,
      };
      let speech = '';
      try {
        speech = await phraseReply(
          `User chose to pay RM ${safeAmount.toFixed(2)} to ${safeMerchant}.`,
          lang,
          payload,
        );
      } catch (err) {
        console.warn('phraseReply failed:', err);
      }

      const result = {
        tool: 'make_payment',
        text: `Pay RM ${safeAmount.toFixed(2)} to ${safeMerchant}`,
        language: lang,
        tool_args: { amount: safeAmount, merchant: safeMerchant },
        used_llm: true,
        payload: { ...payload, speech },
      };
      processAgentResult(result);
    },
    [balance, lang, processAgentResult],
  );

  const proceedScannedPayment = useCallback(
    async (merchant, amount) => {
      const finalMerchant = (merchant || paymentPrefill?.merchant || 'QR Merchant').trim() || 'QR Merchant';
      const finalAmount = Number(amount);
      if (!Number.isFinite(finalAmount) || finalAmount <= 0) return;

      const payload = {
        tool: 'make_payment',
        ok: true,
        amount: finalAmount,
        merchant: finalMerchant,
        balance_before: balance,
        requires_verification: true,
      };
      let speech = '';
      try {
        speech = await phraseReply(
          `QR scanned: pay RM ${finalAmount.toFixed(2)} to ${finalMerchant}.`,
          lang,
          payload,
        );
      } catch (err) {
        console.warn('phraseReply failed:', err);
      }

      const result = {
        tool: 'make_payment',
        text: `Pay RM ${finalAmount.toFixed(2)} to ${finalMerchant}`,
        language: lang,
        tool_args: { amount: finalAmount, merchant: finalMerchant },
        used_llm: true,
        payload: { ...payload, speech },
      };
      processAgentResult(result);
    },
    [balance, lang, paymentPrefill?.merchant, processAgentResult],
  );

  const handleScannerResult = useCallback((scan) => {
    const merchant = (scan?.merchant || paymentPrefill?.merchant || 'QR Merchant').trim() || 'QR Merchant';
    const amountCandidate = Number(scan?.amount ?? paymentPrefill?.amount ?? 0);
    const hasAmount = Number.isFinite(amountCandidate) && amountCandidate > 0;

    if (scannerSource === 'pay_button' && !hasAmount) {
      setPendingScan({ merchant, raw: String(scan?.raw || '') });
      setAmountVoiceError('');
      setAppState(STATE.AMOUNT_VOICE);
      return;
    }

    void proceedScannedPayment(merchant, amountCandidate);
  }, [paymentPrefill?.amount, paymentPrefill?.merchant, proceedScannedPayment, scannerSource]);

  const handleAmountVoiceCaptured = useCallback(async (blob) => {
    if (!pendingScan) return;
    setAmountVoiceBusy(true);
    setAmountVoiceError('');
    try {
      const result = await sendVoice(blob, lang);
      const stt = result?.stt;
      if (stt?.error) {
        setAmountVoiceError(String(stt.error));
        return;
      }
      // Backend labels DashScope ASR as qwen_stt; allow missing provider if transcript exists.
      if (stt?.provider && stt.provider !== 'qwen_stt') {
        setAmountVoiceError('Voice provider mismatch. Please try again.');
        return;
      }

      // Prioritize the recognized Qwen STT transcript for amount extraction.
      const amountFromSttText = parseAmountFromSpeechText(stt?.text);
      const fromAgent =
        result?.tool_args?.amount ?? result?.payload?.amount ?? result?.intent_hint?.amount ?? NaN;
      const amountCandidate = Number(
        Number.isFinite(amountFromSttText) && amountFromSttText > 0
          ? amountFromSttText
          : fromAgent,
      );
      if (!Number.isFinite(amountCandidate) || amountCandidate <= 0) {
        setAmountVoiceError('Could not get amount. Please say: RM 12.50');
        return;
      }
      void proceedScannedPayment(pendingScan.merchant, amountCandidate);
    } catch (err) {
      console.warn('Amount voice request failed:', err);
      setAmountVoiceError('Could not capture amount. Please try again.');
    } finally {
      setAmountVoiceBusy(false);
    }
  }, [lang, parseAmountFromSpeechText, pendingScan, proceedScannedPayment]);

  const handleAudioCaptured = useCallback(
    async (blob) => {
      setAppState(STATE.THINKING);
      try {
        const result = await sendVoice(blob, lang);
        processAgentResult(result);
      } catch (err) {
        console.warn('Voice request failed:', err);
        let speech = '';
        try {
          speech = await phraseReply('Voice request failed.', lang, {
            tool: 'unknown',
            ok: false,
            reason: 'assistant_unreachable',
          });
        } catch (_) {
          /* ignore */
        }
        setAgentResult({
          tool: 'unknown',
          text: '',
          language: lang,
          payload: {
            tool: 'unknown',
            ok: false,
            reason: 'assistant_unreachable',
            speech,
            requires_verification: false,
          },
        });
        setAppState(STATE.RESULT);
      }
    },
    [lang, processAgentResult],
  );

  const handleTextSubmit = useCallback(
    async (text) => {
      setAppState(STATE.THINKING);
      try {
        const result = await sendText(text, lang);
        processAgentResult(result);
      } catch (err) {
        console.warn('Text agent request failed:', err);
        setAppState(STATE.HOME);
      }
    },
    [lang, processAgentResult],
  );

  const handleHomeVoiceCaptured = useCallback(
    async (blob) => {
      setHomeVoiceBusy(true);
      try {
        const result = await sendVoice(blob, lang);
        processHomeResult(result);
      } catch (err) {
        console.warn('Home voice request failed:', err);
        try {
          const speech = await phraseReply('Home voice request failed.', lang, {
            tool: 'unknown',
            ok: false,
            reason: 'assistant_unreachable',
          });
          if (speech) appendHomeChat('assistant', speech);
        } catch (_) {
          /* no phrase without API */
        }
      } finally {
        setHomeVoiceBusy(false);
      }
    },
    [appendHomeChat, lang, processHomeResult],
  );

  const handleApprove = useCallback(() => {
    if (!agentResult) {
      setAppState(STATE.HOME);
      return;
    }
    if (agentResult.payload?.requires_verification) {
      setAppState(STATE.VERIFYING);
    } else {
      // Just close the result for non-transactional actions (e.g. balance).
      setAppState(STATE.HOME);
      refreshBalance();
    }
  }, [agentResult, refreshBalance]);

  const handleVerified = useCallback(async () => {
    if (!agentResult) {
      setAppState(STATE.HOME);
      return;
    }
    const { tool, tool_args = {}, payload = {} } = agentResult;
    try {
      if (tool === 'make_payment') {
        const amount = Number(tool_args.amount ?? payload.amount ?? 0);
        const merchant = tool_args.merchant || payload.merchant || 'Merchant';
        const res = await commitPayment(amount, merchant, lang);
        setSuccessData({ kind: 'payment', amount, merchant, balance: res?.balance_after });
        if (typeof res?.balance_after === 'number') setBalance(res.balance_after);
        speakResponse(res?.speech);
        setAppState(STATE.SUCCESS);
        return;
      }
      if (tool === 'top_up_wallet') {
        const amount = Number(tool_args.amount ?? payload.amount ?? 0);
        const res = await commitTopup(amount, lang);
        setSuccessData({ kind: 'topup', amount, balance: res?.balance_after });
        if (typeof res?.balance_after === 'number') setBalance(res.balance_after);
        speakResponse(res?.speech);
        setAppState(STATE.SUCCESS);
        return;
      }
    } catch (err) {
      console.warn('Commit failed:', err);
    }
    setAppState(STATE.HOME);
    refreshBalance();
  }, [agentResult, refreshBalance, speakResponse]);

  const goHome = useCallback(() => {
    setAgentResult(null);
    setSuccessData(null);
    setPendingScan(null);
    setScannerSource('generic');
    setAmountVoiceError('');
    setAmountVoiceBusy(false);
    setAppState(STATE.HOME);
    refreshBalance();
  }, [refreshBalance]);

  const renderState = () => {
    switch (appState) {
      case STATE.PAY:
        return (
          <PaymentPanel
            lang={lang}
            onBack={goHome}
            onProceed={proceedManualPayment}
          />
        );
      case STATE.LISTENING:
        return (
          <VoiceRecorder
            lang={lang}
            onAudioCaptured={handleAudioCaptured}
            onTextSubmit={handleTextSubmit}
            onCancel={goHome}
          />
        );
      case STATE.SCANNER:
        return (
          <ScannerScreen
            lang={lang}
            prefill={paymentPrefill}
            onBack={goHome}
            onScanned={handleScannerResult}
          />
        );
      case STATE.AMOUNT_VOICE:
        return (
          <AmountVoiceScreen
            lang={lang}
            merchant={pendingScan?.merchant || paymentPrefill?.merchant || 'QR Merchant'}
            busy={amountVoiceBusy}
            errorText={amountVoiceError}
            onBack={() => setAppState(STATE.SCANNER)}
            onVoiceCaptured={handleAmountVoiceCaptured}
          />
        );
      case STATE.THINKING:
        return <PipelineAnimation lang={lang} />;
      case STATE.RESULT:
        return (
          <AgentResult
            lang={lang}
            result={agentResult}
            onApprove={handleApprove}
            onCancel={goHome}
          />
        );
      case STATE.VERIFYING:
        return (
          <ThumbprintOverlay
            lang={lang}
            onVerified={handleVerified}
            onCancel={goHome}
          />
        );
      case STATE.SUCCESS:
        return (
          <SuccessScreen
            lang={lang}
            kind={successData?.kind}
            amount={successData?.amount}
            merchant={successData?.merchant}
            balance={successData?.balance}
            onDone={goHome}
          />
        );
      case STATE.PROMOTIONS:
        return <PromotionsPanel lang={lang} onBack={goHome} />;
      case STATE.BALANCE:
        return <BalanceDisplay lang={lang} balance={balance} onBack={goHome} />;
      case STATE.FAMILY:
        return <CallScreen lang={lang} kind="family" onBack={goHome} />;
      case STATE.HOME:
      default:
        return (
          <QuickModeHome
            balance={balance}
            refreshing={refreshing}
            lang={lang}
            onRefresh={refreshBalance}
            onPay={() => {
              setPaymentPrefill({ amount: 0, merchant: '' });
              setScannerSource('pay_button');
              setPendingScan(null);
              setAmountVoiceError('');
              setAppState(STATE.SCANNER);
            }}
            onDeals={() => setAppState(STATE.PROMOTIONS)}
            onVoice={() => {}}
            onFamily={() => setAppState(STATE.FAMILY)}
            onVoiceMode={() => setAppState(STATE.LISTENING)}
            onHelp={() => setAppState(STATE.FAMILY)}
            chatMessages={homeChat}
            voiceBusy={homeVoiceBusy}
            onVoiceCaptured={handleHomeVoiceCaptured}
          />
        );
    }
  };

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-slate-900 overflow-hidden">
      {renderState()}
    </div>
  );
}
