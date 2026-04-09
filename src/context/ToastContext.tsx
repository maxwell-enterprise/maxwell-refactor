"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed left-3 right-3 top-20 z-[200] flex flex-col items-end gap-3 sm:left-auto sm:right-6 sm:w-auto">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center rounded-lg border p-4 shadow-xl animate-fade-in-down transition-all sm:min-w-[280px]
              ${toast.type === 'success' ? 'bg-white border-green-200 text-slate-800' : 
                toast.type === 'error' ? 'bg-white border-red-200 text-slate-800' : 
                'bg-white border-blue-200 text-slate-800'}`}
          >
            <div className={`mr-3 p-1 rounded-full 
              ${toast.type === 'success' ? 'bg-green-100 text-green-600' : 
                toast.type === 'error' ? 'bg-red-100 text-red-600' : 
                'bg-blue-100 text-blue-600'}`}>
              {toast.type === 'success' && <CheckCircle size={18} />}
              {toast.type === 'error' && <AlertCircle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
            </div>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="ml-3 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
