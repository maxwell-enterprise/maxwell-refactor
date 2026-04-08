"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "../../../components/LandingPage";
import { useAuth } from "../../../context/AuthContext";

/**
 * Home route composition: auth redirect + landing.
 * Keeps app/page.tsx thin.
 */
export default function HomeRoutePage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-2">
        <div className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" aria-hidden />
        <p className="text-sm">Memuat sesi…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-2">
        <div className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" aria-hidden />
        <p className="text-sm">Membuka dashboard…</p>
      </div>
    );
  }

  return <LandingPage onLogin={login} />;
}
