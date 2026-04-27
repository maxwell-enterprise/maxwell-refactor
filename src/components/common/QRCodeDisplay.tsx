import React, { useCallback, useId, useMemo } from 'react';
import { Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { QRData } from '../../types/qr';
import { QRService } from '../../services/qrService';

interface QRCodeDisplayProps {
  data: QRData | string;
  size?: number;
  className?: string;
  showLabel?: boolean;
  downloadFileName?: string;
  downloadLabel?: string;
  hideDownloadButton?: boolean;
}

const sanitizeFileName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'qr-code';

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  data,
  size = 150,
  className = '',
  showLabel = false,
  downloadFileName,
  downloadLabel = 'Download QR Code',
  hideDownloadButton = false,
}) => {
  const qrString =
    typeof data === 'string' ? data : QRService.generateQRString(data);
  const trimmed = qrString.trim();
  const canvasId = useId().replace(/:/g, '');
  const resolvedFileName = useMemo(
    () => `${sanitizeFileName(downloadFileName || trimmed.slice(0, 48) || 'qr-code')}.png`,
    [downloadFileName, trimmed],
  );

  const handleDownload = useCallback(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const downloadLink = document.createElement('a');
    downloadLink.href = canvas.toDataURL('image/png');
    downloadLink.download = resolvedFileName;
    downloadLink.click();
  }, [canvasId, resolvedFileName]);

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
        <QRCodeCanvas
          id={canvasId}
          value={trimmed}
          size={size}
          level="M"
          fgColor="#0f172a"
          bgColor="#ffffff"
          title="QR code"
          includeMargin
        />
      </div>
      {!hideDownloadButton && (
        <button
          type="button"
          onClick={handleDownload}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Download size={14} />
          {downloadLabel}
        </button>
      )}
      {showLabel && (
        <div className="mt-2 max-w-[200px] text-center">
          <p className="break-all font-mono text-[10px] text-slate-400">{trimmed}</p>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
