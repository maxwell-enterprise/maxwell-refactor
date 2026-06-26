"use client";

import React from "react";
import { AuthProvider, ToastProvider, DialogProvider, SecurityProvider } from "../../../providers";
import ChunkLoadRecoveryListener from "../../../components/system/ChunkLoadRecoveryListener";

type DashboardProvidersProps = {
  children: React.ReactNode;
};

export default function DashboardProviders({
  children,
}: DashboardProvidersProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ChunkLoadRecoveryListener />
        <DialogProvider>
          <SecurityProvider>{children}</SecurityProvider>
        </DialogProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
