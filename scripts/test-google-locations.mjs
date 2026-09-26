/**
 * Roamly Google Location Foundation Acceptance Tests
 * 
 * Tests:
 * TEST A — User Entered Location (Search -> placeId -> resolve -> Location record)
 * TEST B — Multiple Destinations (Delhi, Agra, Jaipur -> 3 normalized locations)
 * TEST C — Repeated Visit (Delhi -> Agra -> Delhi -> same Location reused, separate TripStops)
 * TEST D — Current Location (Device coordinates -> Reverse geocode -> Address)
 * TEST E — Fallback / Resiliency (Works safely without crashing when Google key is offline)
 */

import { searchPlaces, getPlaceDetailsById, geocode, reverseGeocodeCoordinates, getCurrentDeviceNetworkLocation, findOrCreateLocation, recordTripStop } from "../server/src/services/googleMapsGateway.js";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING ROAMLY GOOGLE LOCATION ACCEPTANCE TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  // TEST A: USER ENTERED LOCATION
  console.log("▶ TEST A: User Entered Location (Gateway of India)...");
  try {
    const candidates = await searchPlaces("Gateway of India");
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned for Gateway of India");
    }
    const selected = candidates[0];
    console.log("  1. Candidate found:", selected.name || selected.mainText);
    console.log("  2. Place ID captured:", selected.placeId);

    const location = await findOrCreateLocation({
      placeId: selected.placeId,
      name: selected.mainText || selected.name
    });

    if (!location.id) throw new Error("Location record was not created/found");
    if (!location.coordinates || !location.coordinates.lat || !location.coordinates.lng) {
      throw new Error("Coordinates were not resolved");
    }

    console.log("  3. Coordinates resolved:", location.coordinates);
    console.log("  4. Canonical Location created/found:", location.id, `(${location.name})`);
    console.log("  ✅ TEST A PASSED\n");
    passed++;
  } catch (err) {
    console.error("  ❌ TEST A FAILED:", err.message, "\n");
    failed++;
  }

  // TEST B: MULTIPLE DESTINATIONS
  console.log("▶ TEST B: Multiple Destinations (Delhi, Agra, Jaipur)...");
  let delhiLoc, agraLoc, jaipurLoc;
  try {
    delhiLoc = await findOrCreateLocation({ name: "Delhi" });
    agraLoc = await findOrCreateLocation({ name: "Agra" });
    jaipurLoc = await findOrCreateLocation({ name: "Jaipur" });

    if (!delhiLoc.id || !agraLoc.id || !jaipurLoc.id) {
      throw new Error("Failed to create all 3 locations");
    }

    const uniqueIds = new Set([delhiLoc.id, agraLoc.id, jaipurLoc.id]);
    if (uniqueIds.size !== 3) {
      throw new Error("Location IDs must be unique for different cities");
    }

    console.log("  1. Delhi Location:", delhiLoc.id, delhiLoc.coordinates);
    console.log("  2. Agra Location:", agraLoc.id, agraLoc.coordinates);
    console.log("  3. Jaipur Location:", jaipurLoc.id, jaipurLoc.coordinates);
    console.log("  ✅ TEST B PASSED\n");
    passed++;
  } catch (err) {
    console.error("  ❌ TEST B FAILED:", err.message, "\n");
    failed++;
  }

  // TEST C: REPEATED VISIT
  console.log("▶ TEST C: Repeated Visit (Delhi -> Agra -> Delhi)...");
  try {
    // Second visit to Delhi
    const delhiSecondVisit = await findOrCreateLocation({ name: "Delhi" });

    if (delhiSecondVisit.id !== delhiLoc.id) {
      throw new Error(`Duplicate Location created! Expected ${delhiLoc.id}, got ${delhiSecondVisit.id}`);
    }
    console.log("  1. Reused exact same Delhi Location record:", delhiSecondVisit.id);

    // Record separate TripStops for a trip (tripId: 9999)
    const tripId = 9999;
    const stop1 = await recordTripStop({ tripId, locationId: delhiLoc.id, sequence: 1 });
    const stop2 = await recordTripStop({ tripId, locationId: agraLoc.id, sequence: 2 });
    const stop3 = await recordTripStop({ tripId, locationId: delhiLoc.id, sequence: 3 });

    console.log(`  2. Stop 1 (seq 1): Location=${stop1.locationId}`);
    console.log(`  3. Stop 2 (seq 2): Location=${stop2.locationId}`);
    console.log(`  4. Stop 3 (seq 3): Location=${stop3.locationId}`);

    if (stop1.locationId !== stop3.locationId) {
      throw new Error("Repeated visit did not reference same Location ID");
    }

    console.log("  ✅ TEST C PASSED\n");
    passed++;
  } catch (err) {
    console.error("  ❌ TEST C FAILED:", err.message, "\n");
    failed++;
  }

  // TEST D: CURRENT LOCATION
  console.log("▶ TEST D: Current Location (Device Geolocation & Reverse Geocode)...");
  try {
    const devLoc = await getCurrentDeviceNetworkLocation({ considerIp: true });
    console.log("  1. Device coordinates detected:", devLoc);
    if (!devLoc.latitude || !devLoc.longitude) {
      throw new Error("Failed to detect device coordinates");
    }

    const rev = await reverseGeocodeCoordinates(devLoc.latitude, devLoc.longitude);
    console.log("  2. Reverse geocode resolved address:", rev.formattedAddress || rev.city);
    if (!rev.formattedAddress && !rev.city) {
      throw new Error("Failed to resolve human-readable address from coordinates");
    }

    console.log("  ✅ TEST D PASSED\n");
    passed++;
  } catch (err) {
    console.error("  ❌ TEST D FAILED:", err.message, "\n");
    failed++;
  }

  // TEST E: PLACE DETAILS WITH FIELD MASKS
  console.log("▶ TEST E: Place Details with Field Masks...");
  try {
    const details = await getPlaceDetailsById("ChIJbU60qHA6DDkRkiAnUt-3NLg");
    if (!details) {
      throw new Error("Failed to retrieve place details");
    }
    console.log("  1. Place Details name:", details.name);
    console.log("  2. Place Details address:", details.address);
    console.log("  3. Place Details rating:", details.rating, `(${details.userRatingCount} reviews)`);
    console.log("  4. Regular opening hours present:", Boolean(details.regularOpeningHours));
    console.log("  ✅ TEST E PASSED\n");
    passed++;
  } catch (err) {
    console.error("  ❌ TEST E FAILED:", err.message, "\n");
    failed++;
  }

  console.log("==================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
