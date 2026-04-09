"use client";

import React from "react";
import { AuthProvider, ToastProvider, DialogProvider, SecurityProvider } from "../../../providers";
type DashboardProvidersProps = {
  children: React.ReactNode;
};

export default function DashboardProviders({
  children,
}: DashboardProvidersProps) {
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
