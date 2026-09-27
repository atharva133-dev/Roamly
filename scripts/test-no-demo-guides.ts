/**
 * Test Suite: No Demo Guides
 *
 * Verifies that the guideAgent NEVER returns fabricated/demo guides.
 * All guides must come from real PostgreSQL data.
 *
 * Run: npx tsx scripts/test-no-demo-guides.ts
 */

async function runNoDemoGuidesSuite() {
  // Dynamic imports (ESM modules from server/src)
  const guideAgent = await import("../server/src/agents/guideAgent.js");
  const locationAgent = await import("../server/src/agents/locationAgent.js");

  // ---------------------------------------------------------------------------
  // Test harness
  // ---------------------------------------------------------------------------
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const results: { name: string; status: string; detail?: string }[] = [];

  async function test(name: string, fn: () => Promise<string | void>) {
    process.stdout.write(`  ⏳ ${name} ... `);
    try {
      const r = await fn();
      if (r === "SKIP") {
        skipped++;
        results.push({ name, status: "SKIP" });
        console.log("⏭️  SKIP");
      } else {
        passed++;
        results.push({ name, status: "PASS" });
        console.log("✅ PASS");
      }
    } catch (err: any) {
      failed++;
      results.push({ name, status: "FAIL", detail: err.message });
      console.log(`❌ FAIL — ${err.message}`);
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  function baseTripRequest(overrides: Record<string, any> = {}) {
    return {
      destinations: ["Mumbai"],
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      totalBudget: 50000,
      travelerCount: 2,
      accommodation: "Hotel",
      transportation: "Cab",
      guidePreference: "NEED_GUIDE",
      ...overrides,
    };
  }

  // ---------------------------------------------------------------------------
  console.log("\n🧪 NO DEMO GUIDES TEST SUITE\n");
  console.log("=".repeat(60));
  // ---------------------------------------------------------------------------

  // 1. Eligible real guide returned (if DB has one)
  await test("1. Real DB guide returned when available", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Mumbai"] }),
    });
    const context = {
      tripRequest: baseTripRequest({ destinations: ["Mumbai"] }),
      ...locResult.data,
    };
    const result = await guideAgent.execute(context);
    assert(result.success === true, "expected success");
    assert(result.fallbackUsed === false, "fallbackUsed must be false");
    assert(result.source === "ROAMLY_DATABASE", "source must be ROAMLY_DATABASE");

    const matchedGuides = result.data.matchedGuides as Record<string, any[]>;
    const locationIds = Object.keys(matchedGuides);
    for (const locId of locationIds) {
      const guides = matchedGuides[locId];
      for (const g of guides) {
        assert(g.guideSource === "ROAMLY_DATABASE", `guide ${g.id} must have guideSource=ROAMLY_DATABASE`);
        assert(g.isDemo === false, `guide ${g.id} must have isDemo=false`);
        assert(g.isBookable === true, `guide ${g.id} must have isBookable=true`);
      }
    }
  });

  // 2. No-guide case returns []
  await test("2. No-guide case returns empty array with warning", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Mumbai"] }),
    });
    const context = {
      tripRequest: baseTripRequest({ destinations: ["Mumbai"] }),
      ...locResult.data,
    };
    const result = await guideAgent.execute(context);
    assert(result.success === true, "expected success");

    const matchedGuides = result.data.matchedGuides as Record<string, any[]>;
    const locationIds = Object.keys(matchedGuides);
    for (const locId of locationIds) {
      const guides = matchedGuides[locId];
      for (const g of guides) {
        assert(g.isDemo === false, `guide ${g.id} must NOT be a demo guide`);
        assert(g.guideSource === "ROAMLY_DATABASE", `source must be ROAMLY_DATABASE, got ${g.guideSource}`);
      }
    }
    if (locationIds.some((id) => matchedGuides[id].length === 0)) {
      const hasWarning = (result.warnings || []).some(
        (w: any) => w.code === "NO_ROAMLY_GUIDE_AVAILABLE"
      );
      assert(hasWarning, "empty guides must produce NO_ROAMLY_GUIDE_AVAILABLE warning");
    }
  });

  // 3. Demo fallback not executed
  await test("3. Demo fallback is never executed", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Delhi"] }),
    });
    const context = {
      tripRequest: baseTripRequest({ destinations: ["Delhi"] }),
      ...locResult.data,
    };
    const result = await guideAgent.execute(context);
    assert(result.success === true, "expected success");
    assert(result.source !== "ROAMLY_DEMO_FALLBACK", "source must NEVER be ROAMLY_DEMO_FALLBACK");
    assert(result.fallbackUsed === false, "fallbackUsed must be false");
  });

  // 4. International destination — no fabricated guides
  await test("4. International destination (Qatar) returns [] — no fabricated guides", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Doha, Qatar"], totalBudget: 200000 }),
    });
    const context = {
      tripRequest: baseTripRequest({ destinations: ["Doha, Qatar"], totalBudget: 200000 }),
      ...locResult.data,
    };
    const result = await guideAgent.execute(context);
    assert(result.success === true, "expected success");
    assert(result.fallbackUsed === false, "fallbackUsed must be false");

    const matchedGuides = result.data.matchedGuides as Record<string, any[]>;
    const locationIds = Object.keys(matchedGuides);
    for (const locId of locationIds) {
      const guides = matchedGuides[locId];
      for (const g of guides) {
        assert(g.isDemo === false, `guide ${g.id} must NOT be demo for Qatar`);
        assert(g.guideSource === "ROAMLY_DATABASE", `source must be ROAMLY_DATABASE for Qatar guide`);
        assert(!g.name?.includes("Expert)"), `guide name "${g.name}" looks fabricated`);
        assert(!g.name?.includes("Cultural Guide)"), `guide name "${g.name}" looks fabricated`);
      }
    }
  });

  // 5. Invalid selectedGuideId rejected
  await test("5. Invalid selectedGuideId is rejected with error", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Mumbai"] }),
    });
    const context = {
      tripRequest: baseTripRequest({
        destinations: ["Mumbai"],
        guidePreference: "CHOOSE_GUIDE",
        selectedGuideId: "INVALID_GUIDE_ID_12345",
      }),
      ...locResult.data,
    };
    const result = await guideAgent.execute(context);
    assert(result.success === false, "expected failure for invalid selectedGuideId");
    const errorCodes = (result.errors || []).map((e: any) => e.code);
    assert(
      errorCodes.includes("GUIDE_NOT_FOUND") || errorCodes.includes("GUIDE_VALIDATION_ERROR"),
      `expected GUIDE_NOT_FOUND or GUIDE_VALIDATION_ERROR, got: ${errorCodes.join(", ")}`
    );
  });

  // 6. Nonexistent selected guide rejected
  await test("6. Nonexistent selected guide ID rejected", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Mumbai"] }),
    });
    const context = {
      tripRequest: baseTripRequest({
        destinations: ["Mumbai"],
        guidePreference: "CHOOSE_GUIDE",
        selectedGuideId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      }),
      ...locResult.data,
    };
    const result = await guideAgent.execute(context);
    assert(result.success === false, "expected failure for nonexistent guide");
    const errorCodes = (result.errors || []).map((e: any) => e.code);
    assert(errorCodes.includes("GUIDE_NOT_FOUND"), `expected GUIDE_NOT_FOUND, got: ${errorCodes.join(", ")}`);
  });

  // 7. Demo guide ID from demoGuides.js rejected
  await test("7. Demo guide ID 'guide_rahul_sharma' is rejected", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Mumbai"] }),
    });
    const context = {
      tripRequest: baseTripRequest({
        destinations: ["Mumbai"],
        guidePreference: "CHOOSE_GUIDE",
        selectedGuideId: "guide_rahul_sharma",
      }),
      ...locResult.data,
    };
    const result = await guideAgent.execute(context);
    assert(result.success === false, "expected failure for demo guide ID");
    const errorCodes = (result.errors || []).map((e: any) => e.code);
    assert(
      errorCodes.includes("GUIDE_NOT_FOUND"),
      `demo guide ID must be rejected as GUIDE_NOT_FOUND, got: ${errorCodes.join(", ")}`
    );
  });

  // 8. NO_GUIDE preference returns empty
  await test("8. NO_GUIDE preference returns empty guides", async () => {
    const result = await guideAgent.execute({
      tripRequest: baseTripRequest({ guidePreference: "NO_GUIDE" }),
      resolvedLocations: [],
    });
    assert(result.success === true, "expected success");
    assert(Object.keys(result.data.matchedGuides).length === 0, "NO_GUIDE must produce empty matchedGuides");
  });

  // 9. CHOOSE_GUIDE with demo guide ID does NOT create a fallback
  await test("9. CHOOSE_GUIDE with demo guide ID does NOT create a fallback", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Jaipur"] }),
    });
    const context = {
      tripRequest: baseTripRequest({
        destinations: ["Jaipur"],
        guidePreference: "CHOOSE_GUIDE",
        selectedGuideId: "guide_ratan_singh",
      }),
      ...locResult.data,
    };
    const result = await guideAgent.execute(context);
    assert(result.success === false, "expected failure — demo guide IDs must not resolve");

    const allGuides: any[] = Object.values(result.data?.matchedGuides || {}).flat();
    for (const g of allGuides) {
      assert(g.isDemo === false, `guide ${g.id} must not be demo`);
      assert(g.guideSource === "ROAMLY_DATABASE", `guide source must be ROAMLY_DATABASE`);
    }
  });

  // 10. No fabricated guide reaches itinerary context
  await test("10. No fabricated guide reaches itinerary context", async () => {
    const locResult = await locationAgent.execute({
      tripRequest: baseTripRequest({ destinations: ["Varanasi"] }),
    });
    const context = {
      tripRequest: baseTripRequest({
        destinations: ["Varanasi"],
        guidePreference: "NEED_GUIDE",
      }),
      ...locResult.data,
    };
    const guideResult = await guideAgent.execute(context);
    assert(guideResult.success === true, "expected guide agent success");

    for (const [_locId, guides] of Object.entries(guideResult.data.matchedGuides) as any) {
      for (const g of guides) {
        assert(g.isDemo === false, `guide ${g.id} in itinerary context must have isDemo=false`);
        assert(g.guideSource === "ROAMLY_DATABASE", `guide ${g.id} must have guideSource=ROAMLY_DATABASE`);
      }
    }

    assert(guideResult.source !== "ROAMLY_DEMO_FALLBACK", "guide agent source must never be ROAMLY_DEMO_FALLBACK");
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Results: ${passed} PASS | ${failed} FAIL | ${skipped} SKIP\n`);

  if (failed > 0) {
    console.log("❌ FAILED TESTS:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`   • ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  } else {
    console.log("✅ All no-demo-guide tests passed!\n");
  }
}

runNoDemoGuidesSuite().catch((err) => {
  console.error("Suite crashed:", err);
  process.exit(1);
});
