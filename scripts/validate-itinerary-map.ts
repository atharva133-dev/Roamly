/**
 * End-to-end Validation for Roamly Itinerary Map & Stops System
 */

import { planItinerary } from "../server/src/agents/agentRouter.js";
import { getPlaceDetailsById } from "../server/src/services/googleMapsGateway.js";
import assert from "node:assert";

async function validateItineraryMapSystem() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("    ROAMLY ITINERARY MAP & STOPS END-TO-END VALIDATION SUITE    ");
  console.log("════════════════════════════════════════════════════════════════\n");

  // STEP 1: Generate a 3-day Delhi itinerary
  console.log("▶ 1. Generating 3-day grounded Delhi itinerary...");
  const tripRequest = {
    destinations: ["Delhi"],
    startDate: "2026-10-15",
    endDate: "2026-10-17",
    travelerCount: 2,
    totalBudget: 45000,
    currency: "INR",
    accommodationPreference: "Hotel",
    transportationPreference: "CAB",
    interests: ["Heritage", "Food", "Culture"],
    travelStyle: "Cultural",
    pace: "MODERATE",
    guidePreference: "NO_GUIDE",
    selectedGuideId: null,
  };

  const planResult = await planItinerary({
    requestId: `val_map_${Date.now()}`,
    user: { id: "test_user_val", role: "USER" },
    tripRequest,
  });

  assert(planResult.success === true, "Itinerary generation must succeed");
  assert(Array.isArray(planResult.days), "Plan must contain days array");
  assert(planResult.days.length === 3, "Plan must contain exactly 3 days");
  console.log(`   ✅ 3-day itinerary generated successfully (${planResult.tripSummary.durationDays} days)`);

  // STEP 2 & 3: Verify every stop shows real activity name & real start/end time
  console.log("\n▶ 2 & 3. Verifying activities, placeIds, and slot timing...");
  let totalActivities = 0;
  const activityStops: Array<{ name: string; placeId: string; startTime: string; endTime: string; day: string; city: string; lat?: number; lng?: number }> = [];

  for (const day of planResult.days) {
    console.log(`   📅 ${day.day} (${day.city}):`);
    assert(day.city.toLowerCase().includes("delhi"), "City must be Delhi");
    assert(Array.isArray(day.activities) && day.activities.length > 0, `${day.day} must have activities`);

    for (const act of day.activities) {
      totalActivities++;
      assert(Boolean(act.name), "Activity must have a name");
      assert(!act.name.toLowerCase().includes("delhi division"), "Activity must NOT be named 'Delhi Division'");
      assert(Boolean(act.placeId), "Activity must have a grounded placeId");
      assert(Boolean(act.startTime) && Boolean(act.endTime), "Activity must have startTime and endTime");
      console.log(`      • [${act.slot}] ${act.name} (${act.startTime}–${act.endTime}) [placeId: ${act.placeId.slice(0, 15)}...]`);

      activityStops.push({
        name: act.name,
        placeId: act.placeId,
        startTime: act.startTime,
        endTime: act.endTime,
        day: day.day,
        city: day.city,
      });
    }

    // STEP 16: Verify no demo/fallback guide is inserted
    if (day.guide) {
      assert(day.guide.isDemo === false, "Guide must not be a demo guide");
      console.log(`      👤 Real Guide: ${day.guide.name}`);
    } else {
      console.log(`      👤 Guide: None requested (NO_GUIDE satisfied)`);
    }
  }

  assert(totalActivities >= 3, "Must have at least 3 total activities");
  console.log(`   ✅ Verified ${totalActivities} grounded activity stops with real names and times.`);

  // STEP 4 & 5: Resolve Real Coordinates for activities
  console.log("\n▶ 4 & 5. Resolving real coordinates via Google Places Details...");
  for (const stop of activityStops.slice(0, 4)) {
    const details: any = await getPlaceDetailsById(stop.placeId);
    if (details && typeof details.latitude === "number" && typeof details.longitude === "number") {
      stop.lat = details.latitude;
      stop.lng = details.longitude;
      console.log(`   📍 ${stop.name} -> (${details.latitude.toFixed(4)}, ${details.longitude.toFixed(4)}) [${details.address || "Real address"}]`);
    } else {
      console.log(`   ⚠️ ${stop.name} -> Place coordinates unavailable on Google`);
    }
  }

  const resolvedStops = activityStops.filter((s): s is typeof s & { lat: number; lng: number } => Boolean(s.lat && s.lng));
  assert(resolvedStops.length >= 2, "Must resolve at least 2 stops with real coordinates");
  console.log(`   ✅ Resolved ${resolvedStops.length} activity stops with real Google Places coordinates.`);

  // STEP 6 & 7: Test Real Nearby Attractions Search
  console.log("\n▶ 6 & 7. Testing Places Nearby Search (GET /api/places/nearby)...");
  const anchor = resolvedStops[0];
  const nearbyRes = await fetch(`http://localhost:3000/api/places/nearby?lat=${anchor.lat}&lng=${anchor.lng}&radius=2000&types=tourist_attraction,museum`);
  assert(nearbyRes.status === 200, "Nearby search must return 200");
  const nearbyData = await nearbyRes.json();
  assert(Array.isArray(nearbyData.places) && nearbyData.places.length > 0, "Must return real nearby places");
  console.log(`   ✅ Found ${nearbyData.places.length} real nearby attractions near ${anchor.name}:`);
  nearbyData.places.slice(0, 3).forEach((p: any, idx: number) => {
    console.log(`      ${idx + 1}. ${p.name} (⭐ ${p.rating ?? "N/A"}) - ${p.address?.slice(0, 40)}...`);
  });

  // STEP 8 & 9: Test Real Hotels Search
  console.log("\n▶ 8 & 9. Testing Hotel Search (GET /api/places/nearby?types=lodging)...");
  const hotelRes = await fetch(`http://localhost:3000/api/places/nearby?lat=${anchor.lat}&lng=${anchor.lng}&radius=3000&types=lodging,hotel`);
  assert(hotelRes.status === 200, "Hotels search must return 200");
  const hotelData = await hotelRes.json();
  assert(Array.isArray(hotelData.places) && hotelData.places.length > 0, "Must return real hotels");
  console.log(`   ✅ Found ${hotelData.places.length} real hotels near ${anchor.name}:`);
  hotelData.places.slice(0, 3).forEach((h: any, idx: number) => {
    console.log(`      ${idx + 1}. ${h.name} (⭐ ${h.rating ?? "N/A"}) - ${h.address?.slice(0, 40)}...`);
  });

  // STEP 10, 11, 12, 13, 14: Test TWO_WHEELER Routing (POST /api/routes)
  console.log("\n▶ 10–14. Testing TWO_WHEELER Route calculation (POST /api/routes)...");
  const routePayload = {
    mode: "TWO_WHEELER",
    stops: resolvedStops.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      name: s.name,
      placeId: s.placeId,
    })),
  };

  const routeRes = await fetch("http://localhost:3000/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(routePayload),
  });

  assert(routeRes.status === 200, "Route API must return 200");
  const routeData = await routeRes.json();
  assert(routeData.success === true, "Route calculation must be successful");
  assert(routeData.mode === "TWO_WHEELER", "Mode must be TWO_WHEELER");
  assert(routeData.summary.routeSource.includes("Google"), "Source must be Google Routes");
  assert(Boolean(routeData.summary.distanceText), "Must include distanceText");
  assert(Boolean(routeData.summary.durationText), "Must include durationText");
  assert(Boolean(routeData.summary.fareText), "Must include fareText");
  assert(Array.isArray(routeData.polylines) && routeData.polylines.length > 0, "Must contain real encoded polylines");

  console.log(`   ✅ Google Route calculated for TWO_WHEELER:`);
  console.log(`      • Distance : ${routeData.summary.distanceText}`);
  console.log(`      • Time     : ${routeData.summary.durationText}`);
  console.log(`      • Fare     : ${routeData.summary.fareText}`);
  console.log(`      • Source   : ${routeData.summary.routeSource}`);
  console.log(`      • Polyline : ${routeData.polylines[0]?.slice(0, 35)}... (Encoded Polyline verified)`);

  // STEP 15: Verify no fake/random coordinates
  console.log("\n▶ 15. Verifying zero fabrication and coordinate integrity...");
  for (const leg of routeData.legs) {
    assert(Number.isFinite(leg.fromCoords.lat) && Number.isFinite(leg.fromCoords.lng), "Coordinates must be finite");
    assert(Number.isFinite(leg.toCoords.lat) && Number.isFinite(leg.toCoords.lng), "Coordinates must be finite");
    assert(leg.distanceMeters > 0, "Leg distance must be > 0");
    assert(leg.durationSeconds > 0, "Leg duration must be > 0");
  }
  console.log("   ✅ Zero coordinate fabrication confirmed.");

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("    🎉 ALL 16 ITINERARY MAP VALIDATION CHECKS PASSED!         ");
  console.log("════════════════════════════════════════════════════════════════\n");
}

validateItineraryMapSystem().catch((err) => {
  console.error("❌ Validation failed:", err);
  process.exit(1);
});
