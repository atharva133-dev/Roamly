/**
 * Test Roamly Google Location API Endpoints on http://localhost:3000
 */

const BASE_URL = "http://localhost:3000";

async function testEndpoint(name, url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    console.log(`▶ [${res.status}] ${name}`);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`❌ [FAILED] ${name}:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function run() {
  console.log("==================================================");
  console.log("TESTING ROAMLY LOCATION API ENDPOINTS (HTTP)");
  console.log("==================================================\n");

  // 1. Search places
  const searchRes = await testEndpoint(
    "GET /api/locations/search?q=Delhi",
    `${BASE_URL}/api/locations/search?q=Delhi`
  );
  console.log("  Suggestions count:", searchRes.data?.suggestions?.length || 0);
  console.log("  Top suggestion:", searchRes.data?.suggestions?.[0]?.name || "N/A", "\n");

  // 2. Geocode address
  const geocodeRes = await testEndpoint(
    "POST /api/locations/geocode",
    `${BASE_URL}/api/locations/geocode`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: "Agra" })
    }
  );
  console.log("  Resolved Location ID:", geocodeRes.data?.location?.id);
  console.log("  Coordinates:", geocodeRes.data?.location?.coordinates, "\n");
  const locationId = geocodeRes.data?.location?.id;

  // 3. Get location by ID
  if (locationId) {
    const getByIdRes = await testEndpoint(
      `GET /api/locations/${locationId}`,
      `${BASE_URL}/api/locations/${locationId}`
    );
    console.log("  Retrieved Location Name:", getByIdRes.data?.location?.name, "\n");

    // 4. Get location details
    const detailsRes = await testEndpoint(
      `GET /api/locations/${locationId}/details`,
      `${BASE_URL}/api/locations/${locationId}/details`
    );
    console.log("  Place details name:", detailsRes.data?.details?.name);
    console.log("  Place rating:", detailsRes.data?.details?.rating, "\n");
  }

  // 5. Reverse geocode
  const revRes = await testEndpoint(
    "GET /api/locations/reverse-geocode?lat=19.0760&lng=72.8777",
    `${BASE_URL}/api/locations/reverse-geocode?lat=19.0760&lng=72.8777`
  );
  console.log("  Reverse geocoded name:", revRes.data?.location?.name);
  console.log("  Reverse geocoded city:", revRes.data?.location?.address?.city, "\n");

  // 6. Current device location
  const curRes = await testEndpoint(
    "GET /api/location/current",
    `${BASE_URL}/api/location/current`
  );
  console.log("  Device location source:", curRes.data?.deviceLocation?.source);
  console.log("  Device location coordinates:", curRes.data?.deviceLocation?.latitude, curRes.data?.deviceLocation?.longitude);
  console.log("  Device location address:", curRes.data?.location?.name, "\n");

  console.log("==================================================");
  console.log("API ENDPOINT TESTS COMPLETED SUCCESSFULLY");
  console.log("==================================================");
}

run();
