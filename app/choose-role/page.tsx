"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import {
  Compass,
  Plane,
  ArrowRight,
  Shield,
  Sparkles,
  Loader2,
  CalendarCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ChooseRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noticeParam = searchParams.get("notice");

  const { isLoaded, isSignedIn, user } = useUser();
  const [selectedIntent, setSelectedIntent] = useState<"traveler" | "guide" | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [dbUserRole, setDbUserRole] = useState<string | null>(null);

  // Check if an already authenticated user visits this page
  useEffect(() => {
    let isMounted = true;

    async function checkExistingRole() {
      if (!isLoaded) return;

      if (isSignedIn) {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              if (isMounted) setDbUserRole(data.user.role);

              // If logged-in GUIDE: redirect to /guide-dashboard automatically
              if (data.user.role === "GUIDE") {
                setIsRedirecting(true);
                router.replace("/guide-dashboard");
                return;
              }

              // If logged-in SUPER_ADMIN: preserve existing admin routing
              if (data.user.role === "SUPER_ADMIN") {
                setIsRedirecting(true);
                router.replace("/admin-guides");
                return;
              }

              // If logged-in USER (Traveler): redirect to AI Trip planner (/llm) automatically
              if (data.user.role === "USER") {
                setIsRedirecting(true);
                router.replace("/llm");
                return;
              }
            }
          }
        } catch (err) {
          console.error("Error checking user role:", err);
        }
      }

      if (isMounted) setCheckingAuth(false);
    }

    checkExistingRole();
    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, router]);

  const handleRoleSelection = (role: "traveler" | "guide") => {
    setSelectedIntent(role);
    setIsRedirecting(true);

    // Save intent in a short-lived cookie as fallback across OAuth redirects
    try {
      document.cookie = `roamly_auth_intent=${role}; path=/; max-age=600; SameSite=Lax`;
    } catch {
      // ignore in environments with restricted cookies
    }

    // If user is already authenticated as a USER in database:
    if (isSignedIn && dbUserRole === "USER") {
      if (role === "guide") {
        // User clicked "Continue as Guide", but account is registered as Traveler
        router.push("/choose-role?notice=traveler_account");
        setIsRedirecting(false);
        return;
      } else {
        // Continue to normal traveler experience — always open AI Trip planner (/llm)
        router.push("/llm");
        return;
      }
    }

    // Redirect to Clerk sign-in with destination intent
    const redirectUrl = `/auth-redirect?intent=${role}`;
    const targetUrl = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;
    router.push(targetUrl);
  };

  if (checkingAuth && isSignedIn) {
    return (
      <div className="min-h-screen bg-[#FAFBF8] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-[#3f520f] animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Checking account credentials...</h2>
        <p className="text-xs text-[#6b7280] mt-1">Directing you to your workspace.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFBF8] via-[#f7f8f4] to-[#eef3e6] flex flex-col justify-between selection:bg-[#DFECC6] selection:text-[#38480e]">
      {/* ─── Top Brand Header ─── */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="Roamly - Travel Smarter Together"
            width={160}
            height={50}
            className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            priority
          />
        </Link>

        <Link
          href="/"
          className="text-xs font-semibold text-[#4a5043] hover:text-[#1a1a1a] transition-colors"
        >
          ← Back to Explore
        </Link>
      </header>

      {/* ─── Main Content ─── */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* Title & Subtitle */}
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFECC6]/60 border border-[#8E9C78]/40 text-[#38480e] text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="size-3.5" />
            Sign In Portal
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1a1a1a] tracking-tight">
            Welcome to Roamly
          </h1>
          <p className="text-base sm:text-lg text-[#6b7280] mt-3">
            How would you like to continue?
          </p>
        </div>

        {/* ─── Notice Banner (Shown if Traveler account selected Guide Login) ─── */}
        {noticeParam === "traveler_account" && (
          <div className="mb-8 p-5 rounded-2xl bg-amber-50/90 border border-amber-300/80 text-amber-950 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  This account is currently registered as a Traveler.
                </h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  You are signed in with a Traveler account. To access guide tools and receive traveler booking requests, you can register as a verified guide.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Link
                href="/guide-register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#3f520f] hover:bg-[#32420b] text-white shadow-xs transition-all"
              >
                Register as a Guide
                <ArrowRight className="size-3" />
              </Link>
              <Link
                href="/llm"
                className="inline-flex items-center px-3.5 py-2 rounded-full text-xs font-medium bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 transition-all"
              >
                Continue to AI Planner
              </Link>
            </div>
          </div>
        )}

        {/* ─── Two Large Selection Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* CARD 1: Traveler */}
          <Card
            className={`relative p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between group hover:shadow-xl ${
              selectedIntent === "traveler"
                ? "border-[#3f520f] ring-2 ring-[#3f520f]/20 bg-white shadow-md"
                : "border-[#e5e7db] bg-white hover:border-[#8E9C78]"
            }`}
          >
            <div>
              {/* Card Icon & Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="size-14 rounded-2xl bg-[#DFECC6]/60 text-[#3f520f] flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <Plane className="size-7 -rotate-45" />
                </div>
                <Badge
                  variant="outline"
                  className="bg-[#FAFBF8] border-[#e5e7db] text-[#4a5043] text-xs font-medium"
                >
                  Explore &amp; Book
                </Badge>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">
                Traveler
              </h2>
              <p className="text-sm text-[#4b5563] mt-2.5 leading-relaxed">
                Plan personalized trips, discover destinations, find guides, and book experiences.
              </p>

              {/* Features List */}
              <div className="mt-6 pt-5 border-t border-[#f0f2eb] space-y-2.5 text-xs text-[#6b7280]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#3f520f]" />
                  <span>AI-powered smart itinerary builder</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#3f520f]" />
                  <span>Direct reservations with verified local guides</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#3f520f]" />
                  <span>Personal trip schedule and interactive map tools</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8 pt-4">
              <Button
                id="btn-continue-traveler"
                disabled={isRedirecting}
                onClick={() => handleRoleSelection("traveler")}
                className="w-full h-12 rounded-full font-semibold text-sm bg-[#3f520f] hover:bg-[#32420b] text-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {isRedirecting && selectedIntent === "traveler" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Continue as Traveler
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* CARD 2: Tour Guide */}
          <Card
            className={`relative p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between group hover:shadow-xl ${
              selectedIntent === "guide"
                ? "border-[#3f520f] ring-2 ring-[#3f520f]/20 bg-white shadow-md"
                : "border-[#e5e7db] bg-white hover:border-[#8E9C78]"
            }`}
          >
            <div>
              {/* Card Icon & Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="size-14 rounded-2xl bg-[#DFECC6]/60 text-[#3f520f] flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <Compass className="size-7" />
                </div>
                <Badge
                  variant="outline"
                  className="bg-[#FAFBF8] border-[#e5e7db] text-[#38480e] font-semibold text-xs"
                >
                  Local Expert Portal
                </Badge>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">
                Tour Guide
              </h2>
              <p className="text-sm text-[#4b5563] mt-2.5 leading-relaxed">
                Manage your guide profile, availability, pricing, location, and traveler requests.
              </p>

              {/* Features List */}
              <div className="mt-6 pt-5 border-t border-[#f0f2eb] space-y-2.5 text-xs text-[#6b7280]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#3f520f]" />
                  <span>Receive and accept tour booking requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#3f520f]" />
                  <span>Set your hourly rate, availability, and active areas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#3f520f]" />
                  <span>Instant email-verified profile status (no admin wait)</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8 pt-4">
              <Button
                id="btn-continue-guide"
                disabled={isRedirecting}
                onClick={() => handleRoleSelection("guide")}
                className="w-full h-12 rounded-full font-semibold text-sm bg-white hover:bg-[#f7f8f4] text-[#3f520f] border-2 border-[#3f520f] shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {isRedirecting && selectedIntent === "guide" ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-[#3f520f]" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Continue as Guide
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* ─── Footer Section: Register as Guide ─── */}
        <div className="mt-10 sm:mt-12 text-center p-6 rounded-2xl bg-white/70 border border-[#e5e7db] backdrop-blur-xs max-w-lg mx-auto shadow-xs">
          <p className="text-sm text-[#4b5563] font-medium">
            New to Roamly as a guide?
          </p>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Share your local culture, lead authentic tours, and earn on your schedule.
          </p>
          <div className="mt-4">
            <Link
              id="btn-register-guide"
              href="/guide-register"
              className="inline-flex items-center justify-center gap-2 bg-[#FAFBF8] hover:bg-[#DFECC6]/40 text-[#3f520f] border border-[#8E9C78]/60 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-200 shadow-2xs hover:shadow-xs"
            >
              <Briefcase className="size-3.5" />
              Register as a Guide
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-[#9ca3af]">
        © {new Date().getFullYear()} Roamly Technologies Inc. Authenticated via Clerk.
      </footer>
    </div>
  );
}

export default function ChooseRolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFBF8] flex items-center justify-center">
          <Loader2 className="size-8 text-[#3f520f] animate-spin" />
        </div>
      }
    >
      <ChooseRoleContent />
    </Suspense>
  );
}
