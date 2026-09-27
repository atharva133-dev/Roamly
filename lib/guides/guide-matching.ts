import prisma from "@/lib/prisma";
import { UserRole, VerificationStatus, AvailabilityStatus } from "@prisma/client";

export const DEFAULT_GUIDE_MATCH_RADIUS_KM = 50;

/**
 * Geographic distance calculation using the Haversine formula (in kilometers).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface TripAreaInput {
  name: string;
  city?: string | null;
  locationId?: string | null;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GuideMatchResult {
  guideId: string;
  guideName: string;
  profilePhoto: string | null;
  bio: string | null;
  hourlyRate: number;
  currency: string;
  languages: string[];
  expertise: string[];
  experienceYears: number;
  availabilityStatus: AvailabilityStatus;
  matchedAreas: string[];
  nearbyAreas: string[];
  coverageCount: number;
  totalSelectedAreas: number;
  distanceKm: number | null;
  matchType: "MULTI_AREA" | "EXACT" | "NEARBY";
  coverageLabel: string;
  isAllCovered: boolean;
}

export interface MatchOptions {
  radiusKm?: number;
  language?: string | null;
}

/**
 * Normalizes an area name or city string for clean comparisons.
 */
function cleanAreaString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[,\-_.]/g, " ")
    .replace(/\s+/g, " ");
}

export type TripAreaParam = TripAreaInput | string;

/**
 * Finds all eligible guides and scores their coverage against the selected trip areas.
 *
 * Rules:
 * 1. User.role = GUIDE
 * 2. GuideProfile.verification_status = VERIFIED
 * 3. GuideProfile.availability_status = AVAILABLE
 * 4. Guide has at least one active GuideLocation or valid current_location
 * 5. Deterministic ranking by multi-area coverage, exact matches count, distance, experience, hourly rate.
 */
