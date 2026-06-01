
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { QRService } from '../../services/qrService';
import { ScanResult } from '../../types/qr';
import jsQR from 'jsqr';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: ScanResult) => void;
  /**
   * `gate` — emit raw payload only; server validates via AttendanceService.
   * `legacy` — run QRService.processScan (store / old flows).
   */
  purpose?: 'gate' | 'legacy';
}

const SCAN_INTERVAL_MS = 220;
const DEDupe_MS = 2500;

const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  purpose = 'gate',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const lastPayloadRef = useRef<string>('');
  const lastPayloadAtRef = useRef<number>(0);
  const processingPayloadRef = useRef(false);

  const emitGatePayload = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const now = Date.now();
      if (
        trimmed === lastPayloadRef.current &&
        now - lastPayloadAtRef.current < DEDupe_MS
      ) {
        return;
      }
      lastPayloadRef.current = trimmed;
      lastPayloadAtRef.current = now;
      onScan({
        success: true,
        message: trimmed,
        timestamp: new Date().toISOString(),
        qrPayload: trimmed,
      });
    },
    [onScan],
  );

  const processDecodedPayload = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || processingPayloadRef.current) return;

      const now = Date.now();
      if (
        trimmed === lastPayloadRef.current &&
        now - lastPayloadAtRef.current < DEDupe_MS
      ) {
        return;
      }

      lastPayloadRef.current = trimmed;
      lastPayloadAtRef.current = now;
      processingPayloadRef.current = true;

      try {
        if (purpose === 'gate') {
          emitGatePayload(trimmed);
          return;
        }

        if (
          trimmed.startsWith('EVENT_ATTENDANCE:') ||
          trimmed.startsWith('EVENT:')
        ) {
          onScan({
            success: true,
            message: trimmed,
            timestamp: new Date().toISOString(),
            qrPayload: trimmed,
          });
          return;
        }

        const result = await QRService.processScan(trimmed);
        onScan(result);
      } finally {
        window.setTimeout(() => {
          processingPayloadRef.current = false;
        }, 500);
      }
    },
    [emitGatePayload, onScan, purpose],
  );

  const startCamera = async () => {
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setHasPermission(false);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Camera Access Error:', err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void startCamera();
    } else {
      stopCamera();
      lastPayloadRef.current = '';
      lastPayloadAtRef.current = 0;
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stream intentionally excluded to avoid restart loop
  }, [isOpen]);

  // Decode QR from camera
  useEffect(() => {
    if (!isOpen || !stream || hasPermission !== true) {
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const timer = window.setInterval(() => {
      if (!videoRef.current || video.readyState < 2) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        if (purpose === 'gate') {
          emitGatePayload(code.data);
        } else {
          void processDecodedPayload(code.data);
        }
      }
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isOpen, stream, hasPermission, processDecodedPayload, purpose]);

  const handleManualScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode || isProcessing) return;

    setIsProcessing(true);
    const raw = manualCode.trim();

    try {
      if (purpose === 'gate') {
        emitGatePayload(raw);
        setManualCode('');
        setTimeout(onClose, 400);
      } else {
        await processDecodedPayload(raw);
        setManualCode('');
        setTimeout(onClose, 400);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col animate-fade-in bg-black">
      <div className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-6">
        <div className="text-white">
          <h2 className="flex items-center text-xl font-bold">
            <Camera className="mr-2" />
            {purpose === 'gate' ? 'Gate Scanner' : 'Self Attendance Scanner'}
          </h2>
          <p className="text-xs text-slate-300">
            {purpose === 'gate'
              ? 'Point the camera at the ticket or membership QR code'
              : 'Point the camera at the attendance QR shown by the event team'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30"
        >
          <X size={24} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        {hasPermission === false ? (
          <div className="p-6 text-center text-slate-400">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-bold text-white">Camera Unavailable</h3>
            <p className="mb-6 mt-2 text-sm">
              This browser or page context cannot access the camera. Use HTTPS or localhost, allow camera permission, or paste the QR code manually below.
            </p>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="mx-auto flex items-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white"
            >
              <RefreshCw size={14} className="mr-2" />
              Try Again
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
        )}

        <div className="relative z-10 h-64 w-64 overflow-hidden rounded-3xl border-2 border-white/50">
          <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-blue-500"></div>
          <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-blue-500"></div>
          <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-blue-500"></div>
          <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-blue-500"></div>
          <div className="animate-scan absolute inset-0 h-[50%] w-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>
        </div>
      </div>

      <div className="z-20 rounded-t-3xl border-t border-slate-800 bg-slate-900 p-6">
        <form onSubmit={handleManualScan} className="flex flex-col gap-4">
          <div className="relative">
            <Zap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="TICKET:… or paste raw QR payload"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={!manualCode || isProcessing}
            className={`flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-bold ${
              isProcessing ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="mr-2 animate-spin" size={18} />
            ) : null}
            Process Code
          </button>

          <div className="mt-2 flex justify-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() =>
                setManualCode('TICKET:EVT-2025-A6:M002')
              }
              className="whitespace-nowrap rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-400"
            >
              Sample TICKET
            </button>
            <button
              type="button"
              onClick={() => setManualCode('MEMBER:M001')}
              className="whitespace-nowrap rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-400"
            >
              Sample MEMBER
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QRScanner;
