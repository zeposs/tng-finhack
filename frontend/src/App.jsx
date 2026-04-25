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

import {
  fetchBalance,
  sendVoice,
  sendText,
  commitPayment,
  commitTopup,
  speak,
} from './state/api.js';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';

const STATE = Object.freeze({
  HOME:        'HOME',
  PAY:         'PAY',
    SCANNER:     'SCANNER',
  LISTENING:   'LISTENING',
  THINKING:    'THINKING',
  RESULT:      'RESULT',
  VERIFYING:   'VERIFYING',
  SUCCESS:     'SUCCESS',
  PROMOTIONS:  'PROMOTIONS',
  BALANCE:     'BALANCE',
  HELPER:      'HELPER',
  FAMILY:      'FAMILY',
});

export default function App() {
  const [appState, setAppState] = useState(STATE.HOME);
  const lang = 'en';
  const [balance, setBalance] = useState(250.0);
  const [refreshing, setRefreshing] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [paymentPrefill, setPaymentPrefill] = useState({ amount: 0, merchant: '' });
  const [homeChat, setHomeChat] = useState([
    { role: 'assistant', text: 'Hi! Hold the Voice button and speak. I can help check balance, pay, or top up.' },
  ]);
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
    if (speech) appendHomeChat('assistant', speech);

    if (result?.tool === 'check_balance' && typeof result?.payload?.balance === 'number') {
      setBalance(result.payload.balance);
    }

    if (result?.tool === 'make_payment' && result?.payload?.next_screen === 'scanner') {
      const amount = Number(result?.payload?.prefill?.amount ?? result?.payload?.amount ?? 0);
      const merchant = String(result?.payload?.prefill?.merchant ?? result?.payload?.merchant ?? '').trim();
      setPaymentPrefill({
        amount: Number.isFinite(amount) ? amount : 0,
        merchant,
      });
      setAppState(STATE.SCANNER);
    }
  }, [appendHomeChat]);

  const proceedManualPayment = useCallback(
    ({ amount, merchant }) => {
      const safeAmount = Number(amount);
      const safeMerchant = (merchant || 'Merchant').trim() || 'Merchant';
      if (!Number.isFinite(safeAmount) || safeAmount <= 0) return;

      const result = {
        tool: 'make_payment',
        text: `Pay RM ${safeAmount.toFixed(2)} to ${safeMerchant}`,
        language: lang,
        tool_args: { amount: safeAmount, merchant: safeMerchant },
        used_llm: false,
        payload: {
          tool: 'make_payment',
          ok: true,
          amount: safeAmount,
          merchant: safeMerchant,
          requires_verification: true,
          speech: `You want to pay RM ${safeAmount.toFixed(2)} to ${safeMerchant}. Please verify with your thumbprint to confirm.`,
        },
      };
      processAgentResult(result);
    },
    [lang, processAgentResult],
  );

  const handleScannerResult = useCallback((scan) => {
    const merchant = (scan?.merchant || paymentPrefill?.merchant || 'QR Merchant').trim() || 'QR Merchant';
    const amountCandidate = Number(scan?.amount ?? paymentPrefill?.amount ?? 0);
    const amount = Number.isFinite(amountCandidate) && amountCandidate > 0 ? amountCandidate : 18.9;

    const result = {
      tool: 'make_payment',
      text: `Pay RM ${amount.toFixed(2)} to ${merchant}`,
      language: lang,
      tool_args: { amount, merchant },
      used_llm: false,
      payload: {
        tool: 'make_payment',
        ok: true,
        amount,
        merchant,
        requires_verification: true,
        speech: `Merchant scanned. You are paying RM ${amount.toFixed(2)} to ${merchant}. Please verify with your thumbprint to confirm.`,
      },
    };
    processAgentResult(result);
  }, [lang, paymentPrefill?.amount, paymentPrefill?.merchant, processAgentResult]);

  const handleAudioCaptured = useCallback(
    async (blob) => {
      setAppState(STATE.THINKING);
      try {
        const result = await sendVoice(blob, lang);
        processAgentResult(result);
      } catch (err) {
        console.warn('Voice request failed:', err);
        setAgentResult({
          tool: 'unknown',
          text: '',
          language: lang,
          payload: {
            tool: 'unknown',
            ok: false,
            speech: 'Sorry, I could not reach the assistant. Please try again.',
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
        appendHomeChat('assistant', 'Sorry, I could not hear that. Please try again.');
      } finally {
        setHomeVoiceBusy(false);
      }
    },
    [appendHomeChat, lang, processHomeResult],
  );

  const handleHomeTextSubmit = useCallback(
    async (text) => {
      const msg = text?.trim();
      if (!msg) return;
      appendHomeChat('user', msg);
      setHomeVoiceBusy(true);
      try {
        const result = await sendText(msg, lang);
        processHomeResult(result);
      } catch (err) {
        console.warn('Home text request failed:', err);
        appendHomeChat('assistant', 'Sorry, I could not process that now. Please try again.');
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
        const res = await commitPayment(amount, merchant);
        setSuccessData({ kind: 'payment', amount, merchant, balance: res?.balance_after });
        if (typeof res?.balance_after === 'number') setBalance(res.balance_after);
        speakResponse(res?.speech);
        setAppState(STATE.SUCCESS);
        return;
      }
      if (tool === 'top_up_wallet') {
        const amount = Number(tool_args.amount ?? payload.amount ?? 0);
        const res = await commitTopup(amount);
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
      case STATE.HELPER:
        return <CallScreen lang={lang} kind="helper" onBack={goHome} />;
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
            onPay={() => setAppState(STATE.PAY)}
            onDeals={() => setAppState(STATE.PROMOTIONS)}
            onVoice={() => {}}
            onHelper={() => setAppState(STATE.HELPER)}
            onFamily={() => setAppState(STATE.FAMILY)}
            onVoiceMode={() => setAppState(STATE.LISTENING)}
            onHelp={() => setAppState(STATE.HELPER)}
            chatMessages={homeChat}
            voiceBusy={homeVoiceBusy}
            onVoiceCaptured={handleHomeVoiceCaptured}
            onChatSubmit={handleHomeTextSubmit}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen items-stretch justify-center bg-slate-200">
      {renderState()}
    </div>
  );
}
