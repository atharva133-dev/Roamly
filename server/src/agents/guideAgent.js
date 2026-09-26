/**
 * Guide Agent
 *
 * Searches Roamly's own database for VERIFIED + AVAILABLE guides at each
 * resolved destination (same query shape as app/api/guides/route.ts). On DB
 * outage, reuses the shared demo-guide fallback catalog, but always marks
 * that data isDemo/isBookable:false/guideSource:ROAMLY_DEMO_FALLBACK so it is
 * never presented as a live, bookable Roamly guide.
 */

import { getPrismaClient } from "../services/googleMapsGateway.js";
import { getDemoGuides } from "../services/demoGuides.js";

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
      user: { select: { full_name: true, email: true, profile_photo_url: true } },
      locations: { include: { location: true } },
      current_location: true
    },
    orderBy: [{ experience_years: "desc" }, { created_at: "asc" }]
  });

  return guides.map((g) => formatDbGuide(g, location.id));
}

export async function execute(context) {
  const guidePreference = context?.tripRequest?.guidePreference || "NO_GUIDE";
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
  let usedDemoFallback = false;
  const noGuideDestinations = [];

  const prisma = await getPrismaClient();

  for (const location of resolvedLocations) {
    let guides = [];

    if (prisma) {
      try {
        guides = await findGuidesForLocation(prisma, location);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[Guide Agent] DB query failed (${err.message}); using demo fallback.`);
        }
        guides = [];
      }
    }

    if (guides.length === 0) {
      const demo = getDemoGuides(location.address?.city);
      if (demo.length > 0) {
        guides = demo;
        usedDemoFallback = true;
      }
    }

    matchedGuides[location.id] = guides;
    if (guides.length === 0) noGuideDestinations.push(location.name);
  }

  return {
    success: true,
    data: { matchedGuides },
    warnings:
      noGuideDestinations.length > 0
        ? [{ code: "NO_ROAMLY_GUIDE_AVAILABLE", details: `No guide available for: ${noGuideDestinations.join(", ")}` }]
        : [],
    source: usedDemoFallback ? "ROAMLY_DEMO_FALLBACK" : "ROAMLY_DATABASE",
    fallbackUsed: usedDemoFallback
  };
}

export default { execute };
