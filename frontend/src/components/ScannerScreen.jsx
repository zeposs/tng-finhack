import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../state/strings.js';

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
  const [manualAmount, setManualAmount] = useState('');
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
    const manual = Number(String(manualAmount).replace(',', '.'));
    const finalAmount = Number.isFinite(manual) && manual > 0 ? manual : (amount > 0 ? amount : 18.9);
    onScanned({
      raw: String(rawValue || ''),
      merchant: merchant || 'QR Merchant',
      amount: finalAmount,
    });
  }, [amount, manualAmount, onScanned]);

  const handleDetectedScan = useCallback((rawValue) => {
    if (isProcessing) return;
    const merchant = parseMerchantFromRaw(rawValue);
    const raw = String(rawValue || '');
    setDetectedRaw(raw);
    setDetectedLabel(merchant);
    setIsProcessing(true);
    stopCamera();
    autoContinueTimerRef.current = window.setTimeout(() => {
      commitScan(raw, merchant);
    }, 700);
  }, [commitScan, isProcessing, stopCamera]);

  const handleContinue = useCallback(() => {
    if (!detectedLabel) return;
    if (autoContinueTimerRef.current) {
      window.clearTimeout(autoContinueTimerRef.current);
      autoContinueTimerRef.current = null;
    }
    commitScan(detectedRaw, detectedLabel);
  }, [commitScan, detectedLabel, detectedRaw]);

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
    <div className="phone-frame flex flex-col bg-slate-100 text-slate-900">
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
          <video ref={videoRef} className="h-[230px] w-full object-cover sm:h-[320px]" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-3xl border-4 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] sm:h-48 sm:w-48" />
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
          <div className="text-sm text-slate-600">
            Point camera to any barcode. Detection auto-continues.
          </div>
        )}
        <div className="mt-3 rounded-2xl bg-white/95 p-3 text-slate-800 sm:mt-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Amount fallback
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Enter amount only if detected amount is wrong.
          </div>
          <input
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            inputMode="decimal"
            placeholder={amount > 0 ? `Scanned/voice amount: RM ${amount.toFixed(2)}` : 'Optional corrected amount (RM), e.g. 50'}
            className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-tng-blue focus:outline-none"
          />
          <div className="mt-3">
            <button
              onClick={handleContinue}
              disabled={!detectedLabel}
              className={`w-full rounded-xl py-3 text-base font-extrabold text-white transition active:scale-95 ${
                detectedLabel ? 'bg-emerald-600' : 'cursor-not-allowed bg-slate-300'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
