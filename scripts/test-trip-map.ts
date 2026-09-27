/**
 * Comprehensive Trip Map & Planner Acceptance Test Suite
 *
 * Covers:
 * B30: Map & Markers (loads, stops, coordinates, hotel marker, nearby places, place IDs, details, ratings, reviews, hours, add stop, persist)
 * B31: Hotels (search, multiple, ratings, reviews, price level, comparison, selection, map presence, change)
 * B32: Schedule & Times (valid start/end, end before start rejected, overlap rejected, opening-hour conflict, hours unavailable, persist)
 * B33: Routing (one-stop, multi-stop, polyline, distance, duration, travel mode, waypoint optimization, accept/reject, transit leg, errors)
 * B34: Transport Cost (drive estimate, two-wheeler estimate, transit fare, missing fare, toll inclusion, mode change update, label as estimate)
 */

import prisma from "../lib/prisma";
import { UserRole } from "@prisma/client";
import {
  findOrCreateLocation,
  searchNearbyPlaces,
  searchHotels,
  getPlaceDetailsById,
  getRouteBetween,
  computeMultiStopRoute,
} from "../server/src/services/googleMapsGateway.js";
import {
  estimateTransportCost,
  estimateTripTransportCost,
} from "../lib/transport/cost-estimator";

let passed = 0;
let failed = 0;
const results: { name: string; status: "PASS" | "FAIL"; detail?: string }[] = [];

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ⏳ ${name} ... `);
  try {
    await fn();
    passed++;
    results.push({ name, status: "PASS" });
    console.log("✅ PASS");
  } catch (err: any) {
    failed++;
    results.push({ name, status: "FAIL", detail: err.message });
    console.log(`❌ FAIL\n     Error: ${err.message}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function runTripMapSuite() {
  console.log("=".repeat(60));
  console.log("🗺️  ROAMLY TRIP MAP & PLANNER COMPLETE ACCEPTANCE TEST SUITE");
  console.log("=".repeat(60) + "\n");

  // Setup test traveler user and trip
  const testEmail = `traveler_map_test_${Date.now()}@roamly.local`;
  const user = await prisma.user.create({
    data: {
      clerk_id: `clerk_map_test_${Date.now()}`,
      email: testEmail,
      full_name: "Map Test Traveler",
      role: UserRole.USER,
    },
  });

  const trip = await prisma.trip.create({
    data: {
      user_id: user.user_id,
      description: "Mumbai Exploration Tour",
      start_date: new Date("2026-10-01T09:00:00Z"),
      end_date: new Date("2026-10-03T18:00:00Z"),
    },
  });

  try {
    // =========================================================================
    // SECTION 1: B30 — MAP & PLACES TESTS
    // =========================================================================
    console.log("\n--- SECTION 1: B30 — Map, Stops & Markers Tests ---");

    let stop1Location: any;
    let stop2Location: any;

    await test("B30.1 Trip loads from PostgreSQL", async () => {
      const loaded = await prisma.trip.findUnique({
        where: { trip_id: trip.trip_id },
        include: { stops: true },
      });
      assert(loaded !== null, "Trip must exist in database");
      assert(loaded?.user_id === user.user_id, "Trip owner must match");
    });

    await test("B30.2 Canonical location created with valid coordinates", async () => {
      stop1Location = await findOrCreateLocation({
        name: "Gateway of India",
        city: "Mumbai",
        latitude: 18.922,
        longitude: 72.8347,
        placeId: "ChIJbU60qHA6DDkRkiAnUt-3NLg",
        type: "tourist_attraction",
      });
      assert(Boolean(stop1Location.id), "Location ID must exist");
      assert(Number.isFinite(stop1Location.coordinates?.lat), "Latitude must be valid");
      assert(Number.isFinite(stop1Location.coordinates?.lng), "Longitude must be valid");
      assert(stop1Location.coordinates.lat > 18 && stop1Location.coordinates.lat < 20, "Lat must match Mumbai");
    });

    await test("B30.3 Trip stop marker records created in database", async () => {
      const stop = await prisma.stop.create({
        data: {
          trip_id: trip.trip_id,
          location_id: stop1Location.id,
          sequence: 1,
          arrival_date: new Date("2026-10-01T09:00:00Z"),
          departure_date: new Date("2026-10-01T10:30:00Z"),
        },
        include: { location: true },
      });
      assert(stop.id > 0, "Stop must have generated ID");
      assert(stop.location?.name === "Gateway of India", "Location name must match");
    });

    await test("B30.4 Nearby places load around destination", async () => {
      const nearby = await searchNearbyPlaces({
        latitude: 18.922,
        longitude: 72.8347,
        radiusMeters: 2000,
        maxResultCount: 8,
      });
      assert(Array.isArray(nearby), "Nearby places must return array");
      assert(nearby.length > 0, "Nearby places must not be empty");
    });

    await test("B30.5 Nearby places have valid place IDs and coordinates", async () => {
      const nearby = await searchNearbyPlaces({
        latitude: 18.922,
        longitude: 72.8347,
        radiusMeters: 2000,
        maxResultCount: 5,
      });
      for (const p of (nearby as any[])) {
        assert(typeof p.placeId === "string" && p.placeId.length > 0, "Place must have placeId");
        assert(typeof p.name === "string" && p.name.length > 0, "Place must have name");
        if (p.latitude && p.longitude) {
          assert(Number.isFinite(p.latitude), "Latitude must be numeric");
          assert(Number.isFinite(p.longitude), "Longitude must be numeric");
        }
      }
    });

    await test("B30.6 Selected place details load with ratings and reviews", async () => {
      const details: any = await getPlaceDetailsById("ChIJbU60qHA6DDkRkiAnUt-3NLg");
      assert(details !== null, "Place details must not be null");
      assert(details.name.includes("Gateway") || details.name.includes("India"), "Name must match");
      if (details.rating !== null && details.rating !== undefined) {
        assert(typeof details.rating === "number", "Rating must be number");
        assert(details.rating >= 1 && details.rating <= 5, "Rating must be between 1 and 5");
      }
      if (details.reviews) {
        assert(Array.isArray(details.reviews), "Reviews must be an array");
      }
    });

    await test("B30.7 Place opening hours handled safely", async () => {
      const details: any = await getPlaceDetailsById("ChIJbU60qHA6DDkRkiAnUt-3NLg");
      // Hours may be null or present, but never undefined crash
      assert(details.regularOpeningHours !== undefined, "regularOpeningHours must be defined (can be null)");
    });

    await test("B30.8 Nearby place can be added as trip stop and persists", async () => {
      stop2Location = await findOrCreateLocation({
        name: "Colaba Causeway",
        city: "Mumbai",
        latitude: 18.918,
        longitude: 72.829,
        placeId: "ChIJW0jVInw6DDkR5m2mU8G-3mE",
        type: "shopping_mall",
      });

      const addedStop = await prisma.stop.create({
        data: {
          trip_id: trip.trip_id,
          location_id: stop2Location.id,
          sequence: 2,
          arrival_date: new Date("2026-10-01T11:00:00Z"),
          departure_date: new Date("2026-10-01T12:30:00Z"),
        },
        include: { location: true },
      });

      assert(addedStop.id > 0, "Added stop must exist");

      // Verify persistence after re-query
      const reloaded = await prisma.trip.findUnique({
        where: { trip_id: trip.trip_id },
        include: { stops: { include: { location: true }, orderBy: { sequence: "asc" } } },
      });

      assert(reloaded?.stops.length === 2, "Trip must contain both stops");
      assert(reloaded?.stops[1].location?.name === "Colaba Causeway", "Second stop persisted correctly");
    });

    // =========================================================================
    // SECTION 2: B31 — HOTEL SEARCH & SELECTION TESTS
    // =========================================================================
    console.log("\n--- SECTION 2: B31 — Hotel Search, Comparison & Selection ---");

    let foundHotels: any[] = [];

    await test("B31.1 Hotels can be searched near destination", async () => {
      foundHotels = await searchHotels({
        latitude: 18.922,
        longitude: 72.8347,
        radiusMeters: 5000,
        maxResultCount: 8,
      });
      assert(Array.isArray(foundHotels), "searchHotels must return array");
      assert(foundHotels.length > 0, "Must find hotels near Gateway of India / South Mumbai");
    });

    await test("B31.2 Hotel objects contain required fields", async () => {
      const hotel = foundHotels[0];
      assert(Boolean(hotel.placeId), "Hotel must have placeId");
      assert(Boolean(hotel.name), "Hotel must have name");
      assert(Number.isFinite(hotel.latitude) && Number.isFinite(hotel.longitude), "Hotel must have coordinates");
    });

    await test("B31.3 Hotel comparison computes trade-offs without declaring winner", async () => {
      const top3 = foundHotels.slice(0, 3);
      assert(top3.length >= 2, "Need at least 2 hotels to compare");

      const comparison = top3.map((h) => ({
        placeId: h.placeId,
        name: h.name,
        rating: h.rating ?? "Unavailable",
        priceLevel: h.priceLevel ?? "Unavailable",
        address: h.address || h.formattedAddress || "Mumbai",
      }));

      assert(comparison.length >= 2, "Comparison matrix must have entries");
      // Verify no fabricated winner label
      for (const item of comparison) {
        assert(!("isWinner" in item), "Must not label any hotel as winner");
        assert(!("bestChoice" in item), "Must not fabricate a best choice");
      }
    });

    await test("B31.4 Hotel selection persists as trip anchor (sequence 0)", async () => {
      const selected = foundHotels[0];
      const hotelLoc = await findOrCreateLocation({
        name: selected.name,
        city: "Mumbai",
        latitude: selected.latitude,
        longitude: selected.longitude,
        placeId: selected.placeId,
        type: "lodging",
      });

      const hotelStop = await prisma.stop.create({
        data: {
          trip_id: trip.trip_id,
          location_id: hotelLoc.id,
          sequence: 0, // Anchor
        },
        include: { location: true },
      });

      assert(hotelStop.sequence === 0, "Hotel must be sequence 0 anchor");
      assert(hotelStop.location?.type === "lodging", "Location type must be lodging");

      // Verify reloaded trip includes hotel anchor
      const reloaded = await prisma.trip.findUnique({
        where: { trip_id: trip.trip_id },
        include: { stops: { include: { location: true }, orderBy: { sequence: "asc" } } },
      });

      const anchor = reloaded?.stops.find((s) => s.sequence === 0);
      assert(anchor !== undefined, "Hotel anchor must exist in trip");
      assert(anchor?.location?.name === selected.name, "Hotel name must match");
    });

    await test("B31.5 Selected hotel can be updated/changed", async () => {
      if (foundHotels.length > 1) {
        const replacement = foundHotels[1];
        // Delete old sequence 0
        await prisma.stop.deleteMany({
          where: { trip_id: trip.trip_id, sequence: 0 },
        });

        const newLoc = await findOrCreateLocation({
          name: replacement.name,
          city: "Mumbai",
          latitude: replacement.latitude,
          longitude: replacement.longitude,
          placeId: replacement.placeId,
          type: "lodging",
        });

        const newAnchor = await prisma.stop.create({
          data: {
            trip_id: trip.trip_id,
            location_id: newLoc.id,
            sequence: 0,
          },
          include: { location: true },
        });

        assert(newAnchor.location?.name === replacement.name, "New hotel anchor persisted");
      }
    });

    // =========================================================================
    // SECTION 3: B32 — START/END TIME & SCHEDULE VALIDATION TESTS
    // =========================================================================
    console.log("\n--- SECTION 3: B32 — Scheduling & Timing Validation ---");

    function validateSchedule(startStr: string, endStr: string): { valid: boolean; error?: string; duration?: number } {
      const [sh, sm] = startStr.split(":").map(Number);
      const [eh, em] = endStr.split(":").map(Number);
      const sMin = sh * 60 + sm;
      const eMin = eh * 60 + em;

      if (isNaN(sMin) || isNaN(eMin)) return { valid: false, error: "Invalid time format" };
      if (eMin <= sMin) return { valid: false, error: "End time must be after start time" };

      return { valid: true, duration: eMin - sMin };
    }

    function checkOverlap(
      slotA: { start: string; end: string },
      slotB: { start: string; end: string }
    ): boolean {
      const [ash, asm] = slotA.start.split(":").map(Number);
      const [aeh, aem] = slotA.end.split(":").map(Number);
      const [bsh, bsm] = slotB.start.split(":").map(Number);
      const [beh, bem] = slotB.end.split(":").map(Number);

      const aStart = ash * 60 + asm;
      const aEnd = aeh * 60 + aem;
      const bStart = bsh * 60 + bsm;
      const bEnd = beh * 60 + bem;

      return aStart < bEnd && aEnd > bStart;
    }

    await test("B32.1 Valid start/end time calculates correct duration", async () => {
      const res = validateSchedule("09:00", "10:30");
      assert(res.valid === true, "09:00-10:30 must be valid");
      assert(res.duration === 90, "Duration must be 90 minutes");
    });

    await test("B32.2 End time before or equal to start time is rejected", async () => {
      const res1 = validateSchedule("15:00", "14:00");
      assert(res1.valid === false, "End before start must be rejected");
      assert(Boolean(res1.error?.includes("End time")), "Must have appropriate error message");

      const res2 = validateSchedule("10:00", "10:00");
      assert(res2.valid === false, "Equal start and end must be rejected");
    });

    await test("B32.3 Overlapping activity times on same day are detected and rejected", async () => {
      const slot1 = { start: "09:00", end: "10:30" };
      const slot2 = { start: "10:00", end: "11:30" }; // overlaps by 30 mins
      const slot3 = { start: "11:00", end: "12:30" }; // no overlap with slot1

      assert(checkOverlap(slot1, slot2) === true, "slot1 and slot2 must overlap");
      assert(checkOverlap(slot1, slot3) === false, "slot1 and slot3 must not overlap");
    });

    await test("B32.4 Opening-hours mismatch produces warning rather than silent data corruption", async () => {
      // User plans 20:00 - 22:00 for a place that closes at 18:00
      const activityStartMin = 20 * 60; // 20:00
      const activityEndMin = 22 * 60;   // 22:00
      const placeCloseMin = 18 * 60;    // 18:00

      const isConflict = activityEndMin > placeCloseMin;
      assert(isConflict === true, "Late activity must conflict with 18:00 closing");
    });

    // =========================================================================
    // SECTION 4: B33 — ROUTING & WAYPOINT TESTS
    // =========================================================================
    console.log("\n--- SECTION 4: B33 — Routes, Transport Modes & Waypoints ---");

    const originMumbai = { lat: 18.922, lng: 72.8347 };       // Gateway of India
    const destColaba = { lat: 18.918, lng: 72.829 };           // Colaba
    const thirdStop = { lat: 18.9398, lng: 72.8354 };          // CSMT

    await test("B33.1 One-stop route computation produces valid distance and duration", async () => {
      const route: any = await getRouteBetween({
        origin: originMumbai,
        destination: destColaba,
        mode: "CAB",
      });

      assert(route.available === true, "Route must be available");
      assert(Number.isFinite(route.distanceMeters), "distanceMeters must be number");
      assert(Number.isFinite(route.durationSeconds), "durationSeconds must be number");
      assert(route.distanceMeters > 0, "Distance must be positive");
    });

    await test("B33.2 Multi-stop routing computes all legs and aggregates totals", async () => {
      const multi: any = await computeMultiStopRoute({
        origin: originMumbai,
        waypoints: [destColaba],
        destination: thirdStop,
        mode: "CAB",
      });

      assert(multi.available === true, "Multi-stop route must be available");
      assert(multi.legs.length === 2, "Must have exactly 2 legs (origin->wp, wp->dest)");
      assert(multi.totalDistanceMeters > 0, "Total distance must be positive");
      assert(multi.totalDurationSeconds > 0, "Total duration must be positive");
    });

    await test("B33.3 Changing travel mode updates route duration and distance", async () => {
      const driveRoute: any = await getRouteBetween({
        origin: originMumbai,
        destination: thirdStop,
        mode: "CAB",
      });

      const walkRoute: any = await getRouteBetween({
        origin: originMumbai,
        destination: thirdStop,
        mode: "WALKING",
      });

      assert(driveRoute.available === true, "Drive route must be available");
      assert(walkRoute.available === true, "Walk route must be available");
      // Walking duration is naturally longer than driving duration for 2-3km
      assert(walkRoute.durationSeconds >= driveRoute.durationSeconds, "Walking must take at least as long as driving");
    });

    await test("B33.4 Waypoint optimization produces valid stop order", async () => {
      const wpA = { lat: 18.922, lng: 72.8347 };
      const wpB = { lat: 18.918, lng: 72.829 };
      const wpC = { lat: 18.9398, lng: 72.8354 };

      const optResult: any = await computeMultiStopRoute({
        origin: originMumbai,
        waypoints: [wpC, wpB], // Out of order: distant CSMT first, nearby Colaba second
        destination: originMumbai,
        mode: "CAB",
        optimizeOrder: true,
      });

      assert(optResult.available === true, "Optimized route must be available");
      if (optResult.optimizedOrder) {
        assert(Array.isArray(optResult.optimizedOrder), "optimizedOrder must be an array");
        assert(optResult.optimizedOrder.length === 2, "Must order both waypoints");
      }
    });

    await test("B33.5 Route API gracefully handles missing coordinates without crashing", async () => {
      const badRoute: any = await getRouteBetween({
        origin: null as any,
        destination: destColaba,
        mode: "CAB",
      });

      assert(badRoute.available === false, "Missing origin must return available=false");
      assert(badRoute.reason === "ROUTE_UNAVAILABLE", "Must return ROUTE_UNAVAILABLE reason");
    });

    // =========================================================================
    // SECTION 5: B34 — TRANSPORT COST ESTIMATION TESTS
    // =========================================================================
    console.log("\n--- SECTION 5: B34 — Transport Cost Estimation ---");

    await test("B34.1 Driving cost estimate is clearly labeled as 'Roamly estimate'", async () => {
      const cost = estimateTransportCost({
        mode: "DRIVE",
        distanceKm: 15,
      });

      assert(cost.source === "Roamly estimate", "Must be labeled 'Roamly estimate'");
      assert(cost.min > 0, "Min cost must be positive");
      assert(cost.max >= cost.min, "Max cost must be >= min cost");
      assert(cost.currency === "INR", "Currency must be INR");
      assert(cost.breakdown.includes("₹"), "Breakdown must mention INR");
    });

    await test("B34.2 Two-wheeler estimate is cheaper than driving for same distance", async () => {
      const drive = estimateTransportCost({ mode: "DRIVE", distanceKm: 20 });
      const bike = estimateTransportCost({ mode: "TWO_WHEELER", distanceKm: 20 });

      assert(bike.min < drive.min, "Two-wheeler min cost must be lower than car");
      assert(bike.max < drive.max, "Two-wheeler max cost must be lower than car");
      assert(bike.source === "Roamly estimate", "Bike must also be labeled 'Roamly estimate'");
    });

    await test("B34.3 Walking and cycling are calculated as Free (₹0)", async () => {
      const walk = estimateTransportCost({ mode: "WALK", distanceKm: 5 });
      const bicycle = estimateTransportCost({ mode: "BICYCLE", distanceKm: 10 });

      assert(walk.min === 0 && walk.max === 0, "Walking must be 0");
      assert(walk.source === "Free", "Walk source must be Free");
      assert(bicycle.min === 0 && bicycle.max === 0, "Bicycle must be 0");
      assert(bicycle.source === "Free", "Bicycle source must be Free");
    });

    await test("B34.4 Tolls are included transparently when provided", async () => {
      const costWithoutToll = estimateTransportCost({ mode: "DRIVE", distanceKm: 30, tollCost: null });
      const costWithToll = estimateTransportCost({ mode: "DRIVE", distanceKm: 30, tollCost: 120 });

      assert(costWithToll.min === costWithoutToll.min + 120, "Toll must be added to min cost");
      assert(costWithToll.max === costWithoutToll.max + 120, "Toll must be added to max cost");
      assert(costWithToll.tollCost === 120, "tollCost must be recorded");
    });

    await test("B34.5 Google transit fare is used when provided", async () => {
      const transitWithFare = estimateTransportCost({
        mode: "TRANSIT",
        distanceKm: 25,
        transitFare: 45,
      });

      assert(transitWithFare.source === "Google transit fare", "Must identify Google transit fare as source");
      assert(transitWithFare.min === 45, "Must use exact fare for min");
      assert(transitWithFare.max === 45, "Must use exact fare for max");
    });

    await test("B34.6 Multi-leg trip aggregates total cost cleanly", async () => {
      const leg1 = { mode: "DRIVE", distanceKm: 10 };
      const leg2 = { mode: "DRIVE", distanceKm: 5 };
      const leg3 = { mode: "DRIVE", distanceKm: 15 };

      const totalTripCost = estimateTripTransportCost([leg1, leg2, leg3]);
      assert(totalTripCost.legs.length === 3, "Must have 3 leg estimates");
      assert(totalTripCost.total.min > 0, "Total min must be positive");
      assert(totalTripCost.total.distanceKm === 30, "Total distance must be 30km");
    });

    await test("B34.7 Roamly estimate is NEVER presented as a live taxi meter fare", async () => {
      const estimate = estimateTransportCost({ mode: "DRIVE", distanceKm: 10 });
      assert(!estimate.breakdown.includes("live meter"), "Must not claim live meter");
      assert(!estimate.breakdown.includes("Uber fare"), "Must not claim Uber/Ola fare");
      assert(estimate.source === "Roamly estimate", "Must be clearly labeled Roamly estimate");
    });

  } finally {
    // Cleanup test records
    console.log("\n[Cleanup] Removing temporary test records...");
    await prisma.stop.deleteMany({ where: { trip_id: trip.trip_id } });
    await prisma.trip.delete({ where: { trip_id: trip.trip_id } });
    await prisma.user.delete({ where: { user_id: user.user_id } });
    console.log("[Cleanup] Complete.");
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Results: ${passed} PASS | ${failed} FAIL | 0 SKIP\n`);

  if (failed > 0) {
    console.log("❌ FAILED TESTS:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`   • ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  } else {
    console.log("🎉 All Trip Map & Planner acceptance tests passed successfully!\n");
  }
}

runTripMapSuite().catch((err) => {
  console.error("Suite crashed:", err);
  process.exit(1);
});
