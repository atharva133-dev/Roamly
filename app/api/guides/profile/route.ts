import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole, VerificationStatus, AvailabilityStatus } from "@prisma/client";

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guideProfile = await prisma.guideProfile.findUnique({
      where: { user_id: authContext.userId },
      include: {
        locations: {
          include: {
            location: true,
          }
        },
        current_location: true,
      }
    });

    if (!guideProfile) {
      return NextResponse.json({ profile: null, isGuide: authContext.role === UserRole.GUIDE });
    }

    return NextResponse.json({
      profile: {
        id: guideProfile.id,
        bio: guideProfile.bio,
        languages: guideProfile.languages,
        expertise: guideProfile.expertise,
        experienceYears: guideProfile.experience_years,
        hourlyRate: guideProfile.hourly_rate,
        verificationStatus: guideProfile.verification_status,
        availabilityStatus: guideProfile.availability_status,
        currentLocation: guideProfile.current_location,
        locations: guideProfile.locations.map(gl => gl.location),
      }
    });
  } catch (error) {
    console.error("GET /api/guides/profile error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
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
      bio,
      languages = [],
      expertise = [],
      experienceYears = 0,
      hourlyRate = 500,
      locationIds = [],
      profilePhoto,
    } = body;

    // Upgrade user role to GUIDE if not already
    await prisma.user.update({
      where: { user_id: authContext.userId },
      data: {
        role: UserRole.GUIDE,
        profile_photo_url: profilePhoto || undefined,
      }
    });

    // Create or update guide profile with PENDING verification status
    const guideProfile = await prisma.guideProfile.upsert({
      where: { user_id: authContext.userId },
      create: {
        user_id: authContext.userId,
        bio,
        languages,
        expertise,
        experience_years: parseInt(experienceYears) || 0,
        hourly_rate: parseFloat(hourlyRate) || 500,
        profile_photo: profilePhoto || null,
        verification_status: VerificationStatus.PENDING,
        availability_status: AvailabilityStatus.AVAILABLE,
      },
      update: {
        bio,
        languages,
        expertise,
        experience_years: parseInt(experienceYears) || 0,
        hourly_rate: parseFloat(hourlyRate) || 500,
        profile_photo: profilePhoto || undefined,
        verification_status: VerificationStatus.PENDING,
      }
    });

    // Synchronize locations where guide is qualified to operate
    if (Array.isArray(locationIds) && locationIds.length > 0) {
      await prisma.guideLocation.deleteMany({
        where: { guide_id: guideProfile.id }
      });

      await prisma.guideLocation.createMany({
        data: locationIds.map((locId: string) => ({
          guide_id: guideProfile.id,
          location_id: locId,
          is_active: true,
        }))
      });
    }

    return NextResponse.json({
      message: "Guide application submitted successfully. Verification status: PENDING",
      guideProfileId: guideProfile.id,
      verificationStatus: guideProfile.verification_status,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guides/profile error:", error);
    return NextResponse.json({ error: "Failed to submit guide application" }, { status: 500 });
  }
}