export async function discoverEligibleGuides(
  tripAreas: TripAreaParam[],
  options: MatchOptions = {}
): Promise<{
  totalSelectedAreas: number;
  selectedAreaNames: string[];
  hasSingleGuideCoveringAll: boolean;
  guides: GuideMatchResult[];
}> {
  const radiusKm = options.radiusKm ?? DEFAULT_GUIDE_MATCH_RADIUS_KM;
  const filterLanguage = options.language?.trim().toLowerCase();

  // Deduplicate and sanitize trip areas
  const normalizedAreas: Array<TripAreaInput & { normalizedName: string }> = [];
  const seenAreaNames = new Set<string>();

  for (const item of tripAreas) {
    const area: TripAreaInput = typeof item === "string" ? { name: item } : item;
    const rawName = (area.name || area.city || "").trim();
    if (!rawName) continue;
    const norm = cleanAreaString(rawName);
    if (!seenAreaNames.has(norm)) {
      seenAreaNames.add(norm);
      normalizedAreas.push({
        ...area,
        name: rawName,
        normalizedName: norm,
      });
    }
  }

  const totalSelectedAreas = normalizedAreas.length;
  const selectedAreaNames = normalizedAreas.map((a) => a.name);

  if (totalSelectedAreas === 0) {
    return {
      totalSelectedAreas: 0,
      selectedAreaNames: [],
      hasSingleGuideCoveringAll: false,
      guides: [],
    };
  }

  // Resolve missing coordinates for trip areas from existing Location records in database
  for (const area of normalizedAreas) {
    if (area.latitude == null || area.longitude == null) {
      if (area.locationId) {
        const loc = await prisma.location.findUnique({
          where: { id: area.locationId },
          select: { latitude: true, longitude: true, city: true },
        });
        if (loc?.latitude != null && loc?.longitude != null) {
          area.latitude = loc.latitude;
          area.longitude = loc.longitude;
          if (!area.city && loc.city) area.city = loc.city;
        }
      }
      if (area.latitude == null || area.longitude == null) {
        const loc = await prisma.location.findFirst({
          where: {
            OR: [
              { city: { contains: area.name, mode: "insensitive" } },
              { name: { contains: area.name, mode: "insensitive" } },
            ],
            latitude: { not: null },
            longitude: { not: null },
            is_active: true,
          },
          select: { latitude: true, longitude: true, city: true },
        });
        if (loc?.latitude != null && loc?.longitude != null) {
          area.latitude = loc.latitude;
          area.longitude = loc.longitude;
          if (!area.city && loc.city) area.city = loc.city;
        }
      }
    }
  }

  // Query only eligible guides from database:
  // - User.role = GUIDE
  // - GuideProfile.verification_status = VERIFIED
  // - GuideProfile.availability_status = AVAILABLE
  // - Must have at least one active GuideLocation OR current_location
  const rawGuides = await prisma.guideProfile.findMany({
    where: {
      verification_status: VerificationStatus.VERIFIED,
      availability_status: AvailabilityStatus.AVAILABLE,
      user: {
        role: UserRole.GUIDE,
      },
    },
    include: {
      user: {
        select: {
          user_id: true,
          full_name: true,
          role: true,
          profile_photo_url: true,
        },
      },
      locations: {
        where: {
          is_active: true,
        },
        include: {
          location: true,
        },
      },
      current_location: true,
    },
  });

  const matchedGuideList: GuideMatchResult[] = [];

  for (const guide of rawGuides) {
    // Guide MUST have at least one valid active operating location
    const activeLocations = guide.locations
      .filter((gl) => gl.is_active && gl.location && gl.location.is_active)
      .map((gl) => gl.location);

    if (guide.current_location && guide.current_location.is_active) {
      if (!activeLocations.some((l) => l.id === guide.current_location!.id)) {
        activeLocations.push(guide.current_location);
      }
    }

    if (activeLocations.length === 0) {
      // Excluded: guide has no active operating location (Rule 4)
      continue;
    }

    // Optional language filtering
    if (filterLanguage && guide.languages) {
      const speaksLang = guide.languages.some((l) =>
        l.toLowerCase().includes(filterLanguage)
      );
      if (!speaksLang) continue;
    }

    const matchedAreaSet = new Set<string>();
    const nearbyAreaSet = new Set<string>();
    let minDistanceKm: number | null = null;

    // Evaluate guide's operating locations against EACH selected trip area
    for (const tripArea of normalizedAreas) {
      let isExact = false;
      let isNearby = false;
      let bestDistForArea: number | null = null;

      for (const loc of activeLocations) {
        const locCityNorm = cleanAreaString(loc.city || "");
        const locNameNorm = cleanAreaString(loc.name || "");
        const tripAreaNorm = tripArea.normalizedName;

        // Exact match check:
        // 1. Same locationId
        // 2. Same google_place_id
        // 3. Normalized city or name contains or equals trip area
        if (
          (tripArea.locationId && loc.id === tripArea.locationId) ||
          (tripArea.googlePlaceId &&
            loc.google_place_id &&
            loc.google_place_id === tripArea.googlePlaceId) ||
          locCityNorm === tripAreaNorm ||
          locCityNorm.includes(tripAreaNorm) ||
          tripAreaNorm.includes(locCityNorm) ||
          locNameNorm.includes(tripAreaNorm) ||
          tripAreaNorm.includes(locNameNorm)
        ) {
          isExact = true;
          bestDistForArea = 0;
          break;
        }

        // Distance check if coordinates are present
        if (
          tripArea.latitude != null &&
          tripArea.longitude != null &&
          loc.latitude != null &&
          loc.longitude != null
        ) {
          const dist = calculateHaversineDistanceKm(
            tripArea.latitude,
            tripArea.longitude,
            loc.latitude,
            loc.longitude
          );

          if (dist <= 1.0) {
            isExact = true;
            bestDistForArea = 0;
            break;
          } else if (dist <= radiusKm) {
            if (bestDistForArea == null || dist < bestDistForArea) {
              bestDistForArea = dist;
            }
            isNearby = true;
          }
        }
      }

      if (isExact) {
        matchedAreaSet.add(tripArea.name);
        if (minDistanceKm === null || 0 < minDistanceKm) {
          minDistanceKm = 0;
        }
      } else if (isNearby && bestDistForArea != null) {
        nearbyAreaSet.add(tripArea.name);
        if (minDistanceKm === null || bestDistForArea < minDistanceKm) {
          minDistanceKm = bestDistForArea;
        }
      }
    }

    const matchedAreas = Array.from(matchedAreaSet);
    // Don't include areas in nearby that already matched exact
    const nearbyAreas = Array.from(nearbyAreaSet).filter(
      (a) => !matchedAreaSet.has(a)
    );

    const coverageCount = matchedAreas.length + nearbyAreas.length;

    // Must match at least one selected area (exact or nearby)
    if (coverageCount === 0) {
      continue;
    }

    const isAllCovered = coverageCount === totalSelectedAreas;
    let matchType: "MULTI_AREA" | "EXACT" | "NEARBY" = "NEARBY";
    if (coverageCount > 1) {
      matchType = "MULTI_AREA";
    } else if (matchedAreas.length === 1) {
      matchType = "EXACT";
    }

    let coverageLabel = "";
    if (isAllCovered && totalSelectedAreas > 1) {
      coverageLabel = "Covers all selected areas";
    } else if (coverageCount > 1) {
      coverageLabel = `Best match for ${coverageCount} of ${totalSelectedAreas} areas`;
    } else if (matchedAreas.length === 1) {
      coverageLabel = `Exact match for ${matchedAreas[0]}`;
    } else if (nearbyAreas.length > 0) {
      const distStr = minDistanceKm != null ? ` (${Math.round(minDistanceKm)} km)` : "";
      coverageLabel = `Nearby to ${nearbyAreas[0]}${distStr}`;
    }

    matchedGuideList.push({
      guideId: guide.id,
      guideName: guide.user.full_name || "Licensed Guide",
      profilePhoto: guide.profile_photo || guide.user.profile_photo_url || null,
      bio: guide.bio,
      hourlyRate: guide.hourly_rate ?? 500,
      currency: guide.currency || "INR",
      languages: guide.languages || [],
      expertise: guide.expertise || [],
      experienceYears: guide.experience_years,
      availabilityStatus: guide.availability_status,
      matchedAreas,
      nearbyAreas,
      coverageCount,
      totalSelectedAreas,
      distanceKm: minDistanceKm,
      matchType,
      coverageLabel,
      isAllCovered,
    });
  }

  // Deterministic Ranking Priority:
  // 1. Exact matches count (descending) - guides covering multiple exact areas rank highest
  // 2. Total coverage count (descending)
  // 3. Nearby matches count (descending)
  // 4. Distance (ascending, 0 km for exact comes first)
  // 5. Experience years (descending)
  // 6. Hourly rate (ascending)
  // 7. Stable tie-breaker: guideId ascending
  matchedGuideList.sort((a, b) => {
    // 1. Exact matches count descending
    if (b.matchedAreas.length !== a.matchedAreas.length) {
      return b.matchedAreas.length - a.matchedAreas.length;
    }
    // 2. Total coverage count descending
    if (b.coverageCount !== a.coverageCount) {
      return b.coverageCount - a.coverageCount;
    }
    // 3. Distance ascending (nulls last)
    const distA = a.distanceKm ?? 999999;
    const distB = b.distanceKm ?? 999999;
    if (distA !== distB) {
      return distA - distB;
    }
    // 4. Experience years descending
    if (b.experienceYears !== a.experienceYears) {
      return b.experienceYears - a.experienceYears;
    }
    // 5. Hourly rate ascending
    if (a.hourlyRate !== b.hourlyRate) {
      return a.hourlyRate - b.hourlyRate;
    }
    // 6. Stable tie-breaker
    return a.guideId.localeCompare(b.guideId);
  });

  const hasSingleGuideCoveringAll = matchedGuideList.some((g) => g.isAllCovered);

  return {
    totalSelectedAreas,
    selectedAreaNames,
    hasSingleGuideCoveringAll,
    guides: matchedGuideList,
  };
}

