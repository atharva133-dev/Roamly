import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole, VerificationStatus, AvailabilityStatus } from "@prisma/client";
import { generateGuideVerificationToken } from "@/lib/auth/guide-tokens";
import { sendGuideVerificationEmail, buildVerificationUrl } from "@/lib/email/email-service";

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: authContext.userId },
      select: {
        full_name: true,
        email: true,
        profile_photo_url: true,
        role: true,
      },
    });

    const guideProfile = await prisma.guideProfile.findUnique({
      where: { user_id: authContext.userId },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
        current_location: true,
      },
    });

    if (!guideProfile) {
      return NextResponse.json({
        profile: null,
        user: user
          ? {
              fullName: user.full_name,
              email: user.email,
              profilePhoto: user.profile_photo_url,
            }
          : null,
        isGuide: authContext.role === UserRole.GUIDE,
      });
    }

    return NextResponse.json({
      profile: {
        id: guideProfile.id,
        phone: guideProfile.phone,
        bio: guideProfile.bio,
        profilePhoto: guideProfile.profile_photo,
        languages: guideProfile.languages,
        expertise: guideProfile.expertise,
        experienceYears: guideProfile.experience_years,
        hourlyRate: guideProfile.hourly_rate,
        currency: guideProfile.currency,
        availableDays: guideProfile.available_days,
        availableTimeFrom: guideProfile.available_time_from,
        availableTimeTo: guideProfile.available_time_to,
        verificationStatus: guideProfile.verification_status,
        availabilityStatus: guideProfile.availability_status,
        isEmailVerified: guideProfile.verification_status === VerificationStatus.VERIFIED,
        emailVerifiedAt: guideProfile.email_verified_at,
        currentLocation: guideProfile.current_location,
        locations: guideProfile.locations.map((gl) => ({
          ...gl.location,
          availableFrom: gl.available_from,
          availableTo: gl.available_to,
        })),
      },
      user: user
        ? {
            fullName: user.full_name,
            email: user.email,
            profilePhoto: user.profile_photo_url,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/guides/profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      fullName,
      phone,
      bio,
      languages = [],
      expertise = [],
      experienceYears = 0,
      hourlyRate = 500,
      currency = "INR",
      availableDays = [],
      availableTimeFrom,
      availableTimeTo,
      profilePhoto,
      // Working location from Google Places
      workingLocation,
    } = body;

    // 1. Validate all required guide information
    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { error: "A valid contact phone number (10-15 digits) is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(languages) || languages.length === 0) {
      return NextResponse.json(
        { error: "At least one spoken language must be selected" },
        { status: 400 }
      );
    }
    if (!Array.isArray(availableDays) || availableDays.length === 0) {
      return NextResponse.json(
        { error: "At least one available day of the week must be selected" },
        { status: 400 }
      );
    }
    const parsedRate = parseFloat(String(hourlyRate));
    if (isNaN(parsedRate) || parsedRate < 0) {
      return NextResponse.json(
        { error: "A valid non-negative hourly rate is required" },
        { status: 400 }
      );
    }

    // Security check: Ignore / reject client-supplied role or verification status
    // Role is strictly assigned server-side to GUIDE
    await prisma.user.update({
      where: { user_id: authContext.userId },
      data: {
        role: UserRole.GUIDE,
        full_name: fullName || undefined,
        profile_photo_url: profilePhoto || undefined,
        profile_completed: true,
      },
    });

    // Check if existing profile is already verified
    const existingProfile = await prisma.guideProfile.findUnique({
      where: { user_id: authContext.userId },
    });

    const isAlreadyVerified = existingProfile?.verification_status === VerificationStatus.VERIFIED;

    // Generate secure email verification token if not yet verified
    let tokenData: { rawToken: string; tokenHash: string; expiresAt: Date } | null = null;
    if (!isAlreadyVerified) {
      tokenData = generateGuideVerificationToken(24);
    }

    // Create or update guide profile
    const guideProfile = await prisma.guideProfile.upsert({
      where: { user_id: authContext.userId },
      create: {
        user_id: authContext.userId,
        phone: phone || null,
        bio: bio || null,
        languages: Array.isArray(languages) ? languages : [],
        expertise: Array.isArray(expertise) ? expertise : [],
        experience_years: parseInt(String(experienceYears)) || 0,
        hourly_rate: parseFloat(String(hourlyRate)) || 500,
        currency: currency || "INR",
        available_days: Array.isArray(availableDays) ? availableDays : [],
        available_time_from: availableTimeFrom || null,
        available_time_to: availableTimeTo || null,
        profile_photo: profilePhoto || null,
        verification_status: VerificationStatus.PENDING,
        availability_status: AvailabilityStatus.AVAILABLE,
        verification_token_hash: tokenData?.tokenHash || null,
        verification_token_expires_at: tokenData?.expiresAt || null,
        verification_token_used_at: null,
      },
      update: {
        phone: phone || undefined,
        bio: bio !== undefined ? bio : undefined,
        languages: Array.isArray(languages) ? languages : undefined,
        expertise: Array.isArray(expertise) ? expertise : undefined,
        experience_years: parseInt(String(experienceYears)) || 0,
        hourly_rate: parseFloat(String(hourlyRate)) || 500,
        currency: currency || "INR",
        available_days: Array.isArray(availableDays) ? availableDays : undefined,
        available_time_from: availableTimeFrom || null,
        available_time_to: availableTimeTo || null,
        profile_photo: profilePhoto !== undefined ? profilePhoto : undefined,
        // Only update verification token if not already verified
        ...(isAlreadyVerified
          ? {}
          : {
              verification_status: VerificationStatus.PENDING,
              verification_token_hash: tokenData?.tokenHash || null,
              verification_token_expires_at: tokenData?.expiresAt || null,
              verification_token_used_at: null,
            }),
      },
    });

    // Handle working location
    if (workingLocation && workingLocation.placeId) {
      let location = await prisma.location.findUnique({
        where: { google_place_id: workingLocation.placeId },
      });

      if (!location) {
        location = await prisma.location.create({
          data: {
            name: workingLocation.name || workingLocation.formattedAddress,
            city: workingLocation.city || "",
            state: workingLocation.state || null,
            country: workingLocation.country || "India",
            google_place_id: workingLocation.placeId,
            formatted_address: workingLocation.formattedAddress || null,
            latitude: workingLocation.latitude || null,
            longitude: workingLocation.longitude || null,
            type: "attraction",
            is_active: true,
          },
        });
      }

      await prisma.guideLocation.deleteMany({
        where: { guide_id: guideProfile.id },
      });

      await prisma.guideLocation.create({
        data: {
          guide_id: guideProfile.id,
          location_id: location.id,
          is_active: true,
          available_from: availableTimeFrom || "09:00",
          available_to: availableTimeTo || "18:00",
        },
      });

      await prisma.guideProfile.update({
        where: { id: guideProfile.id },
        data: {
          current_location_id: location.id,
          last_location_update: new Date(),
        },
      });
    }

    // Send verification email only if not already verified
    if (!isAlreadyVerified && tokenData) {
      try {
        await sendGuideVerificationEmail({
          to: authContext.email,
          guideName: fullName || authContext.fullName,
          rawToken: tokenData.rawToken,
        });
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }
    }

    return NextResponse.json(
      {
        message: isAlreadyVerified
          ? "Guide profile updated successfully. Account is verified."
          : "Guide profile registered successfully. Verification email sent.",
        guideProfileId: guideProfile.id,
        verificationStatus: guideProfile.verification_status,
        isEmailVerified: guideProfile.verification_status === VerificationStatus.VERIFIED,
        verificationUrl: tokenData ? buildVerificationUrl(tokenData.rawToken) : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/guides/profile error:", error);
    return NextResponse.json(
      {
        error: "Failed to submit guide application",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Allows an authenticated guide to update their own profile fields
 * (phone, bio, languages, expertise, experience, hourly rate, availability status,
 * available days, available times, profile photo, working location)
 * without requiring admin approval and without altering email verification status.
 */
export async function PATCH(req: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guideProfile = await prisma.guideProfile.findUnique({
      where: { user_id: authContext.userId },
    });

    if (!guideProfile) {
      return NextResponse.json(
        { error: "Guide profile not found for authenticated user" },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Security check: Check if client passed an explicit guideId or userId attempting IDOR
    if (body.guideId && body.guideId !== guideProfile.id) {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify another guide's profile" },
        { status: 403 }
      );
    }
    if (body.userId && body.userId !== authContext.userId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify another user's profile" },
        { status: 403 }
      );
    }

    // Extract allowed editable fields (strictly ignore role, verificationStatus, verificationToken)
    const {
      fullName,
      phone,
      bio,
      languages,
      expertise,
      experienceYears,
      hourlyRate,
      currency,
      availabilityStatus,
      availableDays,
      availableTimeFrom,
      availableTimeTo,
      profilePhoto,
      workingLocation,
    } = body;

    // Validate availabilityStatus if provided
    if (availabilityStatus && !Object.values(AvailabilityStatus).includes(availabilityStatus)) {
      return NextResponse.json(
        { error: "Invalid availability status. Allowed: AVAILABLE, BUSY, OFFLINE" },
        { status: 400 }
      );
    }

    // Update User info if fullName or photo was changed
    if (fullName !== undefined || profilePhoto !== undefined) {
      await prisma.user.update({
        where: { user_id: authContext.userId },
        data: {
          full_name: fullName !== undefined ? fullName : undefined,
          profile_photo_url: profilePhoto !== undefined ? profilePhoto : undefined,
        },
      });
    }

    // Update guide profile fields
    const updatedProfile = await prisma.guideProfile.update({
      where: { id: guideProfile.id },
      data: {
        phone: phone !== undefined ? phone : undefined,
        bio: bio !== undefined ? bio : undefined,
        languages: Array.isArray(languages) ? languages : undefined,
        expertise: Array.isArray(expertise) ? expertise : undefined,
        experience_years: experienceYears !== undefined ? parseInt(String(experienceYears)) || 0 : undefined,
        hourly_rate: hourlyRate !== undefined ? parseFloat(String(hourlyRate)) || 0 : undefined,
        currency: currency !== undefined ? currency : undefined,
        availability_status: availabilityStatus || undefined,
        available_days: Array.isArray(availableDays) ? availableDays : undefined,
        available_time_from: availableTimeFrom !== undefined ? availableTimeFrom : undefined,
        available_time_to: availableTimeTo !== undefined ? availableTimeTo : undefined,
        profile_photo: profilePhoto !== undefined ? profilePhoto : undefined,
      },
    });

    // Update working location if specified
    if (workingLocation && workingLocation.placeId) {
      let location = await prisma.location.findUnique({
        where: { google_place_id: workingLocation.placeId },
      });

      if (!location) {
        location = await prisma.location.create({
          data: {
            name: workingLocation.name || workingLocation.formattedAddress,
            city: workingLocation.city || "",
            state: workingLocation.state || null,
            country: workingLocation.country || "India",
            google_place_id: workingLocation.placeId,
            formatted_address: workingLocation.formattedAddress || null,
            latitude: workingLocation.latitude || null,
            longitude: workingLocation.longitude || null,
            type: "attraction",
            is_active: true,
          },
        });
      }

      await prisma.guideLocation.deleteMany({
        where: { guide_id: guideProfile.id },
      });

      await prisma.guideLocation.create({
        data: {
          guide_id: guideProfile.id,
          location_id: location.id,
          is_active: true,
          available_from: updatedProfile.available_time_from || "09:00",
          available_to: updatedProfile.available_time_to || "18:00",
        },
      });

      await prisma.guideProfile.update({
        where: { id: guideProfile.id },
        data: {
          current_location_id: location.id,
          last_location_update: new Date(),
        },
      });
    }

    return NextResponse.json({
      message: "Guide profile updated successfully",
      profile: {
        id: updatedProfile.id,
        phone: updatedProfile.phone,
        bio: updatedProfile.bio,
        hourlyRate: updatedProfile.hourly_rate,
        availabilityStatus: updatedProfile.availability_status,
        verificationStatus: updatedProfile.verification_status,
        isEmailVerified: updatedProfile.verification_status === VerificationStatus.VERIFIED,
      },
    });
  } catch (error) {
    console.error("PATCH /api/guides/profile error:", error);
    return NextResponse.json(
      { error: "Failed to update guide profile" },
      { status: 500 }
    );
  }
}
