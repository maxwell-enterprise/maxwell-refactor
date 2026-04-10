"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "../../../components/LandingPage";
import SessionLoadingScreen from "../../../components/system/SessionLoadingScreen";
import PublicCampaignProductDeepLink from "../../../components/store/PublicCampaignProductDeepLink";
import { useAuth } from "../../../context/AuthContext";
import { CampaignAttributionService } from "../../../services/campaignAttributionService";
import { CampaignService } from "../../../services/campaignService";
import { parsePublicProductDeepLink } from "../../../lib/publicProductDeepLink";

/**
 * Home route composition: auth redirect + landing.
 * Keeps app/page.tsx thin.
 */
export default function HomeRoutePage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const [publicProductLink, setPublicProductLink] = useState<{
    productId: string;
    discountCode?: string;
    source?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPublicProductLink(parsePublicProductDeepLink(window.location.search));
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const link = parsePublicProductDeepLink(
      typeof window !== "undefined" ? window.location.search : "",
    );
    if (link) {
      const q = new URLSearchParams();
      q.set("view", "store");
      q.set("product", link.productId);
      if (link.discountCode) q.set("discount", link.discountCode);
      if (link.source) q.set("source", link.source);
      q.set("checkout", "1");
      router.replace(`/dashboard?${q.toString()}`);
      return;
    }
    router.replace("/dashboard");
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

  if (publicProductLink) {
    return (
      <PublicCampaignProductDeepLink
        productId={publicProductLink.productId}
        discountCode={publicProductLink.discountCode}
        campaignSource={publicProductLink.source}
      />
    );
  }

  return <LandingPage onLogin={login} />;
}
