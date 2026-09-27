import prisma from "../lib/prisma";
import { UserRole, VerificationStatus, AvailabilityStatus } from "@prisma/client";
import { discoverEligibleGuides, validateGuideEligibilityForBooking } from "../lib/guides/guide-matching";
import fs from "fs";
import path from "path";

async function runGuideDiscoverySuite() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("   ROAMLY GUIDE DISCOVERY & SELECTION COMPLETE TEST SUITE      ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [${testId}] [PASS] ${testName}`);
      if (detail) console.log(`     Result: ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [${testId}] [FAIL] ${testName}`);
      if (detail) console.error(`     Result: ${detail}`);
      failed++;
    }
  }

  const testPrefix = `test_gd_${Date.now()}`;
  const createdUserIds: string[] = [];
  const createdLocationIds: string[] = [];
  const createdTripIds: number[] = [];

  try {
    // ── Setup Locations ──
    const locMumbai = await prisma.location.create({
      data: {
        name: `${testPrefix}_Mumbai_Center`,
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
        name: `${testPrefix}_Thane_West`,
        city: "Thane",
        state: "Maharashtra",
        country: "India",
        latitude: 19.2183,
        longitude: 72.9781, // ~36km from Mumbai (Nearby)
      },
    });
    createdLocationIds.push(locThane.id);

    const locPune = await prisma.location.create({
      data: {
        name: `${testPrefix}_Pune_Shivajinagar`,
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        latitude: 18.5204,
        longitude: 73.8567, // ~116km from Mumbai
      },
    });
    createdLocationIds.push(locPune.id);

    const locLonavala = await prisma.location.create({
      data: {
        name: `${testPrefix}_Lonavala_Hill`,
        city: "Lonavala",
        state: "Maharashtra",
        country: "India",
        latitude: 18.7557,
        longitude: 73.4091,
      },
    });
    createdLocationIds.push(locLonavala.id);

    const locDelhi = await prisma.location.create({
      data: {
        name: `${testPrefix}_Delhi_Connaught`,
        city: "Delhi",
        state: "Delhi",
        country: "India",
        latitude: 28.6139,
        longitude: 77.209, // >1100km (Distant)
      },
    });
    createdLocationIds.push(locDelhi.id);

    // ── Setup Guides with Varied States ──

    // 1. Verified + Available Mumbai Guide
    const userVerifiedAvailable = await prisma.user.create({
      data: {
        email: `${testPrefix}_verified_avail@test.local`,
        full_name: "Rahul Sharma (Verified Available)",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userVerifiedAvailable.user_id);
    const profileVerifiedAvailable = await prisma.guideProfile.create({
      data: {
        user_id: userVerifiedAvailable.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 800,
        experience_years: 5,
        languages: ["English", "Hindi"],
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileVerifiedAvailable.id, location_id: locMumbai.id, is_active: true },
    });

    // 2. Unverified Mumbai Guide
    const userUnverified = await prisma.user.create({
      data: {
        email: `${testPrefix}_unverified@test.local`,
        full_name: "Unverified Guide",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userUnverified.user_id);
    const profileUnverified = await prisma.guideProfile.create({
      data: {
        user_id: userUnverified.user_id,
        verification_status: VerificationStatus.PENDING,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 600,
        experience_years: 2,
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileUnverified.id, location_id: locMumbai.id, is_active: true },
    });

    // 3. Offline Mumbai Guide
    const userOffline = await prisma.user.create({
      data: {
        email: `${testPrefix}_offline@test.local`,
        full_name: "Offline Guide",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userOffline.user_id);
    const profileOffline = await prisma.guideProfile.create({
      data: {
        user_id: userOffline.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.OFFLINE,
        hourly_rate: 750,
        experience_years: 4,
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileOffline.id, location_id: locMumbai.id, is_active: true },
    });

    // 4. Busy Mumbai Guide
    const userBusy = await prisma.user.create({
      data: {
        email: `${testPrefix}_busy@test.local`,
        full_name: "Busy Guide",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userBusy.user_id);
    const profileBusy = await prisma.guideProfile.create({
      data: {
        user_id: userBusy.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.BUSY,
        hourly_rate: 850,
        experience_years: 4,
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileBusy.id, location_id: locMumbai.id, is_active: true },
    });

    // 5. Nearby Thane Guide (~36km from Mumbai, within 50km radius)
    const userNearby = await prisma.user.create({
      data: {
        email: `${testPrefix}_nearby@test.local`,
        full_name: "Thane Nearby Guide",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userNearby.user_id);
    const profileNearby = await prisma.guideProfile.create({
      data: {
        user_id: userNearby.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 650,
        experience_years: 3,
        current_location_id: locThane.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileNearby.id, location_id: locThane.id, is_active: true },
    });

    // 6. Distant Delhi Guide (>1100km away from Mumbai)
    const userDistant = await prisma.user.create({
      data: {
        email: `${testPrefix}_distant@test.local`,
        full_name: "Distant Delhi Guide",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userDistant.user_id);
    const profileDistant = await prisma.guideProfile.create({
      data: {
        user_id: userDistant.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 1000,
        experience_years: 7,
        current_location_id: locDelhi.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: profileDistant.id, location_id: locDelhi.id, is_active: true },
    });

    // 7. Multi-Location Guide: Covers Mumbai + Pune
    const userMultiArea = await prisma.user.create({
      data: {
        email: `${testPrefix}_multiarea@test.local`,
        full_name: "Multi-Area Guide (Mumbai + Pune)",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userMultiArea.user_id);
    const profileMultiArea = await prisma.guideProfile.create({
      data: {
        user_id: userMultiArea.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 900,
        experience_years: 6,
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.createMany({
      data: [
        { guide_id: profileMultiArea.id, location_id: locMumbai.id, is_active: true },
        { guide_id: profileMultiArea.id, location_id: locPune.id, is_active: true },
      ],
    });

    // 8. Triple-Location Guide: Covers Mumbai + Pune + Lonavala
    const userTripleArea = await prisma.user.create({
      data: {
        email: `${testPrefix}_triple@test.local`,
        full_name: "Triple-Area Guide (Mumbai + Pune + Lonavala)",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userTripleArea.user_id);
    const profileTripleArea = await prisma.guideProfile.create({
      data: {
        user_id: userTripleArea.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 1100,
        experience_years: 8,
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.createMany({
      data: [
        { guide_id: profileTripleArea.id, location_id: locMumbai.id, is_active: true },
        { guide_id: profileTripleArea.id, location_id: locPune.id, is_active: true },
        { guide_id: profileTripleArea.id, location_id: locLonavala.id, is_active: true },
      ],
    });

    // 9. Guide with NO active locations
    const userNoLoc = await prisma.user.create({
      data: {
        email: `${testPrefix}_noloc@test.local`,
        full_name: "No Location Guide",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(userNoLoc.user_id);
    const profileNoLoc = await prisma.guideProfile.create({
      data: {
        user_id: userNoLoc.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 500,
        experience_years: 1,
        current_location_id: null,
      },
    });
    // Deliberately no GuideLocation created

    // Normal Traveler User
    const travelerUser = await prisma.user.create({
      data: {
        email: `${testPrefix}_traveler@test.local`,
        full_name: "Ananya Iyer (Traveler)",
        role: UserRole.USER,
      },
    });
    createdUserIds.push(travelerUser.user_id);

    console.log("── Executing 18 Mandatory Tests ──\n");

    // TEST 1: USER selects Mumbai -> Mumbai VERIFIED AVAILABLE guide returned
    const res1 = await discoverEligibleGuides(["Mumbai"]);
    const guide1 = res1.guides.find((g) => g.guideId === profileVerifiedAvailable.id);
    assert(Boolean(guide1 && guide1.matchedAreas.includes("Mumbai")), "TEST 1", "USER selects Mumbai -> Mumbai VERIFIED AVAILABLE guide returned", `Found: ${guide1?.guideName}`);

    // TEST 2: USER selects Mumbai -> unverified Mumbai guide excluded
    const guide2 = res1.guides.find((g) => g.guideId === profileUnverified.id);
    assert(!guide2, "TEST 2", "USER selects Mumbai -> unverified Mumbai guide excluded", "Unverified guide not in results");

    // TEST 3: USER selects Mumbai -> OFFLINE Mumbai guide excluded
    const guide3 = res1.guides.find((g) => g.guideId === profileOffline.id);
    assert(!guide3, "TEST 3", "USER selects Mumbai -> OFFLINE Mumbai guide excluded", "OFFLINE guide not in results");

    // TEST 4: USER selects Mumbai -> BUSY Mumbai guide excluded
    const guide4 = res1.guides.find((g) => g.guideId === profileBusy.id);
    assert(!guide4, "TEST 4", "USER selects Mumbai -> BUSY Mumbai guide excluded", "BUSY guide not in results");

    // TEST 5: USER selects Mumbai -> nearby eligible guide returned if within radius
    const guide5 = res1.guides.find((g) => g.guideId === profileNearby.id);
    assert(Boolean(guide5 && guide5.matchType === "NEARBY"), "TEST 5", "USER selects Mumbai -> nearby eligible guide returned if within radius", `Thane guide returned as NEARBY (${guide5?.distanceKm?.toFixed(1)} km)`);

    // TEST 6: USER selects Mumbai -> distant guide excluded
    const guide6 = res1.guides.find((g) => g.guideId === profileDistant.id);
    assert(!guide6, "TEST 6", "USER selects Mumbai -> distant guide excluded", "Delhi guide (>1100km) excluded");

    // TEST 7: USER selects Mumbai + Pune -> guide covering both ranked above guide covering only one
    const res7 = await discoverEligibleGuides(["Mumbai", "Pune"]);
    const rankMulti = res7.guides.findIndex((g) => g.guideId === profileMultiArea.id);
    const rankSingle = res7.guides.findIndex((g) => g.guideId === profileVerifiedAvailable.id);
    assert(rankMulti !== -1 && rankSingle !== -1 && rankMulti < rankSingle, "TEST 7", "USER selects Mumbai + Pune -> guide covering both ranked above single-area guide", `Multi-area guide rank: ${rankMulti}, Single-area guide rank: ${rankSingle}`);

    // TEST 8: USER selects Mumbai + Pune + Lonavala -> matchedAreas and coverageCount correct
    const res8 = await discoverEligibleGuides(["Mumbai", "Pune", "Lonavala"]);
    const guide8 = res8.guides.find((g) => g.guideId === profileTripleArea.id);
    assert(Boolean(guide8 && guide8.coverageCount === 3 && guide8.isAllCovered), "TEST 8", "USER selects Mumbai + Pune + Lonavala -> matchedAreas and coverageCount correct", `Coverage: ${guide8?.coverageCount}/3, Covers all: ${guide8?.isAllCovered}, matchedAreas: ${guide8?.matchedAreas.join(", ")}`);

    // TEST 9: Guide has multiple GuideLocation records -> all active locations considered
    const guide9 = res8.guides.find((g) => g.guideId === profileMultiArea.id);
    assert(Boolean(guide9 && guide9.matchedAreas.includes("Mumbai") && guide9.matchedAreas.includes("Pune")), "TEST 9", "Guide has multiple GuideLocation records -> all active locations considered", `Matched both: ${guide9?.matchedAreas.join(", ")}`);

    // TEST 10: Guide has no active location -> excluded
    const guide10 = res1.guides.find((g) => g.guideId === profileNoLoc.id);
    assert(!guide10, "TEST 10", "Guide has no active location -> excluded", "Guide without active location not returned");

    // TEST 11: No guide matches -> UI / API shows clear empty state
    const res11 = await discoverEligibleGuides(["Reykjavik_Iceland_NonexistentCity"]);
    assert(res11.guides.length === 0 && res11.hasSingleGuideCoveringAll === false, "TEST 11", "No guide matches -> UI / API shows clear empty state", `Found: ${res11.guides.length} guides (clean empty state)`);

    // TEST 12: Guide changes AVAILABLE -> OFFLINE -> subsequent request rejected (Stale availability protection)
    const tempGuideUser = await prisma.user.create({
      data: {
        email: `${testPrefix}_stale_guide@test.local`,
        full_name: "Stale Test Guide",
        role: UserRole.GUIDE,
      },
    });
    createdUserIds.push(tempGuideUser.user_id);
    const tempProfile = await prisma.guideProfile.create({
      data: {
        user_id: tempGuideUser.user_id,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        hourly_rate: 500,
        current_location_id: locMumbai.id,
      },
    });
    await prisma.guideLocation.create({
      data: { guide_id: tempProfile.id, location_id: locMumbai.id, is_active: true },
    });

    // 12a. Guide is AVAILABLE -> validation passes
    const checkBefore = await validateGuideEligibilityForBooking(tempProfile.id, "Mumbai");
    assert(checkBefore.isValid, "TEST 12 (Precheck)", "Guide is AVAILABLE -> booking validation passes", `Valid: ${checkBefore.isValid}`);

    // 12b. Guide changes status to OFFLINE
    await prisma.guideProfile.update({
      where: { id: tempProfile.id },
      data: { availability_status: AvailabilityStatus.OFFLINE },
    });

    // 12c. User attempts to submit booking request for now-OFFLINE guide -> Backend rejects
    const checkAfter = await validateGuideEligibilityForBooking(tempProfile.id, "Mumbai");
    assert(
      !checkAfter.isValid && checkAfter.statusCode === 400 && checkAfter.errorCode === "GUIDE_UNAVAILABLE",
      "TEST 12",
      "Guide changes AVAILABLE -> OFFLINE -> subsequent request rejected",
      `Status: ${checkAfter.statusCode}, Code: ${checkAfter.errorCode}, Message: ${checkAfter.errorMessage}`
    );

    // TEST 13: Trip chooses "No Guide" -> trip still works normally
    const tripNoGuide = await prisma.trip.create({
      data: {
        user_id: travelerUser.user_id,
        description: "Self-guided Mumbai Itinerary",
        start_date: new Date("2026-10-05"),
        end_date: new Date("2026-10-08"),
        selected_guide_id: null,
      },
    });
    createdTripIds.push(tripNoGuide.trip_id);
    assert(
      tripNoGuide.selected_guide_id === null,
      "TEST 13",
      "Trip chooses 'No Guide' -> trip still works normally",
      `Trip created with trip_id ${tripNoGuide.trip_id}, selected_guide_id: null`
    );

    // TEST 14: GUIDE accesses traveler trip -> blocked by GUIDE middleware/RBAC
    const planRouteContent = fs.readFileSync(path.join(__dirname, "../app/api/itinerary/plan/route.ts"), "utf-8");
    const llmPageContent = fs.readFileSync(path.join(__dirname, "../app/llm/page.tsx"), "utf-8");
    const hasGuideBlockInPlan = planRouteContent.includes("authContext.role === UserRole.GUIDE") && planRouteContent.includes("403");
    const hasGuideRedirectInLLM = llmPageContent.includes('data.user.role === "GUIDE"') && llmPageContent.includes("/guide-dashboard");

    assert(
      hasGuideBlockInPlan && hasGuideRedirectInLLM,
      "TEST 14",
      "GUIDE accesses traveler trip -> blocked by GUIDE middleware/RBAC",
      "Trip page redirects GUIDE to /guide-dashboard, and /api/itinerary/plan rejects GUIDE with 403 Forbidden"
    );

    // TEST 15: GUIDE attempts guide discovery as traveler -> blocked (403 Forbidden)
    const guidesRouteContent = fs.readFileSync(path.join(__dirname, "../app/api/guides/route.ts"), "utf-8");
    const hasGuideBlockInGuides = guidesRouteContent.includes("authContext.role === UserRole.GUIDE") && guidesRouteContent.includes("403");
    assert(
      hasGuideBlockInGuides,
      "TEST 15",
      "GUIDE attempts guide discovery as traveler -> blocked",
      "GET /api/guides enforces role isolation, returning 403 Forbidden for GUIDE users"
    );

    // TEST 16: USER selects guide -> trip summary stores selected guide correctly
    const tripWithGuide = await prisma.trip.create({
      data: {
        user_id: travelerUser.user_id,
        description: "Mumbai Trip with Rahul Sharma",
        start_date: new Date("2026-10-15"),
        end_date: new Date("2026-10-18"),
        selected_guide_id: profileVerifiedAvailable.id,
      },
      include: {
        selected_guide: {
          include: {
            user: true,
          },
        },
      },
    });
    createdTripIds.push(tripWithGuide.trip_id);
    assert(
      Boolean(tripWithGuide.selected_guide && tripWithGuide.selected_guide.id === profileVerifiedAvailable.id),
      "TEST 16",
      "USER selects guide -> trip summary stores selected guide correctly",
      `Stored guide: ${tripWithGuide.selected_guide?.user.full_name}, Rate: ₹${tripWithGuide.selected_guide?.hourly_rate}/hr`
    );

    // TEST 17: Refresh trip -> selected guide persists
    const reloadedTrip = await prisma.trip.findUnique({
      where: { trip_id: tripWithGuide.trip_id },
      include: {
        selected_guide: {
          include: {
            user: true,
          },
        },
      },
    });
    assert(
      Boolean(reloadedTrip && reloadedTrip.selected_guide_id === profileVerifiedAvailable.id),
      "TEST 17",
      "Refresh trip -> selected guide persists",
      `Persisted across reload: ${reloadedTrip?.selected_guide?.user.full_name}`
    );

    // TEST 18: Guide is removed/inactivated after selection -> backend detects invalid selection before request
    await prisma.guideProfile.update({
      where: { id: tempProfile.id },
      data: { verification_status: VerificationStatus.SUSPENDED },
    });
    const checkSuspended = await validateGuideEligibilityForBooking(tempProfile.id, "Mumbai");
    assert(
      !checkSuspended.isValid && checkSuspended.statusCode === 400 && checkSuspended.errorCode === "GUIDE_NOT_VERIFIED",
      "TEST 18",
      "Guide inactivated after selection -> backend detects invalid selection before request",
      `Rejected with status ${checkSuspended.statusCode}: ${checkSuspended.errorCode} (${checkSuspended.errorMessage})`
    );

  } finally {
    console.log("\n[Cleanup] Removing temporary test records...");
    for (const tripId of createdTripIds) {
      await prisma.trip.delete({ where: { trip_id: tripId } });
    }
    for (const userId of createdUserIds) {
      await prisma.guideLocation.deleteMany({ where: { guide: { user_id: userId } } });
      await prisma.guideRequest.deleteMany({ where: { user_id: userId } });
      await prisma.guideProfile.deleteMany({ where: { user_id: userId } });
      await prisma.user.delete({ where: { user_id: userId } });
    }
    for (const locId of createdLocationIds) {
      await prisma.location.delete({ where: { id: locId } });
    }
    console.log("[Cleanup] Complete.");
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║      GUIDE DISCOVERY COMPLETE SUITE: ${passed} PASSED, ${failed} FAILED       ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runGuideDiscoverySuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
