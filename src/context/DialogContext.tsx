"use client";

import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';
import GlobalDialog, { DialogOptions } from '../components/organisms/GlobalDialog';

interface DialogContextType {
    confirm: (options: DialogOptions) => Promise<boolean>;
    alert: (options: Omit<DialogOptions, 'cancelLabel'>) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dialogOptions, setDialogOptions] = useState<DialogOptions>({
        title: '',
        message: '',
    });
    
    // We use a ref to store the 'resolve' function of the active Promise
    const resolveRef = useRef<(value: boolean) => void>(() => {});

    const confirm = useCallback((options: DialogOptions): Promise<boolean> => {
        setDialogOptions({
            confirmLabel: 'Confirm',
            cancelLabel: 'Cancel',
            variant: 'info',
            ...options
        });
        setIsOpen(true);
        return new Promise((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const alert = useCallback((options: Omit<DialogOptions, 'cancelLabel'>): Promise<void> => {
        return confirm({
            ...options,
            cancelLabel: undefined, // Hide cancel button logic could be handled in UI if needed, but for now we just treat it as a confirm with 1 outcome
        }).then(() => {});
    }, [confirm]);

    const handleConfirm = () => {
        setIsOpen(false);
        resolveRef.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveRef.current(false);
    };

    return (
        <DialogContext.Provider value={{ confirm, alert }}>
            {children}
            <GlobalDialog 
                isOpen={isOpen}
                options={dialogOptions}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};
