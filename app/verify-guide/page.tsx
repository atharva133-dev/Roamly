"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Shield,
  LayoutDashboard,
} from "lucide-react";

function VerifyGuideContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"SUCCESS" | "ALREADY_VERIFIED" | "EXPIRED" | "ALREADY_USED" | "INVALID" | "ERROR">("INVALID");
  const [errorMessage, setErrorMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    // If error was passed directly via redirect
    if (errorParam) {
      setLoading(false);
      if (errorParam === "expired") {
        setStatus("EXPIRED");
        setErrorMessage("Your verification link has expired (links are valid for 24 hours).");
      } else if (errorParam === "already_used") {
        setStatus("ALREADY_USED");
        setErrorMessage("This verification link has already been used.");
      } else if (errorParam === "invalid_token") {
        setStatus("INVALID");
        setErrorMessage("The verification token provided is invalid or malformed.");
      } else {
        setStatus("ERROR");
        setErrorMessage("An unexpected verification error occurred.");
      }
      return;
    }

    if (!token) {
      setLoading(false);
      setStatus("INVALID");
      setErrorMessage("No verification token was provided in the URL.");
      return;
    }

    // Verify token with backend
    async function verify() {
      try {
        const res = await fetch(`/api/guides/verify?token=${encodeURIComponent(token!)}&format=json`);
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.code === "ALREADY_VERIFIED") {
            setStatus("ALREADY_VERIFIED");
          } else {
            setStatus("SUCCESS");
          }
        } else {
          if (data.code === "EXPIRED_TOKEN") {
            setStatus("EXPIRED");
            setErrorMessage(data.error || "Verification token has expired.");
          } else if (data.code === "ALREADY_USED") {
            setStatus("ALREADY_USED");
            setErrorMessage(data.error || "Verification token has already been used.");
          } else if (data.code === "ALREADY_VERIFIED") {
            setStatus("ALREADY_VERIFIED");
          } else {
            setStatus("INVALID");
            setErrorMessage(data.error || "Invalid verification token.");
          }
        }
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("ERROR");
        setErrorMessage("Failed to connect to the verification server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token, errorParam]);

  const handleResend = async () => {
    setIsResending(true);
    setResendNotice(null);
    try {
      const res = await fetch("/api/guides/verify/resend", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setResendNotice("A new verification link has been sent to your email!");
      } else {
        setResendNotice(data.error || "Unable to resend email. Please ensure you are logged in.");
      }
    } catch {
      setResendNotice("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFBF8] via-[#f5f7f0] to-[#eef3e4] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#e5e7db] shadow-xl p-8 sm:p-10 text-center relative overflow-hidden">
        {/* Subtle decorative background blur */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#DFECC6]/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#485C11]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Official Roamly Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Roamly - Travel Smarter Together"
            width={140}
            height={44}
            className="h-9 w-auto object-contain"
            priority
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-8 space-y-4">
            <Loader2 className="w-14 h-14 text-[#485C11] animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-[#1a1a1a]">Verifying Your Guide Account...</h2>
            <p className="text-xs text-[#6b7280]">
              Checking cryptographic token security and activating your local expert profile.
            </p>
          </div>
        )}

        {/* Success State */}
        {!loading && (status === "SUCCESS" || status === "ALREADY_VERIFIED") && (
          <div className="py-4 space-y-6 animate-fade-in-up">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-[#1a1a1a]">
                {status === "SUCCESS" ? "Email Verified Successfully!" : "Account Already Verified!"}
              </h2>
              <p className="text-sm text-[#4b5563] mt-2 leading-relaxed">
                Your guide account is now active. Your profile is publicly discoverable and eligible to receive guide booking requests.
              </p>
            </div>

            <div className="p-4 bg-[#f4f7ee] rounded-2xl border border-[#d6dacb] text-left text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-[#485C11] font-semibold">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Status: VERIFIED &amp; ACTIVE</span>
              </div>
              <p className="text-[#6b7280]">
                Admin approval is not required. You have full access to customize your schedule, pricing, and operating areas.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href="/guide-dashboard?verified=true"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#485C11] hover:bg-[#3a4d0d] text-white px-6 py-3.5 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Guide Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/guides"
                className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-[#e5e7db] text-[#1a1a1a] px-6 py-3 rounded-full font-medium text-xs transition-all"
              >
                View Public Guides Directory
              </Link>
            </div>
          </div>
        )}

        {/* Failure / Error State */}
        {!loading && status !== "SUCCESS" && status !== "ALREADY_VERIFIED" && (
          <div className="py-4 space-y-6">
            <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
              {status === "EXPIRED" ? (
                <AlertTriangle className="w-10 h-10 text-amber-600" />
              ) : (
                <XCircle className="w-10 h-10 text-rose-600" />
              )}
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-[#1a1a1a]">
                {status === "EXPIRED"
                  ? "Verification Link Expired"
                  : status === "ALREADY_USED"
                  ? "Link Already Used"
                  : "Verification Failed"}
              </h2>
              <p className="text-sm text-[#4b5563] mt-2 leading-relaxed">
                {errorMessage || "We could not verify your email with the provided link."}
              </p>
            </div>

            {resendNotice && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                {resendNotice}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={handleResend}
                disabled={isResending}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#485C11] hover:bg-[#3a4d0d] text-white px-6 py-3.5 rounded-full font-semibold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isResending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Resend Verification Email
              </button>

              <Link
                href="/guide-dashboard"
                className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-[#e5e7db] text-[#1a1a1a] px-6 py-3 rounded-full font-medium text-xs transition-all"
              >
                Go to Guide Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyGuidePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFBF8] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#485C11] animate-spin" />
        </div>
      }
    >
      <VerifyGuideContent />
    </Suspense>
  );
}
