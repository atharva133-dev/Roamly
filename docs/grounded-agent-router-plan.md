# Roamly Grounded Agent Router — Implementation Plan

> **Philosophy**: Gemini is the reasoning, synthesis, and narrative explanation engine — **never the source of truth**. All geographical entities, place IDs, opening hours, coordinates, weather forecasts, route travel times, guide profiles, and budget math originate from Google Maps Platform, Open-Meteo, the Roamly Prisma database, and deterministic calculation.

**Status:** Reviewed against the codebase on 2026-09-27. Open questions resolved — see §0.

---

## 0. Decisions (resolved during review)

| # | Question | Decision |
|---|---|---|
| 1 | Keep the existing "Experiential Gateway" (`gpt-6-astra` via `@/lib/experiential`, gated on `EXPLABS_API_KEY`) as a pre-Gemini tier? | **Drop it.** `itineraryAgent.js` is Gemini-only + deterministic fallback. Do not import `@/lib/experiential`. |
| 2 | Should `guideAgent.js` preserve the demo-guide fallback in `app/api/guides/route.ts` when the DB is unreachable? | **Keep it.** `guideAgent.js` returns the same hardcoded demo guides (Rahul Sharma, Priya Desai, etc.) if the DB is unreachable, tagged with `guideSource: "ROAMLY_DEMO_FALLBACK"` (distinct from `"ROAMLY_DATABASE"`) so validation/UI can tell real vs. demo data apart. |
| 3 | Persist generated itineraries to the DB, or keep them ephemeral? | **Persist.** `agentRouter.js` creates `Trip` + `Stop` + `Budget` rows once `validationAgent` passes. Requires a `Category` enum migration — see §3a. |
| 4 | Plan referenced model `gemini-3.8-flash`, which doesn't exist in the codebase. | **Fixed.** `itineraryAgent.js` reuses the exact fallback chain from `lib/generate-plan.ts`: `GEMINI_MODEL` env override (if set) → `gemini-3.5-flash` → `gemini-3.7-flash` → `gemini-2.5-pro`. |
| 5 | `.env.example` doesn't mention enabling the Routes API. | **Fixed.** Comment block updated to list Routes API alongside Geolocation/Geocoding/Places — see §3b. |

---

## 1. Codebase Audit & Inspection Findings

