import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { VerificationStatus, AvailabilityStatus } from "@prisma/client";
import { getDemoGuides } from "@/server/src/services/demoGuides.js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const rawCity = searchParams.get("city");
  const language = searchParams.get("language");

  const city = rawCity ? rawCity.split(",")[0].trim() : null;

  try {
    if (!locationId && !city) {
      return NextResponse.json(
        { error: "locationId or city query parameter is required" },
        { status: 400 }
      );
    }

    // Retrieve target location details
    let targetLocation = null;
    if (locationId) {
      targetLocation = await prisma.location.findUnique({
        where: { id: locationId }
      });
      if (!targetLocation) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
    }

    // Build query conditions: Must be VERIFIED and AVAILABLE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guideWhere: any = {
      verification_status: VerificationStatus.VERIFIED,
      availability_status: AvailabilityStatus.AVAILABLE,
    };

    if (locationId) {
      guideWhere.locations = {
        some: {
          location_id: locationId,
          is_active: true
        }
      };
    } else if (city) {
      guideWhere.locations = {
        some: {
          location: {
            city: { contains: city, mode: "insensitive" }
          },
          is_active: true
        }
      };
    }

    if (language) {
      guideWhere.languages = {
        has: language
      };
    }

    const guides = await prisma.guideProfile.findMany({
      where: guideWhere,
      include: {
        user: {
          select: {
            full_name: true,
            email: true,
            profile_photo_url: true,
          }
        },
        locations: {
          include: {
            location: true
          }
        },
        current_location: true,
      },
      orderBy: [
        { experience_years: "desc" },
        { created_at: "asc" }
      ]
    });

    const formattedGuides = guides.map(g => ({
      id: g.id,
      userId: g.user_id,
      name: g.user.full_name || "Licensed Guide",
      profilePhoto: g.profile_photo || g.user.profile_photo_url,
      bio: g.bio,
      rating: 4.8, // Baseline guide rating
      experienceYears: g.experience_years,
      hourlyRate: g.hourly_rate || 500,
      languages: g.languages,
      expertise: g.expertise,
      verificationStatus: g.verification_status,
      availabilityStatus: g.availability_status,
      isCurrentlyAtLocation: g.current_location_id === locationId,
      currentLocation: g.current_location ? {
        id: g.current_location.id,
        name: g.current_location.name,
      } : null,
      coveredLocations: g.locations.map(gl => ({
        id: gl.location.id,
        name: gl.location.name,
      }))
    }));

    if (formattedGuides.length > 0) {
      return NextResponse.json({
        location: targetLocation ? targetLocation.name : (city || "Area"),
        city: targetLocation ? targetLocation.city : (city || "Area"),
        totalAvailable: formattedGuides.length,
        guides: formattedGuides
      });
    }

    // Fallback: If DB has no guides registered for this location yet, serve verified demo guides
    const fallbackCity = city || (targetLocation ? targetLocation.city : "Mumbai");
    const demoGuides = getDemoGuides(fallbackCity);

    return NextResponse.json({
      location: targetLocation ? targetLocation.name : fallbackCity,
      city: fallbackCity,
      totalAvailable: demoGuides.length,
      guides: demoGuides,
      isDemo: true
    });
  } catch (error) {
    console.warn("DB offline or unreachable, serving verified demo guides fallback:", error);
    const fallbackCity = city || "Mumbai";
    const demoGuides = getDemoGuides(fallbackCity);

    return NextResponse.json({
      location: fallbackCity,
      city: fallbackCity,
      totalAvailable: demoGuides.length,
      guides: demoGuides,
      isDemo: true
    });
  }
}
