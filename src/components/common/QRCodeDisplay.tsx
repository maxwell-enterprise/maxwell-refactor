
import React from 'react';
import QRCode from 'react-qr-code';
import { QRData } from '../../types/qr';
import { QRService } from '../../services/qrService';

interface QRCodeDisplayProps {
  data: QRData | string;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  data,
  size = 150,
  className = '',
  showLabel = false,
}) => {
  const qrString =
    typeof data === 'string' ? data : QRService.generateQRString(data);
  const trimmed = qrString.trim();

  if (!trimmed) {
    return (
      <div
        className={`flex flex-col items-center text-slate-400 text-xs ${className}`}
        role="status"
      >
        <div
          className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50"
          style={{ width: size, height: size }}
        >
          No QR data
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="inline-block rounded-xl border-2 border-slate-100 bg-white p-2 shadow-sm">
        <QRCode
          value={trimmed}
          size={size}
          level="M"
          fgColor="#0f172a"
          bgColor="#ffffff"
          title="QR code"
        />
      </div>
      {showLabel && (
        <div className="mt-2 max-w-[200px] text-center">
          <p className="break-all font-mono text-[10px] text-slate-400">{trimmed}</p>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
