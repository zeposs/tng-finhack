import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import QuickModeHome from './components/QuickModeHome'
import VoiceRecorder from './components/VoiceRecorder'
import PipelineAnimation from './components/PipelineAnimation'
import AgentResult from './components/AgentResult'
import ThumbprintOverlay from './components/ThumbprintOverlay'
import SuccessScreen from './components/SuccessScreen'
import PromotionsPanel from './components/PromotionsPanel'
import BalanceDisplay from './components/BalanceDisplay'
import CallHelper from './components/CallHelper'
import './App.css'

function App() {
  const [appState, setAppState] = useState('HOME')
  const [agentResult, setAgentResult] = useState(null)
  const [language, setLanguage] = useState('en')
  const [transcription, setTranscription] = useState('')
  const [error, setError] = useState(null)
  const [balance, setBalance] = useState(250.00)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const fetchBalance = useCallback(async () => {
    try {
      const res = await axios.get('/api/balance')
      setBalance(res.data.balance)
    } catch {
      // keep default
    }
  }, [])

  const handleVoiceStart = async () => {
    setAppState('LISTENING')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const audioBase64 = reader.result.split(',')[1]
          try {
            setAppState('THINKING')
            const voiceRes = await axios.post('/api/voice', {
              audio: audioBase64,
              language
            })
            const { intent, transcription: trans } = voiceRes.data
            setTranscription(trans)

            const agentRes = await axios.post('/api/agent', { intent })
            setAgentResult(agentRes.data)
            setAppState('RESULT')

            if (agentRes.data.requires_verify) {
              setTimeout(() => setAppState('VERIFYING'), 2000)
            }
          } catch (err) {
            setError("I didn't catch that. Please try again.")
            setAppState('HOME')
          }
        }
        reader.readAsDataURL(audioBlob)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorderRef.current.start()
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, 5000)
    } catch {
      setError('Microphone access denied. Please allow microphone access.')
      setAppState('HOME')
    }
  }

  const handleThumbprintVerify = async () => {
    try {
      const verifyAction = agentResult?.verify_action
      if (verifyAction === 'confirm_payment') {
        await axios.post('/api/payment', {
          amount: agentResult.amount,
          merchant: agentResult.merchant
        })
      } else if (verifyAction === 'confirm_topup') {
        await axios.post('/api/topup', {
          amount: agentResult.amount
        })
      }
      await fetchBalance()
      setAppState('SUCCESS')
    } catch {
      setError('Verification failed. Please try again.')
      setAppState('HOME')
    }
  }

  const handleDone = () => {
    setAppState('HOME')
    setAgentResult(null)
    setTranscription('')
    setError(null)
    fetchBalance()
  }

  const handleViewPromotions = async () => {
    setAppState('PROMOTIONS')
  }

  const handleViewBalance = async () => {
    await fetchBalance()
    setAppState('BALANCE')
  }

  const handleCallHelper = () => {
    setAppState('HELPER')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center text-lg">
            {error}
          </div>
        )}

        {appState === 'HOME' && (
          <QuickModeHome
            balance={balance}
            onVoice={handleVoiceStart}
            onPromotions={handleViewPromotions}
            onBalance={handleViewBalance}
            onCallHelper={handleCallHelper}
          />
        )}

        {appState === 'LISTENING' && (
          <VoiceRecorder />
        )}

        {appState === 'THINKING' && (
          <PipelineAnimation />
        )}

        {appState === 'RESULT' && (
          <AgentResult
            data={agentResult}
            transcription={transcription}
          />
        )}

        {appState === 'VERIFYING' && (
          <ThumbprintOverlay
            onVerify={handleThumbprintVerify}
          />
        )}

        {appState === 'SUCCESS' && (
          <SuccessScreen
            data={agentResult}
            onDone={handleDone}
          />
        )}

        {appState === 'PROMOTIONS' && (
          <PromotionsPanel
            onBack={handleDone}
          />
        )}

        {appState === 'BALANCE' && (
          <BalanceDisplay
            balance={balance}
            onBack={handleDone}
          />
        )}

        {appState === 'HELPER' && (
          <CallHelper
            onBack={handleDone}
          />
        )}
      </div>
    </div>
  )
}

export default App
