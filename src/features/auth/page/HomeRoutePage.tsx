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
  const { isAuthenticated, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  return <LandingPage onLogin={login} />;
}
