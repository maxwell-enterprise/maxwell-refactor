"use client";

import React, { useState, useMemo, useEffect } from "react";
import { UserRole } from "../types/index";
import {
  PUBLIC_PROGRAMS,
  PUBLIC_STORE,
  PUBLIC_ARTICLES,
  DISCOUNT_DATA,
} from "../constants";
import { Menu, X, ArrowRight, ShoppingBag, LogIn, Tag } from "lucide-react";
import MaxwellScoutWidget from "./scout/MaxwellScoutWidget";
import ModernLogin from "./auth/ModernLogin";
import { useToast } from "../context/ToastContext";
import {
  LANDING_FOOTER,
  LANDING_HERO_SLIDES,
  LANDING_NAV,
  type LandingFooterSocial,
} from "../content/landingPublicContent";

interface LandingPageProps {
  onLogin: (role: UserRole, provider: "google" | "email") => void;
}

/** Indonesia country code + number, no + (e.g. 62812…). Override via env. */
const LANDING_WHATSAPP_HREF =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_LANDING_WHATSAPP
    ? `https://wa.me/${process.env.NEXT_PUBLIC_LANDING_WHATSAPP.replace(/\D/g, "")}`
    : "https://wa.me/6281111111111";

function FooterSocialIcon({ item }: { item: LandingFooterSocial }) {
  const common = "h-5 w-5";
  switch (item.icon) {
    case "instagram":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    default:
      return null;
  }
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { showToast } = useToast();

  const [heroLeadership] = LANDING_HERO_SLIDES;

  const [dynamicGreeting, setDynamicGreeting] = useState({
    title: heroLeadership.title,
    subtitle: heroLeadership.subtitle ?? "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const memberName = params.get("member_name") || params.get("name");
    const authError = params.get("auth_error");

    if (memberName) {
      setDynamicGreeting({
        title: `Welcome back, ${memberName}`,
        subtitle:
          "We are ready to continue your growth journey. Explore programs and offers below.",
      });
    }

    if (authError) {
      const messages: Record<string, string> = {
        invalid_or_expired_link:
          "That sign-in link is invalid or has expired. Request a new email link.",
        missing_email_or_token:
          "The sign-in link was incomplete. Request a new email link.",
        google_unreachable:
          "The API server could not reach Google (oauth2.googleapis.com). This is not your browser — fix outbound HTTPS on the machine running Nest (VPN/firewall/DNS), or test: curl -I https://oauth2.googleapis.com. You can still sign in with the email link below.",
        google_unauthorized:
          "Google sign-in was rejected or misconfigured. Check GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI on the API server.",
        google_auth_failed: "Google sign-in failed. Try again or use email link.",
        google_access_denied: "Google sign-in was cancelled.",
        google_oauth_error: "Google returned an error. Try again.",
        missing_code: "Google did not return a sign-in code. Try again.",
        callback_timeout: "Sign-in timed out. Close this tab and try again.",
        backend_unreachable:
          "The app lost contact with the server. Check that the API is running, then sign in again.",
      };
      const message =
        messages[authError] ??
        "Sign-in did not complete. Try email link or Google again.";
      showToast(message, "error");
      setShowLoginModal(true);

      const next = new URL(window.location.href);
      next.searchParams.delete("auth_error");
      window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
    }
  }, [showToast]);

  const featuredOffers = useMemo(
    () => DISCOUNT_DATA.filter((d) => d.isFeatured),
    [],
  );

  const formatIDR = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);

  const heroTitleIsPersonalized =
    dynamicGreeting.title !== heroLeadership.title;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-neutral-200/90 bg-white">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Primary">
          <div className="flex h-[4.5rem] items-center justify-between">
            <a
              href="#hero"
              className="flex min-w-0 shrink-0 flex-col items-start gap-0.5"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <img
                src="https://www.maxwellleadership.com/wp-content/themes/jm/assets/images/logo.svg"
                alt="Maxwell Leadership"
                className="h-7 w-auto sm:h-8"
                width={160}
                height={32}
              />
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#1e3a5f]">
                Indonesia
              </span>
            </a>

            <div className="hidden items-center gap-1 lg:flex xl:gap-2">
              {LANDING_NAV.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-2 text-sm font-medium tracking-tight transition-colors xl:px-3 ${
                    index === 0
                      ? "text-neutral-900 underline decoration-neutral-900 decoration-1 underline-offset-[10px]"
                      : "text-neutral-700 hover:text-neutral-900"
                  }`}
                >
                  {item.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="ml-3 flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50"
              >
                <LogIn size={16} aria-hidden />
                Sign In
              </button>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="rounded-full border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-900"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </nav>

        {isMobileMenuOpen ? (
          <div className="border-t border-neutral-200 bg-white shadow-lg lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
              {LANDING_NAV.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-3 text-base font-medium ${
                    index === 0
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <section
        id="hero"
        className="relative flex min-h-[min(78vh,680px)] flex-col justify-center scroll-mt-[4.5rem] border-b border-slate-200 pt-[4.5rem]"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={heroLeadership.image}
            alt=""
            className="h-full w-full scale-105 object-cover object-center"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-r ${heroLeadership.overlayClassName ?? ""}`}
            aria-hidden
          />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {heroLeadership.kicker ? (
              <p className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#1e3a5f]">
                {heroLeadership.kicker}
              </p>
            ) : null}
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl md:leading-[1.1]">
              {dynamicGreeting.title}
            </h1>
            <p className="mt-4 text-lg font-normal leading-relaxed text-slate-700 md:text-xl">
              {dynamicGreeting.subtitle}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={
                  heroTitleIsPersonalized
                    ? "#programs"
                    : (heroLeadership.cta?.href ?? "#programs")
                }
                className="inline-flex items-center justify-center rounded-full bg-[#0f1b46] px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#0d1638] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f1b46] md:text-base"
              >
                {heroTitleIsPersonalized ? "Continue to Programs" : "Start Your Journey"}
              </a>
              <a
                href="#programs"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 md:text-base"
              >
                Explore Programs
              </a>
            </div>
            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-y-6 border-t border-slate-200 pt-8 text-left sm:grid-cols-4">
              <div>
                <p className="text-3xl font-bold text-slate-900">5M+</p>
                <p className="text-sm text-slate-600">Leaders Trained</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">160+</p>
                <p className="text-sm text-slate-600">Countries</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">40+</p>
                <p className="text-sm text-slate-600">Years of Legacy</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">#1</p>
                <p className="text-sm text-slate-600">Leadership Brand</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredOffers.length > 0 ? (
        <section id="offers" className="border-y border-indigo-100 bg-indigo-50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Limited Time Only
              </span>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Special Offers
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {featuredOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border-2 border-indigo-100 bg-white p-6 shadow-md transition-transform hover:-translate-y-1"
                >
                  <div className="absolute right-0 top-0 rounded-bl-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                    {offer.type === "BUNDLE_VOLUME" ? "BUNDLE" : "PROMO"}
                  </div>
                  <div className="mb-4">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <Tag size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{offer.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{offer.description}</p>
                  </div>

                  <div className="mt-auto border-t border-slate-100 pt-4">
                    <div className="mb-3 flex items-end justify-between">
                      <div className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-400">
                        Code: {offer.code}
                      </div>
                      <div className="text-right text-sm font-bold text-indigo-600">
                        {offer.type === "PERCENTAGE"
                          ? `Save ${offer.value}%`
                          : offer.type === "FIXED_AMOUNT"
                            ? `Save ${formatIDR(offer.value)}`
                            : `Buy ${offer.minQty}+ Save ${offer.value}%`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-lg bg-slate-900 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      Claim Offer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="programs" className="scroll-mt-[4.5rem] bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col items-end justify-between md:flex-row">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Signature Programs</h2>
              <p className="mt-2 text-slate-500">
                Pathways designed for every stage of your growth.
              </p>
            </div>
            <a
              href="#programs"
              className="mt-4 hidden items-center font-medium text-blue-600 hover:underline md:mt-0 md:flex"
            >
              View all programs <ArrowRight size={16} className="ml-1" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {PUBLIC_PROGRAMS.map((prog, idx) => (
              <div
                key={idx}
                className="group overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 transition-all duration-300 hover:shadow-xl"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={prog.image}
                    alt={prog.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 backdrop-blur">
                    {prog.price}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="mb-2 text-xl font-bold text-slate-900">{prog.title}</h3>
                  <p className="mb-6 line-clamp-2 text-sm text-slate-600">{prog.desc}</p>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-slate-300 py-2.5 font-medium text-slate-700 transition-all hover:border-transparent hover:bg-slate-900 hover:text-white"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="store" className="scroll-mt-[4.5rem] border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Shop
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Resources for Growth
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {PUBLIC_STORE.map((item, idx) => (
              <div
                key={idx}
                className="group rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="mb-4 aspect-[3/4] overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="mb-1 text-xs text-slate-400">{item.category}</div>
                <h4 className="mb-1 text-sm font-bold text-slate-900">{item.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-600">{item.price}</span>
                  <button
                    type="button"
                    className="rounded-full bg-slate-100 p-1.5 text-slate-600 transition-colors hover:bg-blue-600 hover:text-white"
                  >
                    <ShoppingBag size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="articles" className="scroll-mt-[4.5rem] bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold text-slate-900">Latest Insights</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {PUBLIC_ARTICLES.map((article, idx) => (
              <div
                key={idx}
                className="flex flex-col border-b border-slate-100 pb-8 md:border-none md:pb-0"
              >
                <span className="mb-2 text-xs font-bold uppercase text-blue-600">
                  {article.category}
                </span>
                <h3 className="mb-3 cursor-pointer text-xl font-bold text-slate-900 hover:text-blue-600">
                  {article.title}
                </h3>
                <div className="mt-auto flex items-center text-sm text-slate-500">
                  <span>{article.author}</span>
                  <span className="mx-2">•</span>
                  <span>{article.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        id="about"
        className="scroll-mt-[4.5rem] bg-[#2e1a4d] py-12 text-white/85"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <img
                src="https://www.maxwellleadership.com/wp-content/themes/jm/assets/images/logo.svg"
                alt="Maxwell Leadership"
                className="h-9 w-auto brightness-0 invert"
                width={180}
                height={36}
              />
              <p className="mt-4 text-sm leading-relaxed text-white/90">
                {LANDING_FOOTER.tagline}
              </p>
              <a
                href={`mailto:${LANDING_FOOTER.email}`}
                className="mt-3 inline-block text-sm font-medium text-white underline-offset-4 hover:underline"
              >
                {LANDING_FOOTER.email}
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Follow
              </p>
              <ul className="mt-3 flex flex-wrap gap-4">
                {LANDING_FOOTER.socials.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white hover:bg-white/10"
                      aria-label={s.label}
                    >
                      <FooterSocialIcon item={s} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/15 pt-8 text-center text-xs text-white/70 md:text-left">
            © {LANDING_FOOTER.copyrightYear}. All rights reserved.
          </div>
        </div>
      </footer>

      <a
        href={LANDING_WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
        aria-label="Chat on WhatsApp"
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      <MaxwellScoutWidget />

      {showLoginModal ? (
        <ModernLogin
          onLogin={(role, provider) => {
            setShowLoginModal(false);
            onLogin(role, provider);
          }}
          onClose={() => setShowLoginModal(false)}
        />
      ) : null}
    </div>
  );
};

export default LandingPage;
