import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole, VerificationStatus } from "@prisma/client";
import { generateGuideVerificationToken } from "@/lib/auth/guide-tokens";
import { sendGuideVerificationEmail, buildVerificationUrl } from "@/lib/email/email-service";

// Cooldown period in seconds to prevent spamming verification emails
const RESEND_COOLDOWN_SECONDS = 60;

export async function POST() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Must have a guide profile or be a GUIDE
    const guideProfile = await prisma.guideProfile.findUnique({
      where: { user_id: authContext.userId },
      include: { user: true },
    });

    if (!guideProfile) {
      return NextResponse.json(
        { error: "No guide profile found for this account", code: "GUIDE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // If already verified, do not send another verification email
    if (guideProfile.verification_status === VerificationStatus.VERIFIED) {
      return NextResponse.json({
        message: "Your guide account is already verified.",
        alreadyVerified: true,
        verificationStatus: VerificationStatus.VERIFIED,
      });
    }

    // Rate limit / cooldown check:
    // Check if the last update occurred less than RESEND_COOLDOWN_SECONDS ago
    const now = Date.now();
    const lastUpdate = guideProfile.updated_at ? new Date(guideProfile.updated_at).getTime() : 0;
    const elapsedSeconds = Math.floor((now - lastUpdate) / 1000);

    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before requesting another verification email.`,
          code: "RATE_LIMITED",
          waitSeconds,
        },
        { status: 429 }
      );
    }

    // Generate new secure random token and invalidate old token
    const { rawToken, tokenHash, expiresAt } = generateGuideVerificationToken(24);

    await prisma.guideProfile.update({
      where: { id: guideProfile.id },
      data: {
        verification_token_hash: tokenHash,
        verification_token_expires_at: expiresAt,
        verification_token_used_at: null,
        verification_status: VerificationStatus.PENDING,
        updated_at: new Date(),
      },
    });

    // Send the verification email to the authenticated Clerk email
    await sendGuideVerificationEmail({
      to: authContext.email,
      guideName: guideProfile.user.full_name || authContext.fullName,
      rawToken,
    });

    return NextResponse.json({
      success: true,
      message: "A new verification email has been sent to your email address.",
      email: authContext.email,
      verificationUrl: buildVerificationUrl(rawToken),
    });
  } catch (error) {
    console.error("POST /api/guides/verify/resend error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}
