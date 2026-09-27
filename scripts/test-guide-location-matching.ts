import { calculateHaversineDistanceKm, discoverEligibleGuides } from "../lib/guides/guide-matching";
import prisma from "../lib/prisma";
import { UserRole, VerificationStatus, AvailabilityStatus } from "@prisma/client";

async function runLocationMatchingTests() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("    GUIDE LOCATION MATCHING & DISTANCE CALCULATION TESTS       ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (detail) console.log(`     Detail: ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
      failed++;
    }
  }

  // Unit Test: Haversine distance calculation
  console.log("── Testing Distance Calculation (Haversine Formula) ──");
  // Mumbai to Thane is approx 24-28 km
  const distMumbaiThane = calculateHaversineDistanceKm(18.922, 72.8347, 19.2183, 72.9781);
  assert(distMumbaiThane > 20 && distMumbaiThane < 40, "Mumbai to Thane distance approx 25-35 km", `${distMumbaiThane.toFixed(2)} km`);

  // Mumbai to Pune is approx 120 km
  const distMumbaiPune = calculateHaversineDistanceKm(18.922, 72.8347, 18.5204, 73.8567);
  assert(distMumbaiPune > 110 && distMumbaiPune < 140, "Mumbai to Pune distance approx 120 km", `${distMumbaiPune.toFixed(2)} km`);

  // Mumbai to Delhi is approx > 1100 km
  const distMumbaiDelhi = calculateHaversineDistanceKm(18.922, 72.8347, 28.6139, 77.209);
  assert(distMumbaiDelhi > 1100, "Mumbai to Delhi distance > 1100 km", `${distMumbaiDelhi.toFixed(2)} km`);

  // Setup temporary test database records
  console.log("\n── Testing Database Location & Multi-Area Guide Matching ──");
  const testPrefix = `test_loc_${Date.now()}`;
  const createdUserIds: string[] = [];
  const createdLocationIds: string[] = [];

  try {
    // 1. Create test locations
    const locMumbai = await prisma.location.create({
      data: {
        name: `${testPrefix}_Mumbai`,
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        latitude: 18.922,
        longitude: 72.8347,
      },
    });
    createdLocationIds.push(locMumbai.id);

    const locThane = await prisma.location.create({
      data: {
        name: `${testPrefix}_Thane`,
        city: "Thane",
        state: "Maharashtra",
        country: "India",
        latitude: 19.2183,
        longitude: 72.9781, // ~33km from Mumbai center
      },
    });
    createdLocationIds.push(locThane.id);

    const locPune = await prisma.location.create({
      data: {
        name: `${testPrefix}_Pune`,
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        latitude: 18.5204,
        longitude: 73.8567,
      },
    });
    createdLocationIds.push(locPune.id);

    const locDelhi = await prisma.location.create({
      data: {
        name: `${testPrefix}_Delhi`,
        city: "Delhi",
        state: "Delhi",
        country: "India",
        latitude: 28.6139,
        longitude: 77.209,
      },
    });
    createdLocationIds.push(locDelhi.id);

    // 2. Create guides
    // Guide A: Operates in Mumbai AND Pune (Multi-location guide)
    const userA = await prisma.user.create({
      data: {
        email: `${testPrefix}_guideA@test.local`,
        full_name: "Guide MultiArea A",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userA.user_id);
    const profileA = await prisma.guideProfile.create({
      data: {
        user_id: userA.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 800,
        experience_years: 5,
        languages: ["English", "Hindi", "Marathi"],
        expertise: ["Heritage", "Food"],
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.createMany({
      data: [
        { guide_id: profileA.id, location_id: locMumbai.id, is_active: true },
        { guide_id: profileA.id, location_id: locPune.id, is_active: true },
      ],
    });

    // Guide B: Operates in Mumbai only
    const userB = await prisma.user.create({
      data: {
        email: `${testPrefix}_guideB@test.local`,
        full_name: "Guide Mumbai B",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userB.user_id);
    const profileB = await prisma.guideProfile.create({
      data: {
        user_id: userB.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 700,
        experience_years: 3,
        languages: ["English", "Hindi"],
        expertise: ["Sightseeing"],
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileB.id, location_id: locMumbai.id, is_active: true },
    });

    // Guide C: Operates in Thane only (Nearby to Mumbai, ~33km)
    const userC = await prisma.user.create({
      data: {
        email: `${testPrefix}_guideC@test.local`,
        full_name: "Guide Thane C",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userC.user_id);
    const profileC = await prisma.guideProfile.create({
      data: {
        user_id: userC.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 600,
        experience_years: 2,
        languages: ["Marathi"],
        current_location_id: locThane.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileC.id, location_id: locThane.id, is_active: true },
    });

    // Guide D: Operates in Delhi only (Distant from Mumbai, > 1000 km)
    const userD = await prisma.user.create({
      data: {
        email: `${testPrefix}_guideD@test.local`,
        full_name: "Guide Delhi D",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userD.user_id);
    const profileD = await prisma.guideProfile.create({
      data: {
        user_id: userD.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 900,
        experience_years: 6,
        languages: ["Hindi", "English"],
        current_location_id: locDelhi.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileD.id, location_id: locDelhi.id, is_active: true },
    });

    // Test A: Single Area Search for Mumbai
    console.log("\n* Querying for Single Area: Mumbai");
    const resultMumbai = await discoverEligibleGuides(["Mumbai"], { radiusKm: 50 });
    console.log("resultMumbai guides count:", resultMumbai.guides.length, JSON.stringify(resultMumbai.guides.map(g => ({ id: g.guideId, name: g.guideName, matchedAreas: g.matchedAreas, nearbyAreas: g.nearbyAreas })), null, 2));
    
    // Guide A and B should be exact matches for Mumbai
    const foundA = resultMumbai.guides.find((g) => g.guideId === profileA.id);
    const foundB = resultMumbai.guides.find((g) => g.guideId === profileB.id);
    const foundC = resultMumbai.guides.find((g) => g.guideId === profileC.id);
    const foundD = resultMumbai.guides.find((g) => g.guideId === profileD.id);

    assert(Boolean(foundA && foundA.matchedAreas.includes("Mumbai")), "Guide A (Mumbai + Pune) matches Mumbai exactly", `matchedAreas: ${foundA?.matchedAreas.join(",")}`);
    assert(Boolean(foundB && foundB.matchedAreas.includes("Mumbai")), "Guide B (Mumbai only) matches Mumbai exactly", `matchedAreas: ${foundB?.matchedAreas.join(",")}`);
    assert(Boolean(foundC && foundC.matchType === "NEARBY"), "Guide C (Thane) included as NEARBY match within radius (50km)", `distance: ${foundC?.distanceKm?.toFixed(1)} km, matchType: ${foundC?.matchType}`);
    assert(!foundD, "Guide D (Delhi, >1100km) excluded from Mumbai search results");

    // Exact matches ranked ahead of nearby matches
    const indexA = resultMumbai.guides.findIndex((g) => g.guideId === profileA.id);
    const indexC = resultMumbai.guides.findIndex((g) => g.guideId === profileC.id);
    assert(indexA < indexC, "Exact match Guide A ranked ahead of nearby match Guide C");

    // Test B: Multi-Area Search for [Mumbai, Pune]
    console.log("\n* Querying for Multiple Areas: [Mumbai, Pune]");
    const resultMulti = await discoverEligibleGuides(["Mumbai", "Pune"], { radiusKm: 50 });
    const multiFoundA = resultMulti.guides.find((g) => g.guideId === profileA.id);
    const multiFoundB = resultMulti.guides.find((g) => g.guideId === profileB.id);

    assert(Boolean(multiFoundA && multiFoundA.coverageCount === 2), "Guide A matches both Mumbai and Pune (2/2 areas)", `coverage: ${multiFoundA?.coverageCount}/2, matchedAreas: ${multiFoundA?.matchedAreas.join(",")}`);
    assert(Boolean(multiFoundA && multiFoundA.isAllCovered === true), "Guide A isAllCovered = true (covers all selected areas)");
    assert(Boolean(multiFoundB && multiFoundB.coverageCount === 1), "Guide B matches only 1 area (Mumbai, 1/2 areas)", `coverage: ${multiFoundB?.coverageCount}/2`);

    const multiIndexA = resultMulti.guides.findIndex((g) => g.guideId === profileA.id);
    const multiIndexB = resultMulti.guides.findIndex((g) => g.guideId === profileB.id);
    assert(multiIndexA < multiIndexB, "Multi-area match Guide A (2 areas) ranked higher than single-area match Guide B (1 area)");

  } finally {
    // Cleanup test records
    console.log("\n[Cleanup] Removing temporary location test data...");
    for (const userId of createdUserIds) {
      await prisma.guideLocation.deleteMany({ where: { guide: { user_id: userId } } });
      await prisma.guideProfile.deleteMany({ where: { user_id: userId } });
      await prisma.user.delete({ where: { user_id: userId } });
    }
    for (const locId of createdLocationIds) {
      await prisma.location.delete({ where: { id: locId } });
    }
    console.log("[Cleanup] Complete.");
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  LOCATION MATCHING SUITE: ${passed} PASSED, ${failed} FAILED                 ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLocationMatchingTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
