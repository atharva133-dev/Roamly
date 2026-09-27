import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { VerificationStatus } from "@prisma/client";
import { hashVerificationToken, evaluateTokenStatus } from "@/lib/auth/guide-tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    req.headers.get("accept")?.includes("application/json");

  const baseUrl = url.origin;

  // 1. Validate token existence
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    if (wantsJson) {
      return NextResponse.json(
        { success: false, code: "INVALID_TOKEN", error: "Verification token is missing or malformed." },
        { status: 400 }
      );
    }
    return NextResponse.redirect(new URL("/verify-guide?error=invalid_token", baseUrl));
  }

  try {
    // 2. Hash token securely using SHA-256 (never store or query by raw token)
    const tokenHash = hashVerificationToken(token.trim());

    // 3. Find matching verification record
    const guide = await prisma.guideProfile.findFirst({
      where: { verification_token_hash: tokenHash },
      include: {
        user: {
          select: {
            user_id: true,
            email: true,
            full_name: true,
            role: true,
          },
        },
      },
    });

    // 4, 5, 6. Check token status (invalid, already used, already verified, expired)
    const tokenStatus = evaluateTokenStatus({
      recordFound: !!guide,
      tokenUsedAt: guide?.verification_token_used_at,
      tokenExpiresAt: guide?.verification_token_expires_at,
      isVerified: guide?.verification_status === VerificationStatus.VERIFIED,
    });

    if (tokenStatus === "INVALID") {
      if (wantsJson) {
        return NextResponse.json(
          { success: false, code: "INVALID_TOKEN", error: "Invalid verification token. Guide account not found." },
          { status: 404 }
        );
      }
      return NextResponse.redirect(new URL("/verify-guide?error=invalid_token", baseUrl));
    }

    if (tokenStatus === "ALREADY_VERIFIED") {
      if (wantsJson) {
        return NextResponse.json(
          {
            success: true,
            code: "ALREADY_VERIFIED",
            message: "Guide email is already verified.",
            guideId: guide?.id,
            verified: true,
          },
          { status: 200 }
        );
      }
      return NextResponse.redirect(new URL("/guide-dashboard?verified=already", baseUrl));
    }

    if (tokenStatus === "ALREADY_USED") {
      if (wantsJson) {
        return NextResponse.json(
          {
            success: false,
            code: "ALREADY_USED",
            error: "This verification token has already been used.",
          },
          { status: 400 }
        );
      }
      return NextResponse.redirect(new URL("/verify-guide?error=already_used", baseUrl));
    }

    if (tokenStatus === "EXPIRED") {
      if (wantsJson) {
        return NextResponse.json(
          {
            success: false,
            code: "EXPIRED_TOKEN",
            error: "This verification token has expired. Please request a new verification email.",
          },
          { status: 400 }
        );
      }
      return NextResponse.redirect(new URL("/verify-guide?error=expired", baseUrl));
    }

    // 7, 8, 9, 10, 11. Mark verification complete atomically
    const now = new Date();
    const updatedGuide = await prisma.guideProfile.update({
      where: { id: guide!.id },
      data: {
        verification_status: VerificationStatus.VERIFIED,
        email_verified_at: now,
        verification_token_used_at: now,
      },
      include: {
        user: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        code: "VERIFIED",
        message: "Guide email verified successfully! Your guide profile is now active.",
        guideId: updatedGuide.id,
        emailVerifiedAt: updatedGuide.email_verified_at,
        verificationStatus: updatedGuide.verification_status,
      });
    }

    // Redirect to guide dashboard with verified=true parameter
    return NextResponse.redirect(new URL("/guide-dashboard?verified=true", baseUrl));
  } catch (error) {
    console.error("GET /api/guides/verify error:", error);
    if (wantsJson) {
      return NextResponse.json(
        { success: false, code: "SERVER_ERROR", error: "Internal server error during verification" },
        { status: 500 }
      );
    }
    return NextResponse.redirect(new URL("/verify-guide?error=server_error", baseUrl));
  }
}
