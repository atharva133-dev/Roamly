/**
 * Guide Agent
 *
 * Searches Roamly's own database for VERIFIED + AVAILABLE guides at each
 * resolved destination. Returns ONLY real PostgreSQL-backed guides.
 *
 * NO demo/fake/fabricated guides are ever returned.
 * When no real guide is found, guides = [] with a structured warning.
 */

import { getPrismaClient } from "../services/googleMapsGateway.js";

function formatDbGuide(g, locationId) {
  return {
    id: g.id,
    userId: g.user_id,
    name: g.user?.full_name || "Licensed Guide",
    profilePhoto: g.profile_photo || g.user?.profile_photo_url || null,
    bio: g.bio,
    experienceYears: g.experience_years,
    hourlyRate: g.hourly_rate || 500,
    languages: g.languages,
    expertise: g.expertise,
    verificationStatus: g.verification_status,
    availabilityStatus: g.availability_status,
    isCurrentlyAtLocation: g.current_location_id === locationId,
    currentLocation: g.current_location ? { id: g.current_location.id, name: g.current_location.name } : null,
    coveredLocations: (g.locations || []).map((gl) => ({ id: gl.location.id, name: gl.location.name })),
    isDemo: false,
    isBookable: true,
    guideSource: "ROAMLY_DATABASE"
  };
}

async function findGuidesForLocation(prisma, location) {
  const guides = await prisma.guideProfile.findMany({
    where: {
      verification_status: "VERIFIED",
      availability_status: "AVAILABLE",
      locations: {
        some: {
          OR: [{ location_id: location.id }, { location: { city: { equals: location.address?.city, mode: "insensitive" } } }],
          is_active: true
        }
      }
    },
    include: {
      user: { select: { full_name: true, email: true, profile_photo_url: true, role: true } },
      locations: { include: { location: true } },
      current_location: true
    },
    orderBy: [{ experience_years: "desc" }, { created_at: "asc" }]
  });

  // Extra safety: only return guides whose User record has role=GUIDE
  return guides
    .filter((g) => g.user?.role === "GUIDE")
    .map((g) => formatDbGuide(g, location.id));
}

/**
 * Validate a user-selected guide against all eligibility requirements.
 * Returns { valid, guide, error } where error is a structured rejection reason.
 */
async function validateSelectedGuide(prisma, selectedGuideId) {
  if (!prisma) {
    return { valid: false, guide: null, error: { code: "DB_UNAVAILABLE", details: "Database unavailable — cannot validate selected guide" } };
  }

  const g = await prisma.guideProfile.findUnique({
    where: { id: selectedGuideId },
    include: {
      user: { select: { full_name: true, email: true, profile_photo_url: true, role: true } },
      locations: { include: { location: true } },
      current_location: true
    }
  });

  // 1. Guide must exist
  if (!g) {
    return { valid: false, guide: null, error: { code: "GUIDE_NOT_FOUND", details: `Selected guide "${selectedGuideId}" does not exist in the database` } };
  }

  // 2. User record must have GUIDE role
  if (g.user?.role !== "GUIDE") {
    return { valid: false, guide: null, error: { code: "INVALID_GUIDE_ROLE", details: `User for guide "${selectedGuideId}" does not have GUIDE role (has: ${g.user?.role})` } };
  }

  // 3. Verification status must be VERIFIED
  if (g.verification_status !== "VERIFIED") {
    return { valid: false, guide: null, error: { code: "GUIDE_NOT_VERIFIED", details: `Guide "${g.user?.full_name || selectedGuideId}" has verification status: ${g.verification_status}` } };
  }

  // 4. Email verification check (if the guide has a verification_token_hash, email_verified_at must be set)
  if (g.verification_token_hash && !g.email_verified_at) {
    return { valid: false, guide: null, error: { code: "GUIDE_EMAIL_NOT_VERIFIED", details: `Guide "${g.user?.full_name || selectedGuideId}" has not completed email verification` } };
  }

  // 5. Availability must be AVAILABLE
  if (g.availability_status !== "AVAILABLE") {
    return { valid: false, guide: null, error: { code: "GUIDE_NOT_AVAILABLE", details: `Guide "${g.user?.full_name || selectedGuideId}" has availability status: ${g.availability_status}` } };
  }

  return { valid: true, guide: formatDbGuide(g, null), error: null };
}

export async function execute(context) {
  const guidePreference = context?.tripRequest?.guidePreference || "NO_GUIDE";
  const selectedGuideId = context?.tripRequest?.selectedGuideId || null;
  const resolvedLocations = context?.resolvedLocations || [];

  if (guidePreference === "NO_GUIDE") {
    return {
      success: true,
      data: { matchedGuides: {} },
      source: "N/A",
      fallbackUsed: false
    };
  }

  const matchedGuides = {};
  const noGuideDestinations = [];
  const warnings = [];

  const prisma = await getPrismaClient();

  if (!prisma) {
    // Database unavailable — cannot provide any guide data
    for (const location of resolvedLocations) {
      matchedGuides[location.id] = [];
      noGuideDestinations.push(location.name);
    }
    return {
      success: true,
      data: { matchedGuides, selectedGuideId: null },
      warnings: [
        { code: "DB_UNAVAILABLE", details: "Database unavailable — no guide data can be retrieved" },
        ...(noGuideDestinations.length > 0
          ? [{ code: "NO_ROAMLY_GUIDE_AVAILABLE", details: `No verified guides available for: ${noGuideDestinations.join(", ")}` }]
          : [])
      ],
      source: "ROAMLY_DATABASE",
      fallbackUsed: false
    };
  }

  // If a specific guide was chosen, validate fully before proceeding
  let chosenGuide = null;
  if (selectedGuideId && guidePreference === "CHOOSE_GUIDE") {
    try {
      const validation = await validateSelectedGuide(prisma, selectedGuideId);
      if (!validation.valid) {
        // Hard reject — do NOT fall back to another guide or demo data
        return {
          success: false,
          data: { matchedGuides: {} },
          errors: [validation.error],
          warnings: [],
          source: "ROAMLY_DATABASE",
          fallbackUsed: false
        };
      }
      chosenGuide = validation.guide;
    } catch (err) {
      return {
        success: false,
        data: { matchedGuides: {} },
        errors: [{ code: "GUIDE_VALIDATION_ERROR", details: `Failed to validate selected guide: ${err.message}` }],
        warnings: [],
        source: "ROAMLY_DATABASE",
        fallbackUsed: false
      };
    }
  }

  for (const location of resolvedLocations) {
    let guides = [];

    try {
      guides = await findGuidesForLocation(prisma, location);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Guide Agent] DB query failed for ${location.name}: ${err.message}`);
      }
      guides = [];
    }

    // NO demo fallback — if no guides found, return empty array
    if (guides.length === 0) {
      noGuideDestinations.push(location.name);
    }

    // If user chose a specific guide, place them first (and deduplicate)
    if (chosenGuide) {
      guides = [chosenGuide, ...guides.filter((g) => g.id !== chosenGuide.id)];
    }

    matchedGuides[location.id] = guides;
  }

  if (noGuideDestinations.length > 0) {
    warnings.push({
      code: "NO_ROAMLY_GUIDE_AVAILABLE",
      details: `No verified guides available for: ${noGuideDestinations.join(", ")}`
    });
  }

  return {
    success: true,
    data: { matchedGuides, selectedGuideId: chosenGuide ? chosenGuide.id : null },
    warnings,
    source: "ROAMLY_DATABASE",
    fallbackUsed: false
  };
}

export default { execute };
