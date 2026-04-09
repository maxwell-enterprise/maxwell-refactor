"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "../../../components/LandingPage";
import SessionLoadingScreen from "../../../components/system/SessionLoadingScreen";
import { useAuth } from "../../../context/AuthContext";
import { CampaignAttributionService } from "../../../services/campaignAttributionService";
import { CampaignService } from "../../../services/campaignService";

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

  // Track campaign click as early as possible (landing page, before login).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source")?.trim();
    if (!source) return;

    const normalized = CampaignAttributionService.saveSource(source);
    if (!normalized) return;
    if (!CampaignAttributionService.shouldTrackClick(normalized)) return;

    CampaignService.trackClick(normalized).catch((error) => {
      console.warn("[Campaign] early click tracking failed:", error);
    });
  }, []);

  if (isLoading) {
    return <SessionLoadingScreen />;
  }

  if (isAuthenticated) {
    return <SessionLoadingScreen title="Membuka dashboard…" />;
  }

  return <LandingPage onLogin={login} />;
}
