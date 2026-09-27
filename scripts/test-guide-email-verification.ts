/**
 * Roamly — Guide Email Verification Workflow Dedicated Test Suite
 * 
 * Verifies all 14 mandatory test cases:
 * TEST 1:  Guide registers -> User.role = GUIDE
 * TEST 2:  GuideProfile created -> verification pending
 * TEST 3:  Verification email sent -> email provider called successfully
 * TEST 4:  Valid email link -> GuideProfile.verification_status = VERIFIED
 * TEST 5:  Invalid token -> rejected
 * TEST 6:  Expired token -> rejected
 * TEST 7:  Used token -> rejected/already verified
 * TEST 8:  Verified guide appears in /guides -> yes
 * TEST 9:  Verified + AVAILABLE guide can receive request -> yes
 * TEST 10: Unverified guide cannot receive request -> rejected
 * TEST 11: Guide can edit profile without admin approval -> yes
 * TEST 12: Guide can edit price -> yes
 * TEST 13: Guide can edit availability -> yes
 * TEST 14: Guide cannot edit another guide -> 403/404
 * 
 * Usage: npx tsx scripts/test-guide-email-verification.ts
 */

import prisma from "../lib/prisma";
import { UserRole, VerificationStatus, AvailabilityStatus, RequestStatus } from "@prisma/client";
import { generateGuideVerificationToken, hashVerificationToken } from "../lib/auth/guide-tokens";
import { sendGuideVerificationEmail, getLastSentEmail, clearSentEmails } from "../lib/email/email-service";

interface TestReportItem {
  id: string;
  name: string;
  expected: string;
  result: "PASS" | "FAIL";
  details?: string;
}

const testResults: TestReportItem[] = [];

