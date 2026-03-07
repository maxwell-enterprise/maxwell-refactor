"use client";

import React from "react";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./ToastProvider";
import { DialogProvider } from "./DialogProvider";
import { SecurityProvider } from "./SecurityProvider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        <DialogProvider>
          <SecurityProvider>{children}</SecurityProvider>
        </DialogProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
