import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../state/strings.js';

const SIMULATED_MERCHANTS = [
  'Kedai Runcit Maju',
  'Restoran Selera Kampung',
  'FamilyMart Bukit Bintang',
  'Tealive SS15',
  'Watsons Mid Valley',
  '99 Speedmart Taman Tun',
  'Jaya Grocer One Utama',
  'Guardian KLCC',
];

function parseMerchantFromRaw(rawValue) {
  if (!rawValue) return 'QR Merchant';
  const text = String(rawValue).trim();

  try {
    const url = new URL(text);
    const name = url.searchParams.get('name') || url.searchParams.get('merchant');
    if (name) return name;
  } catch (_) {
    // Non-URL payloads are valid QR data as well.
  }

  const kvMatch = text.match(/(?:merchant|name)\s*[:=]\s*([A-Za-z0-9 '&.\-]{2,60})/i);
  if (kvMatch?.[1]) return kvMatch[1].trim();
  return text.slice(0, 40) || 'QR Merchant';
}

export default function ScannerScreen({ lang, onBack, onScanned, prefill }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimerRef = useRef(null);
  const autoContinueTimerRef = useRef(null);
  const [scanError, setScanError] = useState('');
  const [detectorReady, setDetectorReady] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState('');
  const [detectedRaw, setDetectedRaw] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const amount = useMemo(() => {
    const n = Number(prefill?.amount ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [prefill?.amount]);
  const stopCamera = useCallback(() => {
    if (detectTimerRef.current) {
      window.clearInterval(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (autoContinueTimerRef.current) {
      window.clearTimeout(autoContinueTimerRef.current);
      autoContinueTimerRef.current = null;
    }
  }, []);

  const commitScan = useCallback((rawValue, merchant) => {
    onScanned({
      raw: String(rawValue || ''),
      merchant: merchant || 'QR Merchant',
      amount: amount > 0 ? amount : null,
    });
  }, [amount, onScanned]);

  const handleDetectedScan = useCallback((rawValue) => {
    if (isProcessing) return;
    const merchant = parseMerchantFromRaw(rawValue);
    const raw = String(rawValue || '');
    setDetectedRaw(raw);
    setDetectedLabel(merchant);
    stopCamera();
  }, [isProcessing, stopCamera]);

  const handleContinue = useCallback(() => {
    if (!detectedLabel) return;
    if (autoContinueTimerRef.current) {
      window.clearTimeout(autoContinueTimerRef.current);
      autoContinueTimerRef.current = null;
    }
    commitScan(detectedRaw, detectedLabel);
  }, [commitScan, detectedLabel, detectedRaw]);

  const handleSimulateSuccess = useCallback(() => {
    if (isProcessing) return;
    const merchant = SIMULATED_MERCHANTS[Math.floor(Math.random() * SIMULATED_MERCHANTS.length)];
    const raw = `merchant=${encodeURIComponent(merchant)}&source=manual-simulated-scan`;
    setDetectedRaw(raw);
    setDetectedLabel(merchant);
    setIsProcessing(true);
    stopCamera();
    commitScan(raw, merchant);
  }, [commitScan, isProcessing, stopCamera]);

  useEffect(() => {
    let active = true;

    const start = async () => {
      let detector = null;
      setDetectorReady(false);
      setScanError('');
      setIsProcessing(false);
      setDetectedLabel('');
      setDetectedRaw('');
      if (!navigator?.mediaDevices?.getUserMedia) {
        setScanError('Camera is not supported on this browser.');
        return;
      }

      if (!window.BarcodeDetector) {
        setScanError('Live barcode scan is not supported here. Please use a supported browser/device.');
        return;
      }

      try {
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
        if (!supportedFormats?.length) {
          setScanError('Barcode scanning is not supported on this device.');
          return;
        }
        detector = new window.BarcodeDetector({ formats: supportedFormats });
      } catch (_) {
        // Continue even if supported formats API is unavailable.
        detector = new window.BarcodeDetector();
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setDetectorReady(true);
        if (!detector) detector = new window.BarcodeDetector();
        detectTimerRef.current = window.setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const first = codes?.[0];
            const raw = first?.rawValue || first?.displayValue || first?.format;
            if (raw) handleDetectedScan(raw);
          } catch (_) {
            // Keep scanning; transient detect failures are expected.
          }
        }, 350);
      } catch (err) {
        setScanError(err?.message || 'Could not open camera.');
      }
    };

    start();
    return () => {
      active = false;
      stopCamera();
    };
  }, [handleDetectedScan, stopCamera]);

  return (
    <div className="phone-frame relative flex flex-col bg-slate-100 text-slate-900">
      <div className="bg-tng-blue px-4 pt-5 pb-3 text-white sm:px-5 sm:pt-6 sm:pb-4">
        <button
          onClick={() => {
            stopCamera();
            onBack();
          }}
          className="text-sm font-semibold opacity-90 active:opacity-60"
        >
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t(lang, 'scanPay')}</h1>
      </div>

      <div className="px-4 pt-1.5 sm:px-5">
        <div className="mb-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center sm:px-5 sm:py-3">
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {amount > 0 ? `RM ${amount.toFixed(2)}` : 'Amount not detected'}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-slate-900">
          <video ref={videoRef} className="h-[345px] w-full object-cover sm:h-[480px] md:h-[560px]" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-8 sm:pb-10 md:pb-12">
            <div className="h-56 w-56 rounded-3xl border-4 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] sm:h-64 sm:w-64 md:h-80 md:w-80" />
          </div>
          {!detectorReady && !detectedLabel && (
            <div className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-xs font-semibold">
              Opening camera...
            </div>
          )}
          {detectedLabel && (
            <div className="absolute inset-x-0 bottom-0 bg-emerald-600/95 px-3 py-2 text-sm font-bold text-white">
              Barcode detected: {detectedLabel}
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-soft">
                Detected, processing...
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
        {scanError ? (
          <div className="rounded-2xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
            {scanError}
          </div>
        ) : (
          <div className="text-center text-2xl font-bold leading-snug text-slate-700 sm:text-3xl">
            Point camera to paying QRcode.
          </div>
        )}
        <div className="mt-3 rounded-2xl bg-white/95 p-3 text-slate-800 sm:mt-4">
          <div className="text-sm font-semibold text-slate-600">
            Scan merchant QR to continue payment.
          </div>
        </div>

      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-20">
        <div className="rounded-full bg-gradient-to-t from-slate-100/95 via-slate-100/70 to-transparent p-1.5">
          <button
            type="button"
            onClick={handleSimulateSuccess}
            disabled={isProcessing}
            aria-label="Simulate successful scan"
            title="Simulate successful scan"
            className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-soft transition active:scale-95 ${
              isProcessing
                ? 'cursor-not-allowed bg-slate-400'
                : 'bg-gradient-to-b from-emerald-400 to-emerald-600'
            } opacity-10`}
          >
            {isProcessing ? '…' : '✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