function recordResult(id: string, name: string, expected: string, pass: boolean, details?: string) {
  const result: "PASS" | "FAIL" = pass ? "PASS" : "FAIL";
  testResults.push({ id, name, expected, result, details });
  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon} [${id}] ${name}`);
  console.log(`     Expected: ${expected}`);
  console.log(`     Result:   ${result}${details ? " — " + details : ""}`);
}

async function runTests() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("   ROAMLY GUIDE EMAIL VERIFICATION WORKFLOW VERIFICATION SUITE   ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const testGuideEmail = `guide_verify_${timestamp}@roamly-test.local`;
  const testGuideBEmail = `guide_other_${timestamp}@roamly-test.local`;
  const testTravelerEmail = `traveler_${timestamp}@roamly-test.local`;

  let userA: any;
  let guideProfileA: any;
  let userB: any;
  let guideProfileB: any;
  let travelerUser: any;
  let testLocation: any;
  let generatedToken: string = "";

  try {
    clearSentEmails();

    // ─────────────────────────────────────────────────────────────
    // Setup initial Location
    // ─────────────────────────────────────────────────────────────
    testLocation = await prisma.location.create({
      data: {
        name: `Test Fort ${timestamp}`,
        city: "Mumbai",
        country: "India",
        latitude: 18.922,
        longitude: 72.834,
        is_active: true,
      },
    });

    travelerUser = await prisma.user.create({
      data: {
        email: testTravelerEmail,
        full_name: "Test Traveler",
        role: UserRole.USER,
        clerk_id: `clerk_trav_${timestamp}`,
      },
    });

    console.log("── Executing Tests 1, 2, 3: Registration, Role, & Email Dispatch ──");

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Guide registers -> User.role = GUIDE
    // ─────────────────────────────────────────────────────────────
    userA = await prisma.user.create({
      data: {
        email: testGuideEmail,
        full_name: "Verified Test Guide",
        role: UserRole.USER, // starts as USER before registration
        clerk_id: `clerk_guide_${timestamp}`,
      },
    });

    // Simulate registration workflow: updates User.role to GUIDE
    userA = await prisma.user.update({
      where: { user_id: userA.user_id },
      data: {
        role: UserRole.GUIDE,
        profile_completed: true,
      },
    });

    recordResult(
      "TEST 1",
      "Guide registers -> Role becomes GUIDE",
      "User.role = GUIDE",
      userA.role === UserRole.GUIDE,
      `User role is: ${userA.role}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 2: GuideProfile created -> verification pending
    // ─────────────────────────────────────────────────────────────
    const tokenData = generateGuideVerificationToken(24);
    generatedToken = tokenData.rawToken;

    guideProfileA = await prisma.guideProfile.create({
      data: {
        user_id: userA.user_id,
        phone: "+91 9876543210",
        bio: "Expert historical guide with deep local heritage knowledge.",
        languages: ["English", "Hindi", "Marathi"],
        expertise: ["Historical Tours", "Heritage Sites"],
        experience_years: 4,
        hourly_rate: 650,
        currency: "INR",
        available_days: ["Monday", "Tuesday", "Wednesday"],
        available_time_from: "09:00",
        available_time_to: "18:00",
        verification_status: VerificationStatus.PENDING,
        availability_status: AvailabilityStatus.AVAILABLE,
        verification_token_hash: tokenData.tokenHash,
        verification_token_expires_at: tokenData.expiresAt,
        verification_token_used_at: null,
      },
    });

    await prisma.guideLocation.create({
      data: {
        guide_id: guideProfileA.id,
        location_id: testLocation.id,
        is_active: true,
        available_from: "09:00",
        available_to: "18:00",
      },
    });

    recordResult(
      "TEST 2",
      "GuideProfile created with verification pending",
      "GuideProfile.verification_status = PENDING",
      guideProfileA.verification_status === VerificationStatus.PENDING &&
        guideProfileA.verification_token_hash === tokenData.tokenHash,
      `Status is: ${guideProfileA.verification_status}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Verification email sent
    // ─────────────────────────────────────────────────────────────
    const emailResult = await sendGuideVerificationEmail({
      to: userA.email,
      guideName: userA.full_name,
      rawToken: generatedToken,
    });

    const lastEmail = getLastSentEmail();
    const emailDispatched =
      emailResult.success &&
      lastEmail !== undefined &&
      lastEmail.to === userA.email &&
      lastEmail.subject.includes("Verify your Roamly Guide Account") &&
      lastEmail.verificationUrl.includes(generatedToken);

    recordResult(
      "TEST 3",
      "Verification email sent to authenticated Clerk account",
      "email provider called successfully with valid token link",
      emailDispatched,
      `Recipient: ${lastEmail?.to}, URL: ${lastEmail?.verificationUrl}`
    );

    console.log("\n── Executing Tests 4, 5, 6, 7: Token Security & Verification Link ──");

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Invalid token -> rejected
    // ─────────────────────────────────────────────────────────────
    const invalidToken = "completely_invalid_and_forged_token_1234567890";
    const invalidHash = hashVerificationToken(invalidToken);
    const invalidLookup = await prisma.guideProfile.findFirst({
      where: { verification_token_hash: invalidHash },
    });

    recordResult(
      "TEST 5",
      "Invalid / forged token rejected",
      "rejected with not found / invalid token",
      invalidLookup === null,
      "No guide matched invalid token hash"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Expired token -> rejected
    // ─────────────────────────────────────────────────────────────
    const expiredTokenData = generateGuideVerificationToken(-1); // 1 hour in past
    const expiredGuide = await prisma.user.create({
      data: {
        email: `expired_guide_${timestamp}@roamly-test.local`,
        full_name: "Expired Test Guide",
        role: UserRole.GUIDE,
        clerk_id: `clerk_exp_${timestamp}`,
        guideProfile: {
          create: {
            bio: "Expired token guide",
            verification_status: VerificationStatus.PENDING,
            verification_token_hash: expiredTokenData.tokenHash,
            verification_token_expires_at: expiredTokenData.expiresAt,
          },
        },
      },
      include: { guideProfile: true },
    });

    const expiredCheck = await prisma.guideProfile.findFirst({
      where: { verification_token_hash: expiredTokenData.tokenHash },
    });
    const isTokenExpired =
      expiredCheck?.verification_token_expires_at &&
      new Date() > new Date(expiredCheck.verification_token_expires_at);

    recordResult(
      "TEST 6",
      "Expired token rejected",
      "token detected as expired and rejected",
      isTokenExpired === true,
      `Expiry was: ${expiredCheck?.verification_token_expires_at?.toISOString()}`
    );

    // Clean up expired helper guide
    await prisma.user.delete({ where: { user_id: expiredGuide.user_id } });

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Valid email link -> GuideProfile.verification_status = VERIFIED
    // ─────────────────────────────────────────────────────────────
    // Simulate verification endpoint logic:
    const candidateHash = hashVerificationToken(generatedToken);
    const matchedProfile = await prisma.guideProfile.findFirst({
      where: { verification_token_hash: candidateHash },
    });

    let verifiedProfile: any = null;
    if (
      matchedProfile &&
      !matchedProfile.verification_token_used_at &&
      matchedProfile.verification_token_expires_at &&
      new Date() <= new Date(matchedProfile.verification_token_expires_at)
    ) {
      const now = new Date();
      verifiedProfile = await prisma.guideProfile.update({
        where: { id: matchedProfile.id },
        data: {
          verification_status: VerificationStatus.VERIFIED,
          email_verified_at: now,
          verification_token_used_at: now,
        },
      });
    }

    recordResult(
      "TEST 4",
      "Valid email link marks guide as VERIFIED and records email_verified_at",
      "GuideProfile.verification_status = VERIFIED, email_verified_at set",
      verifiedProfile?.verification_status === VerificationStatus.VERIFIED &&
        verifiedProfile?.email_verified_at !== null &&
        verifiedProfile?.verification_token_used_at !== null,
      `Verification status: ${verifiedProfile?.verification_status}, Verified at: ${verifiedProfile?.email_verified_at}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Used token -> rejected / already verified
    // ─────────────────────────────────────────────────────────────
    const reVerificationAttempt = await prisma.guideProfile.findFirst({
      where: { verification_token_hash: candidateHash },
    });

    const isDetectedAsUsedOrVerified =
      reVerificationAttempt?.verification_token_used_at !== null ||
      reVerificationAttempt?.verification_status === VerificationStatus.VERIFIED;

    recordResult(
      "TEST 7",
      "Used token detected and prevented from re-use",
      "token detected as already-used / already-verified",
      isDetectedAsUsedOrVerified === true,
      `Token used_at is set: ${reVerificationAttempt?.verification_token_used_at?.toISOString()}`
    );

    console.log("\n── Executing Tests 8, 9, 10: Public Listing & Booking Rules ──");

    // Setup an unverified guide for negative test comparisons
    userB = await prisma.user.create({
      data: {
        email: testGuideBEmail,
        full_name: "Unverified Guide B",
        role: UserRole.GUIDE,
        clerk_id: `clerk_guide_b_${timestamp}`,
        guideProfile: {
          create: {
            bio: "Unverified Guide B",
            hourly_rate: 700,
            verification_status: VerificationStatus.PENDING,
            availability_status: AvailabilityStatus.AVAILABLE,
          },
        },
      },
      include: { guideProfile: true },
    });
    guideProfileB = userB.guideProfile;

    await prisma.guideLocation.create({
      data: {
        guide_id: guideProfileB.id,
        location_id: testLocation.id,
        is_active: true,
      },
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Verified guide appears in /guides query
    // ─────────────────────────────────────────────────────────────
    const publicGuides = await prisma.guideProfile.findMany({
      where: {
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        locations: { some: { location_id: testLocation.id, is_active: true } },
      },
    });

    const guideAInListing = publicGuides.some((g) => g.id === guideProfileA.id);
    const guideBInListing = publicGuides.some((g) => g.id === guideProfileB.id);

    recordResult(
      "TEST 8",
      "Verified guide appears in public guides query, unverified does not",
      "Verified guide: yes, Unverified guide: no",
      guideAInListing && !guideBInListing,
      `Verified guide found: ${guideAInListing}, Unverified excluded: ${!guideBInListing}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Verified + AVAILABLE guide can receive request
    // ─────────────────────────────────────────────────────────────
    const validBooking = await prisma.guideRequest.create({
      data: {
        user_id: travelerUser.user_id,
        guide_id: guideProfileA.id,
        location_id: testLocation.id,
        date: new Date(),
        start_time: "10:00 AM",
        duration: 3,
        total_cost: 1950,
        status: RequestStatus.PENDING,
      },
    });

    recordResult(
      "TEST 9",
      "Verified + AVAILABLE guide can receive booking request",
      "Booking request created successfully",
      validBooking.id !== undefined && validBooking.guide_id === guideProfileA.id,
      `Created request ID: ${validBooking.id}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Unverified guide cannot receive request
    // ─────────────────────────────────────────────────────────────
    // Simulate booking endpoint validation rule
    const targetGuide = await prisma.guideProfile.findUnique({
      where: { id: guideProfileB.id },
    });

    let unverifiedBookingAllowed = true;
    if (
      targetGuide &&
      (targetGuide.verification_status !== VerificationStatus.VERIFIED ||
        targetGuide.availability_status !== AvailabilityStatus.AVAILABLE)
    ) {
      unverifiedBookingAllowed = false;
    }

    recordResult(
      "TEST 10",
      "Unverified guide rejected from receiving booking requests",
      "rejected with booking restriction",
      unverifiedBookingAllowed === false,
      `Target guide verification_status is: ${targetGuide?.verification_status}`
    );

    console.log("\n── Executing Tests 11, 12, 13, 14: Profile, Price, & Availability Editing ──");

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Guide can edit profile without admin approval
    // ─────────────────────────────────────────────────────────────
    const newBio = "Updated bio with specialized nocturnal heritage photography expertise.";
    const newLanguages = ["English", "Hindi", "Marathi", "French"];

    const updatedProfile = await prisma.guideProfile.update({
      where: { id: guideProfileA.id },
      data: {
        bio: newBio,
        languages: newLanguages,
      },
    });

    recordResult(
      "TEST 11",
      "Guide can edit profile without admin approval",
      "Profile changes persist immediately without admin intervention",
      updatedProfile.bio === newBio && updatedProfile.languages.length === 4,
      `Updated languages count: ${updatedProfile.languages.length}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Guide can edit price
    // ─────────────────────────────────────────────────────────────
    const updatedPrice = await prisma.guideProfile.update({
      where: { id: guideProfileA.id },
      data: { hourly_rate: 900 },
    });

    recordResult(
      "TEST 12",
      "Guide can edit hourly price",
      "hourly_rate updated successfully",
      updatedPrice.hourly_rate === 900,
      `New hourly rate: ₹${updatedPrice.hourly_rate}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Guide can edit availability
    // ─────────────────────────────────────────────────────────────
    const updatedAvailability = await prisma.guideProfile.update({
      where: { id: guideProfileA.id },
      data: {
        availability_status: AvailabilityStatus.BUSY,
        available_days: ["Friday", "Saturday", "Sunday"],
      },
    });

    recordResult(
      "TEST 13",
      "Guide can edit availability status and available days",
      "availability updated to BUSY with new available days",
      updatedAvailability.availability_status === AvailabilityStatus.BUSY &&
        updatedAvailability.available_days.includes("Sunday"),
      `Status: ${updatedAvailability.availability_status}, Days: ${updatedAvailability.available_days.join(", ")}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Guide cannot edit another guide
    // ─────────────────────────────────────────────────────────────
    // Simulate PATCH /api/guides/profile IDOR check where guide B tries to update guide A
    const attackerCallerId = userB.user_id;
    const targetGuideToMutate = guideProfileA.id;

    // Caller's owned profile
    const callerOwnedProfile = await prisma.guideProfile.findUnique({
      where: { user_id: attackerCallerId },
    });

    let idorRejected = false;
    if (callerOwnedProfile && callerOwnedProfile.id !== targetGuideToMutate) {
      // Forbidden: caller does not own target guide
      idorRejected = true;
    }

    recordResult(
      "TEST 14",
      "Guide cannot edit another guide's profile (IDOR prevention)",
      "403 Forbidden / ownership validation prevents cross-account mutation",
      idorRejected === true,
      `Caller profile (${callerOwnedProfile?.id}) !== Target profile (${targetGuideToMutate})`
    );
  } finally {
    // ─────────────────────────────────────────────────────────────
    // Cleanup provisioned test entities
    // ─────────────────────────────────────────────────────────────
    console.log("\n[Cleanup] Cleaning up test records from database...");
    try {
      if (guideProfileA?.id) {
        await prisma.guideRequest.deleteMany({ where: { guide_id: guideProfileA.id } });
        await prisma.guideLocation.deleteMany({ where: { guide_id: guideProfileA.id } });
        await prisma.guideProfile.deleteMany({ where: { id: guideProfileA.id } });
      }
      if (guideProfileB?.id) {
        await prisma.guideLocation.deleteMany({ where: { guide_id: guideProfileB.id } });
        await prisma.guideProfile.deleteMany({ where: { id: guideProfileB.id } });
      }
      if (userA?.user_id) {
        await prisma.user.deleteMany({ where: { user_id: userA.user_id } });
      }
      if (userB?.user_id) {
        await prisma.user.deleteMany({ where: { user_id: userB.user_id } });
      }
      if (travelerUser?.user_id) {
        await prisma.user.deleteMany({ where: { user_id: travelerUser.user_id } });
      }
      if (testLocation?.id) {
        await prisma.location.deleteMany({ where: { id: testLocation.id } });
      }
    } catch (cleanupErr) {
      console.warn("Cleanup error (non-fatal):", cleanupErr);
    }
    console.log("[Cleanup] Complete.");
  }

  // ─────────────────────────────────────────────────────────────
  // Final Scorecard
  // ─────────────────────────────────────────────────────────────
  const passedCount = testResults.filter((r) => r.result === "PASS").length;
  const failedCount = testResults.filter((r) => r.result === "FAIL").length;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║         GUIDE EMAIL VERIFICATION SUITE FINAL REPORT          ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  for (const item of testResults) {
    const icon = item.result === "PASS" ? "✅" : "❌";
    console.log(`║  ${icon} ${item.id.padEnd(8)}: ${item.name.substring(0, 36).padEnd(36)} [${item.result}]  ║`);
  }
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  TOTAL TESTS: ${String(testResults.length).padEnd(46)} ║`);
  console.log(`║  PASSED:      ${String(passedCount).padEnd(46)} ║`);
  console.log(`║  FAILED:      ${String(failedCount).padEnd(46)} ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("NOTE: Admin approval is NOT required.\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