/**
 * Validates a guide's current eligibility at booking submission time (Stale availability protection).
 *
 * Rules:
 * 1. Guide exists in DB
 * 2. User.role = GUIDE
 * 3. GuideProfile.verification_status = VERIFIED
 * 4. GuideProfile.availability_status = AVAILABLE
 * 5. Guide operates in the requested city or nearby area
 */
export async function validateGuideEligibilityForBooking(
  guideId: string,
  city?: string | null
): Promise<{
  isValid: boolean;
  statusCode: number;
  errorCode?: string;
  errorMessage?: string;
  guide?: any;
}> {
  const targetGuide = await prisma.guideProfile.findUnique({
    where: { id: guideId },
    include: {
      user: {
        select: {
          user_id: true,
          full_name: true,
          role: true,
        },
      },
      locations: {
        where: { is_active: true },
        include: { location: true },
      },
      current_location: true,
    },
  });

  if (!targetGuide || targetGuide.user.role !== UserRole.GUIDE) {
    return {
      isValid: false,
      statusCode: 404,
      errorCode: "GUIDE_NOT_FOUND",
      errorMessage: "Guide not found or invalid role",
    };
  }

  if (targetGuide.verification_status !== VerificationStatus.VERIFIED) {
    return {
      isValid: false,
      statusCode: 400,
      errorCode: "GUIDE_NOT_VERIFIED",
      errorMessage: "Selected guide is not verified",
    };
  }

  if (targetGuide.availability_status !== AvailabilityStatus.AVAILABLE) {
    return {
      isValid: false,
      statusCode: 400,
      errorCode: "GUIDE_UNAVAILABLE",
      errorMessage: `Guide is currently ${targetGuide.availability_status.toLowerCase()} and cannot be requested`,
    };
  }

  if (city) {
    const activeLocations = targetGuide.locations
      .filter((gl) => gl.is_active && gl.location && gl.location.is_active)
      .map((gl) => gl.location);

    if (targetGuide.current_location && targetGuide.current_location.is_active) {
      if (!activeLocations.some((l) => l.id === targetGuide.current_location!.id)) {
        activeLocations.push(targetGuide.current_location);
      }
    }

    const cleanCity = cleanAreaString(city);
    const matchesCity = activeLocations.some(
      (loc) =>
        cleanAreaString(loc.city || "").includes(cleanCity) ||
        cleanCity.includes(cleanAreaString(loc.city || "")) ||
        cleanAreaString(loc.name || "").includes(cleanCity)
    );

    if (!matchesCity && activeLocations.length > 0) {
      return {
        isValid: false,
        statusCode: 400,
        errorCode: "LOCATION_MISMATCH",
        errorMessage: `Guide does not operate in requested area: ${city}`,
      };
    }
  }

  return {
    isValid: true,
    statusCode: 200,
    guide: targetGuide,
  };
}
