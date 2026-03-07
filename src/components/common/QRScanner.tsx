
import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { QRService } from '../../services/qrService';
import { ScanResult } from '../../types/qr';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: ScanResult) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Initialize Camera
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error("Camera Access Error:", err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleManualScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode || isProcessing) return;

    setIsProcessing(true);
    const result = await QRService.processScan(manualCode);
    setIsProcessing(false);
    onScan(result);
    
    // Don't close immediately if error, let user see result
    if (result.success) {
        setTimeout(onClose, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white">
            <h2 className="text-xl font-bold flex items-center"><Camera className="mr-2"/> Gate Scanner</h2>
            <p className="text-xs text-slate-300">Align QR code within the frame</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30">
            <X size={24}/>
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {hasPermission === false ? (
            <div className="text-center p-6 text-slate-400">
                <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                <h3 className="font-bold text-white text-lg">Camera Access Denied</h3>
                <p className="text-sm mt-2 mb-6">Please allow camera access in your browser settings to use the scanner.</p>
                <button 
                  onClick={startCamera}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center mx-auto"
                >
                  <RefreshCw size={14} className="mr-2"/> Try Again
                </button>
            </div>
        ) : (
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
        )}
        
        {/* Scanning Overlay UI */}
        <div className="relative z-10 w-64 h-64 border-2 border-white/50 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent h-[50%] animate-scan w-full"></div>
        </div>
      </div>

      {/* Manual Entry Footer (Fallback & Testing) */}
      <div className="bg-slate-900 p-6 rounded-t-3xl border-t border-slate-800 z-20">
          <form onSubmit={handleManualScan} className="flex flex-col gap-4">
              <div className="relative">
                  <Zap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="Enter Code (e.g. TICKET:EVT-2025-A6:M002)"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                  />
              </div>
              <button 
                type="submit" 
                disabled={!manualCode || isProcessing}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center ${isProcessing ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                  {isProcessing ? <RefreshCw className="animate-spin mr-2" size={18}/> : 'Process Code'}
              </button>
              
              {/* DEV HELPERS */}
              <div className="flex gap-2 justify-center mt-2 overflow-x-auto">
                  <button type="button" onClick={() => setManualCode('TICKET:EVT-2025-A6:M002')} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">Test Ticket</button>
                  <button type="button" onClick={() => setManualCode('MEMBER:M001')} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">Test Member</button>
                  <button type="button" onClick={() => setManualCode('INVALID:CODE')} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">Test Invalid</button>
              </div>
          </form>
      </div>
    </div>
  );
};

export default QRScanner;
