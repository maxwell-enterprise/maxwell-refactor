"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "../../../components/LandingPage";
import SessionLoadingScreen from "../../../components/system/SessionLoadingScreen";
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
    return <SessionLoadingScreen />;
  }

  if (isAuthenticated) {
    return <SessionLoadingScreen title="Membuka dashboard…" />;
  }

  return <LandingPage onLogin={login} />;
}
