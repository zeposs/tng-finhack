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
  const [scanError, setScanError] = useState('');
  const [detectorReady, setDetectorReady] = useState(false);
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  const amount = useMemo(() => {
    const n = Number(prefill?.amount ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [prefill?.amount]);
  const merchantHint = useMemo(() => {
    const txt = String(prefill?.merchant || '').trim();
    return txt || 'Will read from scanned QR';
  }, [prefill?.merchant]);

  const stopCamera = useCallback(() => {
    if (detectTimerRef.current) {
      window.clearInterval(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const finishScan = useCallback((rawValue) => {
    const merchant = parseMerchantFromRaw(rawValue);
    const manual = Number(String(manualAmount).replace(',', '.'));
    const finalAmount = Number.isFinite(manual) && manual > 0 ? manual : amount;
    stopCamera();
    onScanned({
      raw: String(rawValue || ''),
      merchant,
      amount: finalAmount,
    });
  }, [amount, manualAmount, onScanned, stopCamera]);

  useEffect(() => {
    let active = true;

    const start = async () => {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setScanError('Camera is not supported on this browser.');
        return;
      }

      if (!window.BarcodeDetector) {
        setScanError('Live QR scan is not supported here. Use manual merchant below.');
        return;
      }

      try {
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
        if (!supportedFormats.includes('qr_code')) {
          setScanError('QR scanning is not supported on this device.');
          return;
        }
      } catch (_) {
        // Continue, some browsers may not expose supported formats list.
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

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        detectTimerRef.current = window.setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const qr = codes?.[0];
            if (qr?.rawValue) finishScan(qr.rawValue);
          } catch (_) {
            // Keep scanning; transient detect failures are expected.
          }
        }, 450);
      } catch (err) {
        setScanError(err?.message || 'Could not open camera.');
      }
    };

    start();
    return () => {
      active = false;
      stopCamera();
    };
  }, [finishScan, stopCamera]);

  return (
    <div className="phone-frame flex flex-col bg-black text-white">
      <div className="px-5 pt-6 pb-4">
        <button
          onClick={() => {
            stopCamera();
            onBack();
          }}
          className="text-sm font-semibold opacity-90 active:opacity-60"
        >
          ← {t(lang, 'back')}
        </button>
        <h1 className="mt-2 text-3xl font-extrabold">{t(lang, 'scanPay')}</h1>
        <p className="mt-1 text-sm text-white/85">
          {amount > 0
            ? `Ready to pay RM ${amount.toFixed(2)}. Point camera at merchant QR.`
            : t(lang, 'scanPayHint')}
        </p>
      </div>

      <div className="px-5">
        <div className="mb-3 rounded-2xl bg-white/10 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            Payment details
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-[11px] text-white/70">Amount</div>
              <div className="mt-1 text-lg font-extrabold">
                {amount > 0 ? `RM ${amount.toFixed(2)}` : 'Not detected yet'}
              </div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-[11px] text-white/70">Merchant</div>
              <div className="mt-1 text-sm font-bold">{merchantHint}</div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border-2 border-white/35 bg-slate-900">
          <video ref={videoRef} className="h-[360px] w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-52 w-52 rounded-3xl border-4 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          {!detectorReady && (
            <div className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-xs font-semibold">
              Opening camera...
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        {scanError ? (
          <div className="rounded-2xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
            {scanError}
          </div>
        ) : (
          <div className="text-xs text-white/70">
            Tip: align QR within the square and hold steady.
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-white/95 p-3 text-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Manual fallback
          </div>
          <div className="mt-1 text-xs text-slate-600">
            If camera scan fails, enter merchant and amount manually.
          </div>
          <input
            value={manualMerchant}
            onChange={(e) => setManualMerchant(e.target.value)}
            placeholder={t(lang, 'merchantPlaceholder')}
            className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-tng-blue focus:outline-none"
          />
          <input
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            inputMode="decimal"
            placeholder={amount > 0 ? `Amount from voice: RM ${amount.toFixed(2)}` : 'Amount (RM), e.g. 50'}
            className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-tng-blue focus:outline-none"
          />
          <button
            onClick={() => finishScan(`merchant=${manualMerchant || 'QR Merchant'}`)}
            className="mt-3 w-full rounded-xl bg-emerald-500 py-3 text-base font-extrabold text-white active:scale-95"
          >
            Continue with merchant
          </button>
        </div>
      </div>
    </div>
  );
}
