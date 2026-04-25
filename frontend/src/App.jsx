import { useState, useCallback } from 'react';
import Header from './components/Header';
import BalanceCard from './components/BalanceCard';
import QuickModeHome from './components/QuickModeHome';
import VoiceRecorder from './components/VoiceRecorder';
import PipelineAnimation from './components/PipelineAnimation';
import AgentResult from './components/AgentResult';
import ThumbprintOverlay from './components/ThumbprintOverlay';
import SuccessScreen from './components/SuccessScreen';
import PromotionsPanel from './components/PromotionsPanel';
import CallHelper from './components/CallHelper';
import CallFamily from './components/CallFamily';
import { sendVoice, getTTS } from './api';

/*
  State machine:
  HOME → LISTENING → THINKING → RESULT → VERIFYING → SUCCESS → HOME
  HOME → PROMOTIONS → HOME
  HOME → HELPER → HOME
  HOME → FAMILY → HOME
*/

export default function App() {
  const BROWSER_TTS_PREF_KEY = 'preferBrowserTTS';
  const [appState, setAppState] = useState('HOME');
  const [language, setLanguage] = useState('en');
  const [agentResult, setAgentResult] = useState(null);
  const [balanceRefresh, setBalanceRefresh] = useState(0);
  const [showThumbprint, setShowThumbprint] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [debugLog, setDebugLog] = useState([]);
  const [showDebug, setShowDebug] = useState(true);
  const [preferBrowserTTS, setPreferBrowserTTS] = useState(() => {
    try {
      return window.localStorage.getItem(BROWSER_TTS_PREF_KEY) === '1';
    } catch {
      return false;
    }
  });

  const enableBrowserTTSMode = () => {
    setPreferBrowserTTS(true);
    try {
      window.localStorage.setItem(BROWSER_TTS_PREF_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  const disableBrowserTTSMode = () => {
    setPreferBrowserTTS(false);
    try {
      window.localStorage.removeItem(BROWSER_TTS_PREF_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const waitForSpeechVoices = (timeoutMs = 1200) => {
    if (!('speechSynthesis' in window)) return Promise.resolve([]);
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) return Promise.resolve(existing);

    return new Promise((resolve) => {
      const onVoicesChanged = () => {
        cleanup();
        resolve(synth.getVoices());
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve(synth.getVoices());
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        synth.removeEventListener('voiceschanged', onVoicesChanged);
      };

      synth.addEventListener('voiceschanged', onVoicesChanged);
    });
  };

  const speakWithBrowser = async (text, langCode) => {
    if (!('speechSynthesis' in window)) {
      return { ok: false, reason: 'speechSynthesis not supported in browser' };
    }
    if (!text?.trim()) {
      return { ok: false, reason: 'empty text' };
    }

    const speechLang = {
      en: 'en-US',
      bm: 'ms-MY',
      zh: 'zh-CN',
    }[langCode] || 'en-US';

    const synth = window.speechSynthesis;
    const voices = await waitForSpeechVoices();
    const voice =
      voices.find((v) => v.lang === speechLang) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(speechLang.split('-')[0].toLowerCase())) ||
      null;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      if (voice) utterance.voice = voice;

      const started = await new Promise((resolve) => {
        let settled = false;
        const settle = (ok, reason) => {
          if (settled) return;
          settled = true;
          resolve({ ok, reason });
        };

        const startTimeout = setTimeout(() => {
          settle(false, 'speech did not start (blocked or unavailable voice engine)');
        }, 2200);

        utterance.onstart = () => {
          clearTimeout(startTimeout);
          settle(true, 'speech started');
        };
        utterance.onerror = (event) => {
          clearTimeout(startTimeout);
          settle(false, event?.error || 'speech synthesis error');
        };

        synth.cancel();
        synth.resume();
        synth.speak(utterance);
      });

      return started;
    } catch (err) {
      return {
        ok: false,
        reason: err?.message || 'speech synthesis failed to initialize',
      };
    }
  };

  const addDebug = (label, data) => {
    const ts = new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugLog((prev) => [...prev, { ts, label, data }]);
  };

  const goHome = () => {
    setAppState('HOME');
    setAgentResult(null);
    setShowThumbprint(false);
    setPipelineStatus('');
    setDebugLog([]);
    setBalanceRefresh((r) => r + 1);
  };

  const handleRecordingComplete = async (audioBlob) => {
    setAppState('THINKING');
    addDebug('Audio Captured', `Type: ${audioBlob.type}, Size: ${(audioBlob.size / 1024).toFixed(1)} KB`);
    setPipelineStatus('Sending audio to server...');

    try {
      addDebug('API Call', `POST /api/voice (lang=${language})`);
      setPipelineStatus('Transcribing your voice...');
      const result = await sendVoice(audioBlob, language);

      addDebug('STT Result', result.transcription || '(empty transcription)');
      if (result.stt) {
        addDebug('STT Mode', result.stt.last_mode_used || '(not set)');
        addDebug('STT Model', result.stt.last_model_used || '(not set)');
        addDebug('STT Fallback', String(Boolean(result.stt.fallback_used)));
        if (result.stt.last_duration_ms != null) {
          addDebug('STT Duration', `${result.stt.last_duration_ms} ms`);
        }
        if (result.stt.last_error) {
          addDebug('STT Last Error', result.stt.last_error);
        }
      }
      addDebug('Agent Action', result.action || 'unknown');
      addDebug('Agent Response', result.text || '(no text)');
      if (result.needs_verification) addDebug('Verification', 'Thumbprint required');
      if (result.error) addDebug('Error', result.error);

      setPipelineStatus('Got response from AI agent');
      setAgentResult(result);

      // Play TTS response
      if (result.text) {
        if (preferBrowserTTS) {
          addDebug('TTS', 'Using browser speech synthesis (cloud TTS disabled)');
          const browserResult = await speakWithBrowser(result.text, language);
          addDebug(
            'TTS Fallback',
            browserResult.ok ? 'Browser speech synthesis started' : `Failed: ${browserResult.reason}`
          );

          if (browserResult.ok) {
            return;
          }

          addDebug('TTS', 'Browser speech failed, retrying cloud TTS once');
        }

        try {
          addDebug('TTS', `Requesting speech for: "${result.text.substring(0, 50)}..."`);
          setPipelineStatus('Generating voice reply...');
          const audioData = await getTTS(result.text, language);
          addDebug('TTS Result', `Audio received: ${(audioData.size / 1024).toFixed(1)} KB`);
          const audioUrl = URL.createObjectURL(audioData);
          const audio = new Audio(audioUrl);
          audio.onended = () => URL.revokeObjectURL(audioUrl);
          audio.onerror = () => URL.revokeObjectURL(audioUrl);
          audio.play().catch(async (playErr) => {
            addDebug('TTS Audio Play Error', playErr?.message || 'Autoplay blocked');
            const browserResult = await speakWithBrowser(result.text, language);
            addDebug(
              'TTS Fallback',
              browserResult.ok ? 'Browser speech synthesis started' : `Failed: ${browserResult.reason}`
            );
          });

          if (preferBrowserTTS) {
            disableBrowserTTSMode();
            addDebug('TTS Mode', 'Cloud TTS recovered, browser-only mode disabled');
          }
        } catch (ttsErr) {
          addDebug('TTS Error', ttsErr.message || 'Failed');
          const errorText = String(ttsErr?.response?.data || ttsErr?.message || '');
          if (
            ttsErr?.response?.status === 500 ||
            errorText.includes('Model not found') ||
            errorText.includes('ModelNotFound')
          ) {
            enableBrowserTTSMode();
            addDebug('TTS Mode', 'Cloud TTS unavailable, switching to browser TTS');
          }
          const browserResult = await speakWithBrowser(result.text, language);
          addDebug(
            'TTS Fallback',
            browserResult.ok ? 'Browser speech synthesis started' : `Failed: ${browserResult.reason}`
          );

          if (!browserResult.ok) {
            addDebug('TTS Hint', 'Tap "Read Aloud" in the result card to trigger speech manually');
          }
        }
      }
    } catch (err) {
      const backendData = err?.response?.data;
      const backendMessage = backendData?.error || backendData?.text;
      addDebug('Request Error', backendMessage || err.message || 'Unknown error');
      if (backendData?.stt) {
        addDebug('STT Mode', backendData.stt.last_mode_used || '(not set)');
        addDebug('STT Model', backendData.stt.last_model_used || '(not set)');
        addDebug('STT Fallback', String(Boolean(backendData.stt.fallback_used)));
        if (backendData.stt.last_duration_ms != null) {
          addDebug('STT Duration', `${backendData.stt.last_duration_ms} ms`);
        }
        if (backendData.stt.last_error) {
          addDebug('STT Last Error', backendData.stt.last_error);
        }
      }
      if (backendData) addDebug('Backend Payload', backendData);
      setPipelineStatus('Error: ' + (backendMessage || err.message || 'Request failed'));
      setAgentResult({
        success: false,
        text: backendData?.text || "Something went wrong. Please check your API key and try again.",
        action: 'error',
        needs_verification: false,
        error: backendMessage || err.message,
      });
    }
  };

  const handleReplaySpeech = async () => {
    if (!agentResult?.text) return;
    const browserResult = await speakWithBrowser(agentResult.text, language);
    addDebug(
      'Manual TTS',
      browserResult.ok ? 'Browser speech synthesis started' : `Failed: ${browserResult.reason}`
    );
  };

  const handlePipelineComplete = useCallback(() => {
    if (agentResult) {
      setAppState('RESULT');
    }
  }, [agentResult]);

  const handleVerify = () => {
    setShowThumbprint(true);
  };

  const handleVerified = () => {
    setShowThumbprint(false);
    setAppState('SUCCESS');
  };

  const handleRecordCancel = (reason) => {
    if (reason === 'microphone_denied') {
      setAgentResult({
        success: false,
        text: 'Microphone access was denied. Please allow microphone access and try again.',
        action: 'error',
        needs_verification: false,
      });
      setAppState('RESULT');
    } else {
      goHome();
    }
  };

  const renderScreen = () => {
    switch (appState) {
      case 'HOME':
        return (
          <>
            <BalanceCard onRefresh={balanceRefresh} />
            <QuickModeHome setAppState={setAppState} />
          </>
        );

      case 'LISTENING':
        return (
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={handleRecordCancel}
          />
        );

      case 'THINKING':
        return <PipelineAnimation onComplete={handlePipelineComplete} statusText={pipelineStatus} />;

      case 'RESULT':
        return (
          <AgentResult
            data={agentResult}
            onVerify={handleVerify}
            onReplaySpeech={handleReplaySpeech}
            onDone={goHome}
          />
        );

      case 'SUCCESS':
        return <SuccessScreen data={agentResult} onDone={goHome} />;

      case 'PROMOTIONS':
        return <PromotionsPanel onBack={goHome} />;

      case 'HELPER':
        return <CallHelper onBack={goHome} />;

      case 'FAMILY':
        return <CallFamily onBack={goHome} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header language={language} setLanguage={setLanguage} />

      {/* Main content + debug side-by-side */}
      <div className="flex-1 flex relative">
        {/* App screen */}
        <div className={`flex-1 relative ${showDebug && debugLog.length > 0 ? '' : ''}`}>
          {renderScreen()}
        </div>

        {/* Debug panel - shows when there are logs */}
        {debugLog.length > 0 && showDebug && (
          <div className="w-96 shrink-0 bg-gray-900 text-green-400 font-mono text-sm p-4 overflow-y-auto max-h-[calc(100vh-120px)] border-l-2 border-green-500/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-green-300 font-bold text-base">DEBUG LOG</p>
              <button
                onClick={() => setShowDebug(false)}
                className="text-gray-500 hover:text-gray-300 text-xs cursor-pointer"
              >
                [hide]
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {debugLog.map((entry, i) => (
                <div key={i} className="border-b border-gray-700 pb-2">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 text-xs shrink-0">{entry.ts}</span>
                    <span className="text-yellow-400 font-bold text-xs shrink-0">[{entry.label}]</span>
                  </div>
                  <p className="text-green-300 mt-0.5 break-all text-xs leading-relaxed pl-2">
                    {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show debug toggle when hidden */}
        {debugLog.length > 0 && !showDebug && (
          <button
            onClick={() => setShowDebug(true)}
            className="fixed bottom-4 right-4 bg-gray-900 text-green-400 px-4 py-2 rounded-lg font-mono text-sm shadow-lg border border-green-500/30 cursor-pointer hover:bg-gray-800 z-50"
          >
            Show Debug ({debugLog.length})
          </button>
        )}
      </div>

      {/* Thumbprint overlay */}
      {showThumbprint && <ThumbprintOverlay onVerified={handleVerified} />}
    </div>
  );
}
