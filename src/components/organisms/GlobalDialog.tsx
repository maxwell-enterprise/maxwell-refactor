import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';
import { ClipLoader } from 'react-spinners';

export type DialogVariant = 'danger' | 'info' | 'success' | 'warning';

export interface DialogOptions {
  title: string;
  message: React.ReactNode;
  variant?: DialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: React.ReactNode;
  confirmIcon?: React.ReactNode;
  cancelIcon?: React.ReactNode;
}

interface GlobalDialogProps {
  isOpen: boolean;
  options: DialogOptions;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const GlobalDialog: React.FC<GlobalDialogProps> = ({ isOpen, options, onConfirm, onCancel }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false);
    }
  }, [isOpen]);

  const handleConfirmClick = async () => {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (options.variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          btnBg: 'bg-red-600 hover:bg-red-700',
          defaultIcon: <Trash2 size={24} />,
        };
      case 'success':
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          btnBg: 'bg-green-600 hover:bg-green-700',
          defaultIcon: <CheckCircle size={24} />,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          btnBg: 'bg-amber-600 hover:bg-amber-700',
          defaultIcon: <AlertTriangle size={24} />,
        };
      default:
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          btnBg: 'bg-blue-600 hover:bg-blue-700',
          defaultIcon: <Info size={24} />,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <>
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-slate-100"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${styles.iconBg} ${styles.iconColor}`}>
              {options.icon || styles.defaultIcon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {options.title}
              </h3>
              <div className="mt-2 text-sm text-slate-500 leading-relaxed">
                {options.message}
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isConfirming}
              className="text-slate-400 hover:text-slate-600 transition-colors -mt-2 -mr-2 p-2 rounded-full hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {options.cancelIcon}
            {options.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isConfirming}
            className={`inline-flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl text-sm shadow-lg transition-all transform active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed ${styles.btnBg}`}
          >
            {isConfirming ? (
              <span className="inline-flex items-center gap-2">
                <ClipLoader size={14} color="#ffffff" />
                Processing...
              </span>
            ) : (
              <>
                {options.confirmIcon}
                {options.confirmLabel || 'Confirm'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
    
  );
};

export default GlobalDialog;
