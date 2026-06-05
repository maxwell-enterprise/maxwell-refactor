"use client";

import React, { useEffect } from "react";
import App from "../../../App";
import { dashboardScope } from "../logic/scopeConfig";
import { ReferralService } from "../../../services/referralService";

export default function DashboardPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim() || "";
    if (!ref) return;
    if (ReferralService.wasClaimed(ref)) return;

    void ReferralService.claim(ref)
      .then((result) => {
        if (!result.applied && !result.facilitatorName) {
          return;
        }
        const next = new URLSearchParams(window.location.search);
        next.delete("ref");
        const search = next.toString();
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${search ? `?${search}` : ""}`,
        );
      })
      .catch((error) => {
        console.warn("[Referral] claim failed:", error);
      });
  }, []);

  return (
    <main
      data-scope={dashboardScope.id}
      className="flex min-h-screen w-full min-w-0 max-w-full flex-col"
    >
      <App />
    </main>
  );
}