| System Component | Current State in Roamly | Reusable As-Is / Changes Needed |
|---|---|---|
| **Google Maps Gateway** | `server/src/services/googleMapsGateway.js` with Places (New), Geocoding, and Geolocation. In-memory cache + DB fallback. | **Reuse & Extend**: Add Routes API integration (`computeRoutes` / distance matrix) and place candidate ranking. |
| **Location Model** | Prisma `Location` (`id`, `google_place_id`, `latitude`, `longitude`, `formatted_address`, `city`, `type`). | **Reuse**: Location deduplication (`findOrCreateLocation`) already supports multi-stop repeat visits (*Delhi → Agra → Delhi*). |
| **Guide System** | Prisma `GuideProfile`, `GuideLocation`, `GuideRequest` + `app/api/guides/route.ts`. Route currently falls back to **hardcoded demo guides** if the DB is unreachable. | **Reuse**: Guide Agent queries the database for `VERIFIED` + `AVAILABLE` guides; on DB failure, reuse the same demo fallback (decision #2), tagged distinctly. Returns explicit `NO_ROAMLY_GUIDE_AVAILABLE` only when neither DB nor fallback has a match. |
| **Weather** | Only string mentions ("Check local weather" static tip in `lib/queues.ts`; a prompt-instruction line in `app/api/chat/route.ts`). No real service file. | **Implement**: `server/src/integrations/weather/weatherApi.js` using Open-Meteo (lat/lng forecast API, no keys required, hyper-local temperature, precipitation probability, WMO weather codes, 16-day limit check). |
| **LLM Integration** | Two near-duplicate implementations: `app/api/generatePlanWithSummary/route.ts` and `lib/generate-plan.ts` (same prompt template, same currency conversion, same Gemini fallback chain). Both also try an Experiential Gateway (`gpt-6-astra`) first if `EXPLABS_API_KEY` is set. | **Reuse & Simplify**: `itineraryAgent.js` becomes the single source of itinerary-generation logic (Gemini-only per decision #1, correct model chain per decision #4). `route.ts` and `lib/generate-plan.ts` become thin wrappers or get deprecated once `/api/itinerary/plan` ships — flag for follow-up cleanup, not required for this phase. |
| **Budget Logic** | `app/llm/page.tsx` uses user-entered numeric INR total budget and derived category pills. Prisma `Category` enum is only `TRANSPORT \| FOOD \| HOTEL`. | **Reuse & Extend**: Budget Agent preserves `totalBudget` as immutable truth; computes daily per-person caps and 5-bucket category allocations. Requires enum migration (§3a) since results are now persisted (decision #3). |
| **Middleware & Auth** | Clerk middleware (`middleware.ts`) whitelists public planner routes (`/llm(.*)`, `/api/guides(.*)`, `/api/places(.*)`, etc.) but **not** `/api/itinerary(.*)` yet. | **New work** (not just verification): add `"/api/itinerary(.*)"` to `isPublicRoute`, consistent with the existing public-API pattern. |

---

## 2. Target Architecture: `server/src/agents/`

```
                                 [ POST /api/itinerary/plan ]
                                               │
                                  ┌────────────▼───────────┐
                                  │   AgentRouter (Graph)  │
                                  └────────────┬───────────┘
                                               │
               ┌───────────────────────────────┴──────────────────────────────┐
               │ Shared Execution Context (State Object with Source Tracking)  │
               └───────────────────────────────┬──────────────────────────────┘
                                               │
   [Step 1]                           ┌────────▼────────┐
                                      │  Location Agent │
                                      └────────┬────────┘
                                               │ (Resolved canonical coordinates & Place IDs)
                     ┌─────────────────────────┴─────────────────────────┐
                     ▼                                                   ▼
   [Step 2]   ┌──────────────┐                                    ┌──────────────┐
              │ Places Agent │                                    │Weather Agent │
              └──────┬───────┘                                    └──────┬───────┘
                     │ (Verified attractions)                            │ (Forecasts or UNAVAILABLE)
                     └─────────────────────────┬─────────────────────────┘
                                               │
   [Step 3]                           ┌────────▼────────┐
                                      │   Route Agent   │  (Google Routes / Transit Matrix)
                                      └────────┬────────┘
                                               │
   [Step 4]                           ┌────────▼────────┐
                                      │   Guide Agent   │  (Roamly DB search, demo fallback on DB failure)
                                      └────────┬────────┘
                                               │
   [Step 5]                           ┌────────▼────────┐
                                      │  Budget Agent   │  (Deterministic envelope constraints)
                                      └────────┬────────┘
                                               │
   [Step 6]                           ┌────────▼────────┐
                                      │ Itinerary Agent │  (Gemini-only reasoning over verified candidates)
                                      └────────┬────────┘
                                               │
   [Step 7]                           ┌────────▼────────┐
                                      │Validation Agent │  (17-point strict verification)
                                      └────────┬────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       │ PASS                                          │ FAIL (Re-optimization)
                       ▼                                               ▼
       [ Persist Trip/Stop/Budget, return       ]           [ Targeted Sub-Agent Re-execution ]
       [ Verified Structured Plan                ]
```

---

## 3. Detailed Agent Specifications

### 3a. Prisma Schema Change (required by decision #3)

```prisma
enum Category {
  TRANSPORT
  FOOD
  HOTEL        // reused as "Accommodation" bucket
  ACTIVITIES   // NEW — covers activities + guide costs
  CONTINGENCY  // NEW — 5% buffer bucket
}
```
Migration: `npx prisma migrate dev --name add_activities_contingency_categories`.

`agentRouter.js`, after `validationAgent` passes, creates:
- One `Trip` row (`user_id`, `start_date`, `end_date`, `description`)
- One `Stop` row per resolved location (`sequence`, `arrival_date`, `departure_date`, `location_id`) via the existing `recordTripStop` helper in `googleMapsGateway.js`
- One `Budget` row per category bucket (`amount`, `category`) summing to `totalBudget`

### 3b. `.env.example` addition (decision #5)
```diff
 # --- Google Maps Platform ---
 # Required APIs to enable in Google Cloud Console:
 # 1. Geolocation API (approximate network/device location fallback)
 # 2. Geocoding API (address <-> coordinate normalization)
 # 3. Places API (New) (autocomplete, text search, place details)
+# 4. Routes API (route matrix / distance-duration between stops)
 GOOGLE_MAPS_SERVER_API_KEY=
```

### Shared Context Interface
```javascript
{
  requestId: "req_...",
  user: { id, role },
  tripRequest: {
    destinations: ["Delhi", "Agra"],
    startDate: "2026-10-01",
    endDate: "2026-10-04",
    travelerCount: 2,
    totalBudget: 50000,
    accommodationPreference: "Hotel",
    transportationPreference: "TRAIN",
    interests: ["Heritage", "Food"],
    travelStyle: "Cultural",
    pace: "MODERATE",
    guidePreference: "NEED_GUIDE" // "NO_GUIDE" | "NEED_GUIDE" | "CHOOSE_GUIDE"
  },
  resolvedLocations: [], // Canonical Location entities
  candidatePlaces: {},  // Keyed by destinationId
  weatherForecasts: {}, // Keyed by destinationId + date
  transitRoutes: [],    // Distance, duration, mode, fareSource
  matchedGuides: {},    // Registered Roamly guides per location (or demo fallback)
  budgetAllocations: {},// Strict spending caps (5 buckets, see §3a)
  generatedPlan: null,  // Structured JSON
  validationResult: { valid: false, errors: [] },
  persistedTripId: null, // Set after DB write (decision #3)
  sources: {
    locationSource: "GOOGLE_PLACES",
    weatherSource: "OPEN_METEO",
    routeSource: "GOOGLE_ROUTES",
    costSource: "ROAMLY_ESTIMATE",
    guideSource: "ROAMLY_DATABASE" // or "ROAMLY_DEMO_FALLBACK"
  },
  routerTrace: []
}
```

### Agent Roster (`server/src/agents/`)

1. **`locationAgent.js`**
   - Resolves destination strings into canonical Roamly `Location` records using `googleMapsGateway.js` (Places Autocomplete / Geocoding).
   - Enforces deduplication for repeated stops (*Delhi → Agra → Delhi* reuses the exact same Delhi ID).
   - Rejects unresolvable places with explicit errors. Never fabricates coordinates.

2. **`placesAgent.js`**
   - Queries Google Places API (New) via `textSearchPlaces` using strict field masks (`id,displayName,location,formattedAddress,rating,userRatingCount,regularOpeningHours,photos,primaryType`).
   - Filters candidate attractions by user interests (e.g., museums, monuments, parks).
   - Every candidate is tagged with its official Google `placeId`, verified operating hours, and rating. Never creates new place names.

3. **`weatherAgent.js`**
   - Uses resolved coordinates from `Location Agent`.
   - Calls Open-Meteo for the exact trip dates.
   - If trip dates exceed the 16-day forecast horizon: returns `{ available: false, reason: "FORECAST_UNAVAILABLE" }` without guessing.

4. **`routeAgent.js`**
   - Calculates distance and travel duration between consecutive itinerary stops using Google Routes API (`computeRoutes`).
   - Supports user's preferred mode (`TRAIN`, `PUBLIC_TRANSIT`, `CAB`, `WALKING`).
   - Attaches `fareSource`: `GOOGLE`, `ROAMLY_ESTIMATE`, or `UNAVAILABLE`. Never allows LLM to hallucinate transit durations.

5. **`guideAgent.js`**
   - Searches Roamly's database for guides with `verification_status: VERIFIED` and `availability_status: AVAILABLE`, matched by `location_id` or `city`.
   - **On DB failure**, reuses the same demo-guide fallback as `app/api/guides/route.ts`, tagged `guideSource: "ROAMLY_DEMO_FALLBACK"` (decision #2).
   - If neither DB nor fallback has a match: `{ available: false, reason: "NO_ROAMLY_GUIDE_AVAILABLE" }`.

6. **`budgetAgent.js`**
   - Mathematical constraint engine:
     $$\text{budgetPerPersonPerDay} = \frac{\text{totalBudget}}{\text{travelerCount} \times \text{durationDays}}$$
   - Deterministic budget envelopes: Accommodation 35% (`HOTEL`), Transit 25% (`TRANSPORT`), Food 20% (`FOOD`), Activities/Guides 15% (`ACTIVITIES`), Contingency 5% (`CONTINGENCY`).
   - Preserves user's `totalBudget` as immutable truth.

7. **`itineraryAgent.js`**
   - **Gemini-only** (decision #1 — no Experiential Gateway tier).
   - Model fallback chain matches `lib/generate-plan.ts` exactly (decision #4): `process.env.GEMINI_MODEL` (if set) → `gemini-3.5-flash` → `gemini-3.7-flash` → `gemini-2.5-pro`.
   - Provided **only** pre-verified candidate places, real operating hours, weather, and budget caps. Instructed to sequence stops into a narrative without adding external facts.
   - Includes full deterministic rule-based scheduler fallback if Gemini is offline or rate-limited.

8. **`validationAgent.js` (The Mandatory Guardrail)**
   - Validates all 17 requirements:
     1. Every `placeId` exists in verified places list.
     2. Every `guideId` exists in verified Roamly guides list (DB or demo fallback).
     3. Total cost equals sum of day/item costs.
     4. `totalBudget` equals user input.
     5. `estimatedTotalCost` ≤ `totalBudget` (or flagged `OVER_BUDGET`).
     6. `remainingBudget` mathematically exact.
     7. Opening/closing hours respected when known.
     8. Route data exists for all transit links.
     9. Travel durations not invented.
     10. Weather matches real data or marked `UNAVAILABLE`.
     11. Transportation preference respected.
     12. Guide availability respected.
     13. No duplicate visits to same attraction on the same day.
     14. Dates within trip window.
     15. `startTime < endTime`.
     16. No overlapping activity slots.
     17. Destination count matches user request.

9. **`agentRouter.js` (Registry & Coordinator)**
   - Maintains agent registry with uniform `execute(context)` signature.
   - Manages DAG dependency graph:
     - Parallel Step: `placesAgent` + `weatherAgent` run concurrently after `locationAgent`.
   - **Targeted Re-Optimization Loop** (up to 2 iterations):
     - `BUDGET_EXCEEDED` → re-run `budgetAgent` → `placesAgent` (cheaper candidates) → `itineraryAgent` → `validationAgent`.
     - `OPENING_HOURS_CONFLICT` → re-run `itineraryAgent` with adjusted slot order → `validationAgent`.
     - `GUIDE_UNAVAILABLE` → re-run `guideAgent` → `itineraryAgent` → `validationAgent`.
   - **On final PASS**: persists `Trip` + `Stop` + `Budget` rows (§3a), sets `persistedTripId` in context (decision #3).

---

## 4. API & Frontend Integration

### New Endpoint: `POST /api/itinerary/plan`
```typescript
// Request Body
{
  destinations: string[];
  startDate: string;
  endDate: string;
  travelerCount: number;
  totalBudget: number;
  accommodationPreference: string;
  transportationPreference: string;
  interests: string[];
  travelStyle: string;
  pace: "RELAXED" | "MODERATE" | "FAST";
  guidePreference: "NO_GUIDE" | "NEED_GUIDE" | "CHOOSE_GUIDE";
}

// Response Body
{
  success: boolean;
  tripId: number;          // NEW — persisted Trip.trip_id (decision #3)
  tripSummary: {
    totalBudget: number;
    estimatedTotalCost: number;
    remainingBudget: number;
    travelerCount: number;
    durationDays: number;
    budgetPerPersonPerDay: number;
  };
  budgetBreakdown: { ... };
  destinations: [ ... ];
  days: [ ... ];
  sources: { ... };
  routerTrace: {
    agentsExecuted: string[];
    fallbackUsed: boolean;
    validationStatus: "PASSED" | "FAILED";
    reOptimizations: number;
  };
}
```

### UI Enhancements in `app/llm/page.tsx`
1. **Traveler Count & Guide Preference Selectors:**
   - Add traveler counter (1, 2, 3, 4, 5+ travelers).
   - Add inline guide preference options: `[ No Guide ]`, `[ Need a Guide ]`, `[ Choose a Guide ]`.
2. **Execution Hook:**
   - Update submission to call `/api/itinerary/plan`.
3. **Collapsible Development Diagnostic Panel:**
   - Render a debug card at the bottom of the itinerary result:
     - Router execution status (`✓ Location`, `✓ Places`, `✓ Weather`, `✓ Routes`, `✓ Guides`, `✓ Budget`, `✓ Itinerary`, `✓ Validation`).
     - Grounded data sources table (showing origin of coordinates, place IDs, routes, guides — including whether guides came from `ROAMLY_DATABASE` or `ROAMLY_DEMO_FALLBACK`).
     - Validation badge (`PASSED` with 17 checks verified).

---

## 5. Proposed Step-by-Step Implementation Sequence

```
Phase 0: Schema Migration
  └── 0.1 Extend Category enum (ACTIVITIES, CONTINGENCY) — prisma/schema.prisma + migration

Phase 1: Integrations (Weather & Routes)
  ├── 1.1 Create server/src/integrations/weather/weatherApi.js (Open-Meteo real weather API)
  ├── 1.2 Create server/src/integrations/google/routes.js (Google Routes API + Roamly deterministic fallback)
  └── 1.3 Update .env.example with Routes API note (§3b)

Phase 2: Core Agents (server/src/agents/)
  ├── 2.1 locationAgent.js (Destination normalization & Location DB lookup)
  ├── 2.2 placesAgent.js (Google Places New attraction candidate discovery)
  ├── 2.3 weatherAgent.js (Date & coordinate forecast grounder)
  ├── 2.4 routeAgent.js (Transit calculation & fare source attribution)
  ├── 2.5 guideAgent.js (Roamly DB search + demo fallback per decision #2)
  ├── 2.6 budgetAgent.js (Daily per-person caps & strict 5-bucket envelope calculation)
  ├── 2.7 itineraryAgent.js (Gemini-only synthesis + deterministic fallback, correct model chain per decision #4)
  └── 2.8 validationAgent.js (17-point invariant checker)

Phase 3: Agent Router & Orchestrator
  ├── 3.1 agentRouter.js (Registry, DAG parallel scheduler, targeted re-optimizer, Trip/Stop/Budget persistence)
  └── 3.2 Automated agent unit/integration test script (scripts/test-agent-router.mjs)

Phase 4: API Endpoint & Middleware
  ├── 4.1 Create app/api/itinerary/plan/route.ts
  └── 4.2 Add "/api/itinerary(.*)" to middleware.ts public whitelist

Phase 5: Frontend Integration & Diagnostic Panel
  ├── 5.1 Add travelerCount & guidePreference inputs to app/llm/page.tsx
  ├── 5.2 Connect submission to /api/itinerary/plan
  └── 5.3 Implement collapsible Development Diagnostic Panel

Phase 6: End-to-End Verification
  ├── 6.1 Run test suite against all 14 test scenarios
  └── 6.2 Manual browser verification on http://localhost:3000/llm
```

---

## 6. Follow-up (not in scope for this phase)
- Deprecate/consolidate `app/api/generatePlanWithSummary/route.ts` and `lib/generate-plan.ts` now that `itineraryAgent.js` is the canonical itinerary-generation path.
- Decide fate of `@/lib/experiential` (gpt-6-astra) — currently unused after decision #1; remove if no other caller depends on it.
- Two redundant env example files exist (`.env.example` and `env.example`) — consolidate into one.
