/**
 * Places Agent
 *
 * Discovers candidate attractions for each resolved destination using Google
 * Places API (New) Text Search, filtered by the user's stated interests.
 *
 * Hard rule: itineraryAgent.js (Gemini) may ONLY select places that appear in
 * `context.candidatePlaces`. This agent never invents a place name — every
 * candidate carries its official Google `placeId`.
 */

import { searchAttractions } from "../services/googleMapsGateway.js";

const MAX_CANDIDATES_PER_DESTINATION = 40;
const MAX_CANDIDATES_PER_QUERY = 15;

function rankCandidates(candidates) {
  return [...candidates].sort((a, b) => {
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.userRatingCount || 0) - (a.userRatingCount || 0);
  });
}

function normalizeCandidate(raw) {
  return {
    placeId: raw.placeId,
    name: raw.name,
    formattedAddress: raw.formattedAddress || "",
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    primaryType: raw.primaryType || "point_of_interest",
    rating: raw.rating ?? null,
    userRatingCount: raw.userRatingCount ?? null,
    regularOpeningHours: raw.regularOpeningHours || null,
    photos: Array.isArray(raw.photos) ? raw.photos.slice(0, 3) : []
  };
}

async function findCandidatesForDestination(location, interests) {
  const querySet = new Set();

  // Multi-angle foundational queries for broad destination coverage
  querySet.add(`top tourist attractions and famous landmarks in ${location.name}`);
  querySet.add(`historic forts, monuments and heritage sites in ${location.name}`);
  querySet.add(`popular museums, cultural spots and art galleries in ${location.name}`);
  querySet.add(`scenic gardens, parks and viewpoints in ${location.name}`);
  querySet.add(`vibrant local markets, bazaars and shopping streets in ${location.name}`);

  // User-provided interests
  if (Array.isArray(interests) && interests.length > 0) {
    for (const interest of interests) {
      if (interest && typeof interest === "string") {
        querySet.add(`${interest} attractions in ${location.name}`);
      }
    }
  }

  const seen = new Map();

  for (const query of querySet) {
    if (seen.size >= MAX_CANDIDATES_PER_DESTINATION) break;
    const results = await searchAttractions(query);
    for (const raw of (results || []).slice(0, MAX_CANDIDATES_PER_QUERY)) {
      if (!raw?.placeId || seen.has(raw.placeId)) continue;
      seen.set(raw.placeId, normalizeCandidate(raw));
      if (seen.size >= MAX_CANDIDATES_PER_DESTINATION) break;
    }
  }

  return rankCandidates(Array.from(seen.values())).slice(0, MAX_CANDIDATES_PER_DESTINATION);
}

export async function execute(context) {
  const resolvedLocations = context?.resolvedLocations || [];
  const interests = context?.tripRequest?.interests || [];

  const candidatePlaces = {};
  const emptyDestinations = [];

  for (const location of resolvedLocations) {
    const candidates = await findCandidatesForDestination(location, interests);
    candidatePlaces[location.id] = candidates;
    if (candidates.length === 0) emptyDestinations.push(location.name);
  }

  return {
    success: true,
    data: { candidatePlaces },
    warnings:
      emptyDestinations.length > 0
        ? [{ code: "NO_CANDIDATE_PLACES", details: `No verified attractions found for: ${emptyDestinations.join(", ")}` }]
        : [],
    source: "GOOGLE_PLACES",
    fallbackUsed: false
  };
}

export default { execute };
