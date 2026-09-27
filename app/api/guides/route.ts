import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import {
  discoverEligibleGuides,
  TripAreaInput,
  DEFAULT_GUIDE_MATCH_RADIUS_KM,
} from "@/lib/guides/guide-matching";

export async function GET(req: Request) {
  try {
    // RBAC: Verify if authenticated caller is a GUIDE
    // Guides cannot use guide discovery to act as travelers (TEST 15)
    const authContext = await getAuthenticatedUser();
    if (authContext && authContext.role === UserRole.GUIDE) {
      return NextResponse.json(
        {
          error: "Forbidden: Guides cannot perform traveler guide discovery.",
          code: "FORBIDDEN",
          currentRole: authContext.role,
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const rawCity = searchParams.get("city");
    const language = searchParams.get("language");
    const selectedAreasParam =
      searchParams.get("selectedAreas") || searchParams.get("areas");
    const areaIdsParam =
      searchParams.get("areaIds") || searchParams.get("locationIds");
    const radiusParam = searchParams.get("radius");
    const latParam = searchParams.get("latitude") || searchParams.get("lat");
    const lngParam = searchParams.get("longitude") || searchParams.get("lng");

    const radiusKm = radiusParam
      ? parseFloat(radiusParam)
      : DEFAULT_GUIDE_MATCH_RADIUS_KM;
    const lat = latParam ? parseFloat(latParam) : null;
    const lng = lngParam ? parseFloat(lngParam) : null;

    const tripAreas: TripAreaInput[] = [];

    // Parse multiple or single areas
    if (selectedAreasParam) {
      const parts = selectedAreasParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const part of parts) {
        tripAreas.push({ name: part, city: part });
      }
    }

    if (areaIdsParam) {
      const ids = areaIdsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const id of ids) {
        tripAreas.push({ name: id, locationId: id });
      }
    }

    if (locationId && !tripAreas.some((a) => a.locationId === locationId)) {
      tripAreas.push({ name: locationId, locationId });
    }

    if (rawCity) {
      const cityClean = rawCity.split(",")[0].trim();
      if (cityClean && !tripAreas.some((a) => a.name.toLowerCase() === cityClean.toLowerCase())) {
        tripAreas.push({
          name: cityClean,
          city: cityClean,
          latitude: lat,
          longitude: lng,
        });
      }
    }

    // If coordinates were passed without explicit area names, create an anchor area
    if (tripAreas.length === 0 && lat != null && lng != null) {
      tripAreas.push({
        name: "Selected Location",
        latitude: lat,
        longitude: lng,
      });
    }

    if (tripAreas.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one locationId, city, or selectedAreas parameter is required",
        },
        { status: 400 }
      );
    }

    // Retrieve target location details for single location queries if present
    let targetLocation = null;
    if (locationId) {
      targetLocation = await prisma.location.findUnique({
        where: { id: locationId },
      });
      if (targetLocation) {
        const areaIndex = tripAreas.findIndex((a) => a.locationId === locationId);
        if (areaIndex >= 0) {
          tripAreas[areaIndex].name = targetLocation.name;
          tripAreas[areaIndex].city = targetLocation.city;
          tripAreas[areaIndex].latitude = targetLocation.latitude;
          tripAreas[areaIndex].longitude = targetLocation.longitude;
        }
      }
    }

    // Execute matching engine using PostgreSQL + Prisma as source of truth
    const result = await discoverEligibleGuides(tripAreas, {
      radiusKm,
      language,
    });

    const formattedGuides = result.guides.map((g) => ({
      id: g.guideId,
      guideId: g.guideId,
      name: g.guideName,
      guideName: g.guideName,
      profilePhoto: g.profilePhoto,
      bio: g.bio,
      rating: 4.8,
      experienceYears: g.experienceYears,
      hourlyRate: g.hourlyRate,
      currency: g.currency,
      languages: g.languages,
      expertise: g.expertise,
      availabilityStatus: g.availabilityStatus,
      matchedAreas: g.matchedAreas,
      nearbyAreas: g.nearbyAreas,
      coverageCount: g.coverageCount,
      totalSelectedAreas: g.totalSelectedAreas,
      distanceKm: g.distanceKm,
      matchType: g.matchType,
      coverageLabel: g.coverageLabel,
      isAllCovered: g.isAllCovered,
    }));

    const primaryArea =
      tripAreas[0]?.name || (targetLocation ? targetLocation.name : "Area");
    const primaryCity =
      targetLocation?.city || tripAreas[0]?.city || primaryArea;

    return NextResponse.json({
      location: primaryArea,
      city: primaryCity,
      totalAvailable: formattedGuides.length,
      totalSelectedAreas: result.totalSelectedAreas,
      selectedAreas: result.selectedAreaNames,
      hasSingleGuideCoveringAll: result.hasSingleGuideCoveringAll,
      guides: formattedGuides,
    });
  } catch (error) {
    console.error("GET /api/guides error:", error);
    return NextResponse.json(
      { error: "Failed to search guides" },
      { status: 500 }
    );
  }
}
