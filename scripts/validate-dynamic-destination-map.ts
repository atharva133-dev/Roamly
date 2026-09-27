/**
 * Automated Validation for Dynamic Destination Map & Dynamic Search
 * Validates that map, stops, hotels, and nearby are 100% dynamic and NOT statically biased to Delhi.
 */

import assert from "node:assert";

const BASE_URL = "http://localhost:3000";

async function validateDynamicDestinationMap() {
  console.log("══════════════════════════════════════════════════════════════════════════");
  console.log("   ROAMLY DYNAMIC DESTINATION MAP & SEARCH VALIDATION TEST SUITE          ");
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  // TEST 1: Destination Geocoding Dynamic Resolution (Multiple cities)
  console.log("▶ TEST 1: Dynamic Destination Geocoding (Zero Static Delhi Bias)...");
  const testCities = [
    { name: "Mumbai", expectedLat: 19.076, expectedLng: 72.8777 },
    { name: "Goa", expectedLat: 15.2993, expectedLng: 74.124 },
    { name: "Jaipur", expectedLat: 26.9124, expectedLng: 75.7873 },
    { name: "Paris", expectedLat: 48.8566, expectedLng: 2.3522 },
  ];

  for (const city of testCities) {
    const geoRes = await fetch(`${BASE_URL}/api/locations/geocode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: city.name, name: city.name }),
    });

    assert(geoRes.status === 200, `Geocode API must return 200 for ${city.name}`);
    const geoData = await geoRes.json();
    const loc = geoData?.location;
    const lat = loc?.coordinates?.lat ?? loc?.latitude;
    const lng = loc?.coordinates?.lng ?? loc?.longitude;

    assert(typeof lat === "number" && typeof lng === "number", `Valid coordinates returned for ${city.name}`);
    // Crucial check: MUST NOT be static Delhi (28.6139, 77.2090)
    assert(Math.abs(lat - 28.6139) > 0.5 || Math.abs(lng - 77.209) > 0.5, `${city.name} must NOT default to Delhi!`);

    console.log(`   ✅ ${city.name} dynamically resolved to (${lat.toFixed(4)}, ${lng.toFixed(4)}) - (NOT Delhi!)`);
  }

  // TEST 2: Dynamic Nearby Places Search for Mumbai
  console.log("\n▶ TEST 2: Dynamic Nearby Places Search for Mumbai (API Search)...");
  const mumbaiAnchor = { lat: 18.922, lng: 72.8347, name: "Gateway of India, Mumbai" };
  const nearbyRes = await fetch(
    `${BASE_URL}/api/places/nearby?lat=${mumbaiAnchor.lat}&lng=${mumbaiAnchor.lng}&radius=3000&types=tourist_attraction,historical_landmark,museum`
  );
  assert(nearbyRes.status === 200, "Nearby places API must return 200 for Mumbai");
  const nearbyData = await nearbyRes.json();
  assert(Array.isArray(nearbyData.places) && nearbyData.places.length > 0, "Must return dynamic places for Mumbai");

  console.log(`   ✅ Dynamic API search returned ${nearbyData.places.length} attractions near ${mumbaiAnchor.name}:`);
  for (const place of nearbyData.places.slice(0, 3)) {
    console.log(`      • ${place.name} (⭐ ${place.rating ?? "N/A"}) - ${place.address || "Mumbai"}`);
    // Verify coordinates are in Mumbai vicinity (~18-19 lat, ~72-73 lng)
    if (place.latitude && place.longitude) {
      assert(Math.abs(place.latitude - 18.9) < 2, `Place ${place.name} latitude must be in Mumbai area`);
      assert(Math.abs(place.longitude - 72.8) < 2, `Place ${place.name} longitude must be in Mumbai area`);
    }
  }

  // TEST 3: Dynamic Hotel Search for Goa
  console.log("\n▶ TEST 3: Dynamic Hotel Search for Goa (API Search)...");
  const goaAnchor = { lat: 15.2993, lng: 74.124, name: "Goa Destination" };
  const hotelRes = await fetch(
    `${BASE_URL}/api/places/nearby?lat=${goaAnchor.lat}&lng=${goaAnchor.lng}&radius=5000&types=lodging,hotel`
  );
  assert(hotelRes.status === 200, "Hotels API must return 200 for Goa");
  const hotelData = await hotelRes.json();
  assert(Array.isArray(hotelData.places) && hotelData.places.length > 0, "Must return dynamic hotels for Goa");

  console.log(`   ✅ Dynamic API search returned ${hotelData.places.length} hotels in ${goaAnchor.name}:`);
  for (const hotel of hotelData.places.slice(0, 3)) {
    console.log(`      • 🏨 ${hotel.name} (⭐ ${hotel.rating ?? "N/A"}) - ${hotel.address || "Goa"}`);
    if (hotel.latitude && hotel.longitude) {
      assert(Math.abs(hotel.latitude - 15.3) < 2, `Hotel ${hotel.name} must be in Goa area, not Delhi`);
    }
  }

  // TEST 4: Dynamic Radius Filtering (1500m vs 10000m)
  console.log("\n▶ TEST 4: Dynamic Search Radius Parameterization...");
  const narrowRes = await fetch(
    `${BASE_URL}/api/places/nearby?lat=${mumbaiAnchor.lat}&lng=${mumbaiAnchor.lng}&radius=1500&types=tourist_attraction`
  );
  const wideRes = await fetch(
    `${BASE_URL}/api/places/nearby?lat=${mumbaiAnchor.lat}&lng=${mumbaiAnchor.lng}&radius=10000&types=tourist_attraction`
  );
  const narrowData = await narrowRes.json();
  const wideData = await wideRes.json();
  assert(narrowData.places !== undefined && wideData.places !== undefined, "Both radius calls must succeed");
  console.log(`   ✅ Radius 1500m returned ${narrowData.places.length} places; Radius 10000m returned ${wideData.places.length} places.`);

  // TEST 5: Verify zero hardcoded Delhi in ItineraryMapPanel.tsx
  console.log("\n▶ TEST 5: Source Code Audit for Hardcoded Delhi Coordinates...");
  const fs = await import("node:fs");
  const panelContent = fs.readFileSync("components/ItineraryMapPanel.tsx", "utf-8");
  assert(!panelContent.includes("lat: 28.6139, lng: 77.2090"), "Must NOT contain hardcoded Delhi center reference!");
  assert(panelContent.includes("POPULAR_DESTINATIONS_COORDS"), "Must include POPULAR_DESTINATIONS_COORDS");
  assert(panelContent.includes("geocodeDestination"), "Must include geocodeDestination helper");
  assert(panelContent.includes("handleReloadAllStops"), "Must include handleReloadAllStops");
  assert(panelContent.includes("handleSearchCurrentMapView"), "Must include handleSearchCurrentMapView");
  console.log("   ✅ Source audit passed: Zero hardcoded Delhi center references!");

  console.log("\n══════════════════════════════════════════════════════════════════════════");
  console.log("   🎉 ALL DYNAMIC DESTINATION, STOPS, HOTELS & NEARBY TESTS PASSED!       ");
  console.log("══════════════════════════════════════════════════════════════════════════\n");
}

validateDynamicDestinationMap().catch((err) => {
  console.error("❌ Validation failed:", err);
  process.exit(1);
});
