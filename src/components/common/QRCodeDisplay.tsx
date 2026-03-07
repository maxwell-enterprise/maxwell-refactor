
import React from 'react';
import { QRData } from '../../types/qr';
import { QRService } from '../../services/qrService';

interface QRCodeDisplayProps {
  data: QRData | string;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ data, size = 150, className = '', showLabel = false }) => {
  const qrString = typeof data === 'string' ? data : QRService.generateQRString(data);
  
  // Using a reliable public API for QR generation to avoid heavy local libraries in this demo
  // In production, use 'qrcode.react' or similar.
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrString)}&color=0f172a`;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-white p-2 rounded-xl border-2 border-slate-100 shadow-sm inline-block">
        <img 
            src={qrImageUrl} 
            alt="QR Code" 
            width={size} 
            height={size} 
            className="mix-blend-multiply"
            loading="lazy"
        />
      </div>
      {showLabel && (
        <div className="mt-2 text-center">
            <p className="text-[10px] text-slate-400 font-mono break-all max-w-[200px]">{qrString}</p>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
