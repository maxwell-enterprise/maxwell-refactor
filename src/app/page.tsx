"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "@/components/LandingPage";
import SessionLoadingScreen from "@/components/system/SessionLoadingScreen";
import PublicCampaignProductDeepLink from "@/components/store/PublicCampaignProductDeepLink";
import { useAuth } from "@/context/AuthContext";
import { CampaignAttributionService } from "@/services/campaignAttributionService";
import { CampaignService } from "@/services/campaignService";
import { parsePublicProductDeepLink } from "@/lib/publicProductDeepLink";

/**
 * Home route: auth redirect, campaign tracking, deep links, and public landing — all in App Router.
 */
export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const [isRoutingAuthCallback, setIsRoutingAuthCallback] = useState(false);
  const [publicProductLink, setPublicProductLink] = useState<{
    productId: string;
    discountCode?: string;
    source?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    const hasAuthCallbackPayload =
      hashParams.has("access_token") ||
      hashParams.has("refresh_token") ||
      hashParams.has("error") ||
      hashParams.has("error_code");
    if (hasAuthCallbackPayload) {
      setIsRoutingAuthCallback(true);
      window.location.replace(
        `/auth/callback${window.location.search}${window.location.hash}`,
      );
      return;
    }
    setPublicProductLink(parsePublicProductDeepLink(window.location.search));
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const currentSearch =
      typeof window !== "undefined" ? window.location.search : "";
    const currentParams = new URLSearchParams(currentSearch);
    const referralRef = currentParams.get("ref")?.trim();
    const link = parsePublicProductDeepLink(
      currentSearch,
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
    if (referralRef) {
      router.replace(`/dashboard?ref=${encodeURIComponent(referralRef)}`);
      return;
    }
    router.replace("/dashboard");
  }, [isLoading, isAuthenticated, router]);

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

  if (isLoading || isRoutingAuthCallback) {
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
