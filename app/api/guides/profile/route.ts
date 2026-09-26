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

    // Upgrade user role to GUIDE and update user name/photo
    await prisma.user.update({
      where: { user_id: authContext.userId },
      data: {
        role: UserRole.GUIDE,
        full_name: fullName || undefined,
        profile_photo_url: profilePhoto || undefined,
        profile_completed: true,
      },
    });

    // Create or update guide profile
    const guideProfile = await prisma.guideProfile.upsert({
      where: { user_id: authContext.userId },
      create: {
        user_id: authContext.userId,
        phone: phone || null,
        bio,
        languages,
        expertise,
        experience_years: parseInt(String(experienceYears)) || 0,
        hourly_rate: parseFloat(String(hourlyRate)) || 500,
        currency: currency || "INR",
        available_days: availableDays,
        available_time_from: availableTimeFrom || null,
        available_time_to: availableTimeTo || null,
        profile_photo: profilePhoto || null,
        verification_status: VerificationStatus.PENDING,
        availability_status: AvailabilityStatus.AVAILABLE,
      },
      update: {
        phone: phone || undefined,
        bio,
        languages,
        expertise,
        experience_years: parseInt(String(experienceYears)) || 0,
        hourly_rate: parseFloat(String(hourlyRate)) || 500,
        currency: currency || "INR",
        available_days: availableDays,
        available_time_from: availableTimeFrom || undefined,
        available_time_to: availableTimeTo || undefined,
        profile_photo: profilePhoto || undefined,
      },
    });

    // Handle working location from Google Places
    if (workingLocation && workingLocation.placeId) {
      // Upsert the location in the locations table
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

      // Clear existing guide locations and set new primary one
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

      // Set as current location
      await prisma.guideProfile.update({
        where: { id: guideProfile.id },
        data: {
          current_location_id: location.id,
          last_location_update: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        message:
          "Guide profile created successfully. Verification status: PENDING",
        guideProfileId: guideProfile.id,
        verificationStatus: guideProfile.verification_status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/guides/profile error:", error);
    return NextResponse.json(
      { error: "Failed to submit guide application" },
      { status: 500 }
    );
  }
}
