# Roamly Grounded Agent Router — Fixed Implementation Plan

> **Goal:** Build a grounded, multi-agent travel-planning system in which Gemini is used for reasoning and synthesis, while factual travel data comes only from verified external/internal sources and deterministic calculations.

> **Core philosophy:** **Gemini is never the source of truth.** Geographical entities, Google Place IDs, coordinates, opening hours, route durations, weather, guide availability, and budget arithmetic must originate from Google Maps Platform, Open-Meteo, the Roamly Prisma database, or deterministic calculations.

**Status:** Fixed and implementation-ready. Updated 2026-09-27.

---

## 0. Non-Negotiable Architecture Rules

These rules must be followed by the implementation agent. Do not weaken, bypass, or "simplify" them.

### 0.1 Gemini boundary

Gemini may:

- reason over verified inputs;
- choose ordering and scheduling;
- generate natural-language explanations;
- synthesize a structured itinerary;
- suggest alternatives only from supplied candidate data.

Gemini must **not**:

- invent destinations or attractions;
- invent Google Place IDs;
- invent coordinates;
- invent opening hours;
- invent weather;
- invent route durations;
- invent transit fares;
- invent guide identities or availability;
- change the user's total budget;
- create unsupported factual claims just to make the itinerary complete.

When required data is unavailable, Gemini must preserve an explicit `UNAVAILABLE` state instead of guessing.

### 0.2 No direct Gemini-to-user factual pipeline

Do **not** implement:

```text
User → Gemini → itinerary → database
```

Implement:

```text
User
  ↓
Authenticated API
  ↓
AgentRouter
  ↓
Grounding Agents
  ↓
Deterministic Constraints
  ↓
Gemini Synthesis
  ↓
Validation Agent
  ↓
PASS → Persist
FAIL → Re-optimize / fail safely
```

### 0.3 Authentication

`POST /api/itinerary/plan` is a **protected endpoint** because the workflow persists a `Trip` linked to the authenticated user.

Do **not** add `/api/itinerary(.*)` to the Clerk public-route whitelist.

The API must obtain the authenticated user ID from Clerk and place it into shared router context.

Anonymous planning can be added later as a separate explicitly designed flow; it must not silently create persisted trips without a user identity.

### 0.4 Persistence gate

Never persist a generated itinerary before validation passes.

Required sequence:

```text
Ground
→ Generate
→ Validate
→ PASS
→ Persist
```

### 0.5 Source tracking

Every externally grounded field must carry source metadata where practical.

Minimum sources:

```text
locationSource
placesSource
weatherSource
routeSource
fareSource
guideSource
costSource
```

---

# 1. Decisions

| # | Decision |
|---|---|
| 1 | Drop the existing Experiential Gateway (`gpt-6-astra` via `@/lib/experiential`). `itineraryAgent.js` is Gemini-only with deterministic fallback. |
| 2 | Preserve the existing demo-guide fallback for DB outages, but explicitly mark fallback data as demo data and never present it as a live verified guide. |
| 3 | Persist generated itineraries after `validationAgent` passes. Create `Trip`, `Stop`, and `Budget` rows. |
| 4 | Use the current Gemini Flash model first, with a controlled fallback chain. Default chain: `gemini-3.8-flash` → `gemini-3.7-flash` → `gemini-3.5-flash` → `gemini-2.5-pro`. `GEMINI_MODEL` may override the first model only if the configured model is available. |
| 5 | Add Routes API integration and document the required Google Cloud API enablement. |
| 6 | Keep all hard factual constraints outside Gemini. Validation is mandatory. |
| 7 | The itinerary endpoint is protected by Clerk. |
| 8 | Transit preference means "preferred/allowed transit modes" rather than a guarantee that Google must return only that mode. The returned route must be inspected and any deviation surfaced. |
| 9 | Forecast or route information that cannot be obtained must become `UNAVAILABLE`; no LLM fallback may fabricate it. |
| 10 | Budget totals and arithmetic are deterministic and immutable with respect to the user's input. |

---

# 2. Current System Audit

| System Component | Current State | Required Change |
|---|---|---|
| Google Maps Gateway | `server/src/services/googleMapsGateway.js` with Places (New), Geocoding, Geolocation, cache and DB fallback. | Reuse and extend with Routes API helpers and candidate ranking. |
| Location Model | Prisma `Location` with Google Place ID, coordinates, formatted address, city and type. | Reuse for canonical destination records and deduplication. |
| Guide System | `GuideProfile`, `GuideLocation`, `GuideRequest` and `app/api/guides/route.ts`. | Reuse DB query and demo fallback, but mark fallback as demo-only. |
| Weather | No real weather integration exists. | Add Open-Meteo integration. |
| LLM Integration | Existing duplicate itinerary generation paths and Experiential Gateway path. | Make `itineraryAgent.js` the canonical itinerary-generation layer. |
| Budget Logic | Existing numeric INR budget and category logic. | Move hard calculations into deterministic `budgetAgent.js`. |
| Middleware | Planner routes are public; itinerary route is not currently present. | Keep `/api/itinerary(.*)` protected. |
| Frontend | `app/llm/page.tsx` contains planner UI. | Submit to new itinerary endpoint and render diagnostics. |

---

# 3. Target Architecture

```text
                         ┌──────────────────────────┐
                         │     Authenticated User   │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         POST /api/itinerary/plan
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │      Clerk Auth Check    │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │      AgentRouter (DAG)   │
                         └────────────┬─────────────┘
                                      │
                        Shared Execution Context
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
             Location Agent                       Request Rules
                    │
          ┌─────────┴──────────┐
          │                    │
          ▼                    ▼
   Places Agent           Weather Agent
          │                    │
          └─────────┬──────────┘
                    │
                    ▼
               Route Agent
                    │
                    ▼
               Guide Agent
                    │
                    ▼
               Budget Agent
                    │
                    ▼
             Itinerary Agent
               (Gemini)
                    │
                    ▼
             Validation Agent
                    │
              ┌─────┴─────┐
              │           │
             PASS        FAIL
              │           │
              ▼           ▼
          Persist DB   Targeted Re-optimization
                          │
                          ▼
                       Re-run
                          │
                          ▼
                     Validation
```

---

# 4. Shared Execution Context

All agents must use the same context object.

```javascript
{
  requestId: "req_...",
  user: {
    id: "...",
    role: "..."
  },

  tripRequest: {
    destinations: ["Delhi", "Agra"],
    startDate: "2026-10-01",
    endDate: "2026-10-04",
    travelerCount: 2,
    totalBudget: 50000,
    currency: "INR",

    accommodationPreference: "Hotel",

    transportationPreference: "TRAIN",

    interests: ["Heritage", "Food"],

    travelStyle: "Cultural",

    pace: "MODERATE",

    guidePreference: "NEED_GUIDE"
    // NO_GUIDE | NEED_GUIDE | CHOOSE_GUIDE
  },

  resolvedLocations: [],

  candidatePlaces: {},

  weatherForecasts: {},

  transitRoutes: [],

  matchedGuides: {},

  budgetAllocations: {},

  generatedPlan: null,

  validationResult: {
    valid: false,
    errors: []
  },

  persistedTripId: null,

  sources: {
    locationSource: null,
    placesSource: null,
    weatherSource: null,
    routeSource: null,
    fareSource: null,
    guideSource: null,
    costSource: null
  },

  routerTrace: []
}
```

---

# 5. Prisma Schema Change

The existing category enum is:

```prisma
enum Category {
  TRANSPORT
  FOOD
  HOTEL
}
```

Extend it to:

```prisma
enum Category {
  TRANSPORT
  FOOD
  HOTEL
  ACTIVITIES
  CONTINGENCY
}
```

`HOTEL` remains the accommodation bucket.

`ACTIVITIES` includes activities and guide costs.

`CONTINGENCY` is the deterministic contingency reserve.

Run:

```bash
npx prisma migrate dev --name add_activities_contingency_categories
```

After successful validation, `agentRouter.js` creates:

```text
1 Trip row
1 Stop row per resolved destination
5 Budget rows
```

The five budget categories must sum exactly to the immutable `totalBudget`.

---

# 6. Environment Configuration

## Google Maps

Enable these Google Cloud APIs:

```text
1. Geolocation API
2. Geocoding API
3. Places API (New)
4. Routes API
```

`.env.example`:

```env
# --- Google Maps Platform ---
GOOGLE_MAPS_SERVER_API_KEY=
```

Do not expose the server key to the browser.

Use the existing browser-side Google Maps configuration separately where required by the frontend.

## Gemini

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

The configured model must be validated before use.

If `GEMINI_MODEL` is missing or unavailable, use:

```text
gemini-3.8-flash
→ gemini-3.7-flash
→ gemini-3.5-flash
→ gemini-2.5-pro
```

Do not hard-fail the application because one model in the chain is temporarily unavailable, unless every fallback fails.

---

# 7. Agent Roster

Directory:

```text
server/src/agents/
```

Required agents:

```text
locationAgent.js
placesAgent.js
weatherAgent.js
routeAgent.js
guideAgent.js
budgetAgent.js
itineraryAgent.js
validationAgent.js
agentRouter.js
```

Every agent must expose a consistent interface:

```javascript
async execute(context)
```

Agents should return structured results and append a router trace entry.

---

# 8. Location Agent

### File

```text
server/src/agents/locationAgent.js
```

### Responsibilities

1. Resolve each user destination into a canonical Roamly `Location`.
2. Use Google Places / Geocoding through the existing gateway.
3. Reuse existing locations when possible.
4. Deduplicate repeated stops.

Example:

```text
Delhi → Agra → Delhi
```

must reuse the same canonical Delhi `Location` ID.

### Rules

- Never fabricate coordinates.
- Never invent formatted addresses.
- Never accept an unresolved destination as valid.
- Store the exact Google Place ID where available.
- Preserve source metadata.

Failure example:

```json
{
  "success": false,
  "reason": "LOCATION_UNRESOLVED"
}
```

---

# 9. Places Agent

### File

```text
server/src/agents/placesAgent.js
```

### Source

Google Places API (New).

Use strict field masks and request only fields needed by the planner, such as:

```text
id
displayName
location
formattedAddress
rating
userRatingCount
regularOpeningHours
photos
primaryType
```

### Responsibilities

- Discover candidate attractions for each destination.
- Filter by user interests.
- Preserve official Google `placeId`.
- Preserve operating-hour information when available.
- Preserve rating metadata.
- Rank candidates deterministically before passing them to Gemini.

### Hard rules

Gemini may only select places from the candidate set.

Gemini must not introduce a place outside the verified candidate list.

---

# 10. Weather Agent

### File

```text
server/src/agents/weatherAgent.js
```

### Source

Open-Meteo.

Inputs:

```text
latitude
longitude
trip dates
```

Outputs should include:

```text
temperature
precipitation probability
weather code
forecast availability
```

### Forecast horizon rule

If the requested dates are outside the supported forecast horizon:

```json
{
  "available": false,
  "reason": "FORECAST_UNAVAILABLE"
}
```

Do not generate a synthetic or guessed forecast.

Gemini must receive this explicit state.

---

# 11. Route Agent

### File

```text
server/src/agents/routeAgent.js
```

### Source

Google Routes API.

### Responsibilities

Calculate route information between consecutive itinerary locations/stops.

Return:

```text
distance
duration
travel mode
route details
fare source
availability
```

### Supported preferences

```text
TRAIN
PUBLIC_TRANSIT
CAB
WALKING
```

For public transit, translate the preference into Google's supported transit preferences where applicable.

### Critical transit rule

A preferred transit mode is **not always a strict guarantee** of the route returned by Google.

For example:

```text
User preference = TRAIN
```

does not mean the system can blindly claim:

```text
Route = train only
```

The agent must inspect the actual returned route.

If Google returns a route involving another transit mode, record that deviation explicitly.

Example:

```json
{
  "requestedMode": "TRAIN",
  "actualModes": ["TRAIN", "WALK"],
  "preferenceSatisfied": true
}
```

If the returned route materially violates a user's hard constraint and no acceptable route exists:

```json
{
  "available": false,
  "reason": "PREFERRED_TRANSIT_UNAVAILABLE"
}
```

### Fare rule

Fare source can be:

```text
GOOGLE
ROAMLY_ESTIMATE
UNAVAILABLE
```

Never let Gemini invent a fare.

If no deterministic fare source exists, return:

```text
fareSource = UNAVAILABLE
```

---

# 12. Guide Agent

### File

```text
server/src/agents/guideAgent.js
```

### Primary source

Roamly Prisma database.

Search only for guides meeting:

```text
verification_status = VERIFIED
availability_status = AVAILABLE
```

Match by:

```text
location_id
city
```

### Guide preference behavior

```text
NO_GUIDE
    → no guide required

NEED_GUIDE
    → find an available verified guide

CHOOSE_GUIDE
    → return eligible guide candidates for user selection
```

### DB fallback

If the database is unavailable, reuse the existing demo-guide fallback.

But mark it explicitly:

```text
guideSource = ROAMLY_DEMO_FALLBACK
isDemo = true
isBookable = false
```

The UI must clearly label demo data.

Example:

```text
Demo guide data
Not available for booking
```

Do not present demo guides as real verified Roamly guides.

If there is neither database data nor fallback:

```json
{
  "available": false,
  "reason": "NO_ROAMLY_GUIDE_AVAILABLE"
}
```

---

# 13. Budget Agent

### File

```text
server/src/agents/budgetAgent.js
```

### Core formula

```text
budgetPerPersonPerDay =
  totalBudget / (travelerCount × durationDays)
```

### Deterministic envelope

```text
HOTEL         35%
TRANSPORT     25%
FOOD          20%
ACTIVITIES    15%
CONTINGENCY    5%
```

Total:

```text
35 + 25 + 20 + 15 + 5 = 100%
```

### Hard constraints

- `totalBudget` comes only from user input.
- Gemini cannot modify `totalBudget`.
- Category allocations are deterministic.
- Budget sums must reconcile exactly.
- Rounding must be deterministic.
- Remaining budget must be calculated mathematically.

Required invariants:

```text
sum(categoryBudgets) == totalBudget

sum(allDayCosts) == estimatedTotalCost

remainingBudget =
  totalBudget - estimatedTotalCost
```

---

# 14. Itinerary Agent

### File

```text
server/src/agents/itineraryAgent.js
```

### Role

Gemini is the **reasoning and synthesis engine only**.

It receives:

```text
verified locations
verified candidate places
verified opening hours
verified weather
verified routes
verified guides
deterministic budget envelopes
user preferences
```

### Gemini model chain

```text
GEMINI_MODEL
→ gemini-3.8-flash
→ gemini-3.7-flash
→ gemini-3.5-flash
→ gemini-2.5-pro
```

The implementation must check whether a model is available before treating it as usable.

### Gemini input contract

Send a strongly structured payload.

Do not send vague instructions such as:

```text
Plan a good trip to Delhi.
```

Send explicit grounded data and constraints.

### Required system-level rules

```text
You are a travel itinerary synthesis engine.

You may only use facts contained in the supplied grounded data.

Never invent:
- places
- place IDs
- coordinates
- prices
- opening hours
- guide details
- route durations
- weather
- availability

Do not alter the user's total budget.

If required information is missing, represent it as UNAVAILABLE.

Only select attractions from candidatePlaces.

Only use route information from transitRoutes.

Only use guides from matchedGuides.

Only use budget values calculated by budgetAgent.

The output must match the required structured schema.
```

### Structured output

The model must return machine-readable JSON matching the itinerary schema.

Do not rely on free-form markdown parsing.

### Deterministic fallback

If Gemini is unavailable/rate-limited, run a deterministic scheduler using the verified candidate set and constraints.

The deterministic fallback must never invent data either.

---

# 15. Validation Agent

### File

```text
server/src/agents/validationAgent.js
```

This is the mandatory guardrail.

Validation must happen after every final generation and after every re-optimization.

## 17 required checks

```text
1. Every placeId exists in verified places.
2. Every guideId exists in verified guides or explicitly marked demo fallback.
3. Total cost equals sum of day/item costs.
4. totalBudget equals user input.
5. estimatedTotalCost <= totalBudget unless explicitly marked OVER_BUDGET.
6. remainingBudget is mathematically exact.
7. Opening and closing hours are respected when known.
8. Route data exists for every transit link.
9. Travel durations are never invented.
10. Weather equals grounded data or is UNAVAILABLE.
11. Transportation preference is respected or a documented deviation is returned.
12. Guide availability is respected.
13. No duplicate attraction visits on the same day.
14. All dates are inside the trip window.
15. startTime < endTime.
16. No overlapping activity slots.
17. Destination count matches the user request.
```

### Validation result

```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

or:

```json
{
  "valid": false,
  "errors": [
    {
      "code": "OPENING_HOURS_CONFLICT",
      "details": "..."
    }
  ],
  "warnings": []
}
```

Errors must use machine-readable codes.

---

# 16. Agent Router

### File

```text
server/src/agents/agentRouter.js
```

### Responsibilities

- Maintain the agent registry.
- Initialize shared execution context.
- Execute the dependency graph.
- Run independent agents concurrently.
- Record `routerTrace`.
- Run targeted re-optimization.
- Persist only after validation passes.

### Dependency graph

```text
locationAgent
      │
      ├───────────────┐
      ▼               ▼
placesAgent      weatherAgent
      │               │
      └───────┬───────┘
              ▼
         routeAgent
              ▼
         guideAgent
              ▼
         budgetAgent
              ▼
      itineraryAgent
              ▼
      validationAgent
```

### Parallelization

After `locationAgent` succeeds:

```javascript
await Promise.all([
  placesAgent.execute(context),
  weatherAgent.execute(context)
])
```

Run subsequent dependencies in order.

---

# 17. Targeted Re-optimization

Maximum:

```text
2 iterations
```

Do not repeatedly regenerate the entire itinerary without reason.

## BUDGET_EXCEEDED

```text
budgetAgent
→ placesAgent (cheaper candidates)
→ itineraryAgent
→ validationAgent
```

## OPENING_HOURS_CONFLICT

```text
itineraryAgent (adjust scheduling/order)
→ validationAgent
```

## GUIDE_UNAVAILABLE

```text
guideAgent
→ itineraryAgent
→ validationAgent
```

## ROUTE_UNAVAILABLE / PREFERRED_TRANSIT_UNAVAILABLE

```text
routeAgent
→ itineraryAgent
→ validationAgent
```

If two targeted attempts fail, return a structured failure instead of looping indefinitely.

---

# 18. Persistence

Only after:

```text
validationResult.valid === true
```

create:

### Trip

```text
Trip
- user_id
- start_date
- end_date
- description
```

### Stops

One stop per resolved destination:

```text
Stop
- sequence
- arrival_date
- departure_date
- location_id
```

Use the existing `recordTripStop` helper where appropriate.

### Budget

Create one row per category:

```text
TRANSPORT
FOOD
HOTEL
ACTIVITIES
CONTINGENCY
```

The sum must equal the user-provided `totalBudget`.

---

# 19. API Endpoint

## `POST /api/itinerary/plan`

### Authentication

Protected by Clerk.

### Request

```typescript
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
```

### Validate request before invoking AgentRouter

Reject:

```text
missing destinations
invalid dates
endDate < startDate
travelerCount < 1
totalBudget <= 0
invalid pace
invalid guidePreference
unsupported transportationPreference
```

---

# 20. API Response

Successful response:

```typescript
{
  success: true;

  tripId: number;

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

  sources: {
    locationSource: string;
    placesSource: string;
    weatherSource: string;
    routeSource: string;
    fareSource: string;
    guideSource: string;
    costSource: string;
  };

  routerTrace: {
    agentsExecuted: string[];
    fallbackUsed: boolean;
    validationStatus: "PASSED" | "FAILED";
    reOptimizations: number;
  };
}
```

Failed response:

```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };

  routerTrace: {
    agentsExecuted: string[];
    fallbackUsed: boolean;
    validationStatus: "PASSED" | "FAILED";
    reOptimizations: number;
  };
}
```

Do not return a fake or partially validated itinerary as a successful result.

---

# 21. Frontend Integration

### File

```text
app/llm/page.tsx
```

Add:

### Traveler count

```text
1
2
3
4
5+
```

### Guide preference

```text
No Guide
Need a Guide
Choose a Guide
```

### Submission

Replace the direct itinerary-generation call with:

```text
POST /api/itinerary/plan
```

The frontend should render:

```text
loading
agent progress
success
validation state
grounding sources
```

---

# 22. Development Diagnostic Panel

Add a collapsible development-only panel.

Display:

```text
✓ Location
✓ Places
✓ Weather
✓ Routes
✓ Guides
✓ Budget
✓ Itinerary
✓ Validation
```

Also display source information:

```text
Coordinates → Google
Place IDs → Google Places
Weather → Open-Meteo
Routes → Google Routes
Guides → Roamly Database / Demo Fallback
Costs → Deterministic Roamly Estimate
```

For demo guides:

```text
⚠ DEMO DATA — NOT BOOKABLE
```

Do not hide failed grounding sources behind a generic "AI generated" label.

---

# 23. Frontend Current Location Handling

For the planner's "Use My Current Location" flow:

```text
Browser geolocation permission
        ↓
coordinates
        ↓
reverse geocoding / place resolution
        ↓
canonical Roamly Location
```

If browser geolocation is unavailable or denied, allow the user to use explicit location search.

Never convert arbitrary coordinates into a place by guessing.

The server should still verify the resolved location before using it in the itinerary graph.

---

# 24. Grounding Contracts

Each agent should have an explicit input/output contract.

Example:

```javascript
placesAgent
  input:
    resolvedLocations
    interests

  output:
    candidatePlaces
```

```javascript
weatherAgent
  input:
    resolvedLocations
    startDate
    endDate

  output:
    weatherForecasts
```

```javascript
routeAgent
  input:
    resolvedLocations
    transportationPreference

  output:
    transitRoutes
```

```javascript
itineraryAgent
  input:
    verified context only

  output:
    generatedPlan
```

```javascript
validationAgent
  input:
    generatedPlan
    verified context

  output:
    validationResult
```

Gemini must never receive an opportunity to call arbitrary external APIs directly unless that capability is explicitly designed and separately validated.

---

# 25. Failure-Safe Behavior

The system must fail explicitly.

### Location failure

```text
LOCATION_UNRESOLVED
```

### Weather failure

```text
FORECAST_UNAVAILABLE
```

### Route failure

```text
ROUTE_UNAVAILABLE
```

### Transit preference failure

```text
PREFERRED_TRANSIT_UNAVAILABLE
```

### Guide failure

```text
NO_ROAMLY_GUIDE_AVAILABLE
```

### Budget failure

```text
OVER_BUDGET
```

### Validation failure

```text
VALIDATION_FAILED
```

Never silently convert one of these states into an invented value.

---

# 26. Logging and Router Trace

Every execution should record:

```javascript
{
  agent: "placesAgent",
  startedAt: "...",
  completedAt: "...",
  success: true,
  fallbackUsed: false,
  source: "GOOGLE_PLACES"
}
```

Never log:

```text
API keys
authorization headers
full private user secrets
raw sensitive credentials
```

The frontend diagnostic panel should show summarized trace data, not credentials or private server information.

---

# 27. Test Suite

Create:

```text
scripts/test-agent-router.mjs
```

At minimum test these categories:

### Location

```text
valid destination
unknown destination
duplicate destination
repeated stop: Delhi → Agra → Delhi
```

### Places

```text
interest filtering
empty candidate result
place not in verified candidate list
```

### Weather

```text
valid forecast
forecast unavailable
```

### Routes

```text
valid route
route unavailable
preferred transit mode
transit mode deviation
```

### Guides

```text
verified guide
no guide requested
guide unavailable
database outage → demo fallback
```

### Budget

```text
normal budget
exact budget reconciliation
over-budget itinerary
```

### Validation

```text
invalid place ID
invalid guide ID
opening-hours conflict
overlapping activities
duplicate attraction
invalid date
wrong destination count
invented travel duration
```

### Persistence

```text
PASS → persisted
FAIL → not persisted
```

---

# 28. End-to-End Verification

Run:

```bash
npm test
```

or the project's existing test command.

Then run the agent-router script:

```bash
node scripts/test-agent-router.mjs
```

Then manually verify:

```text
http://localhost:3000/llm
```

Check:

```text
1. Current-location flow
2. Destination search
3. Traveler count
4. Guide preference
5. Budget handling
6. Itinerary generation
7. Validation status
8. Source diagnostics
9. Persistence
10. Re-optimization
```

---

# 29. Implementation Sequence

```text
PHASE 0 — Database
  0.1 Extend Category enum
  0.2 Run Prisma migration
  0.3 Verify Trip / Stop / Budget persistence requirements

PHASE 1 — Integrations
  1.1 Weather API
  1.2 Routes API
  1.3 Google Places/Geocoding reuse
  1.4 Environment variables

PHASE 2 — Core Agents
  2.1 locationAgent.js
  2.2 placesAgent.js
  2.3 weatherAgent.js
  2.4 routeAgent.js
  2.5 guideAgent.js
  2.6 budgetAgent.js
  2.7 itineraryAgent.js
  2.8 validationAgent.js

PHASE 3 — Router
  3.1 agentRouter.js
  3.2 Shared execution context
  3.3 Parallel Places + Weather
  3.4 Targeted re-optimization
  3.5 Persistence gate
  3.6 Router trace

PHASE 4 — API
  4.1 POST /api/itinerary/plan
  4.2 Clerk authentication
  4.3 Request validation
  4.4 Error handling

PHASE 5 — Frontend
  5.1 Traveler count
  5.2 Guide preference
  5.3 API integration
  5.4 Result rendering
  5.5 Diagnostic panel
  5.6 Demo guide warning

PHASE 6 — Testing
  6.1 Unit tests
  6.2 Integration tests
  6.3 Failure-path tests
  6.4 Persistence tests
  6.5 Manual browser verification
```

---

# 30. Acceptance Criteria

The implementation is complete only when all are true:

```text
[ ] Gemini is never used as the factual source of truth.
[ ] Every selected place comes from the verified Places candidate list.
[ ] Every route duration comes from Google Routes or an explicitly deterministic fallback.
[ ] Weather is grounded or marked UNAVAILABLE.
[ ] Guide data is grounded in Roamly DB or explicitly marked DEMO FALLBACK.
[ ] Demo guides are never presented as live bookable guides.
[ ] User totalBudget is immutable.
[ ] Category budgets sum to totalBudget.
[ ] estimatedTotalCost is mathematically reconciled.
[ ] Validation runs before persistence.
[ ] Invalid plans are not persisted as successful trips.
[ ] Re-optimization is targeted and capped at two iterations.
[ ] /api/itinerary/plan is authenticated.
[ ] No server API keys are exposed to the client.
[ ] Router trace records all executed agents.
[ ] Frontend can show grounding sources.
[ ] Current-location inputs are verified before use.
[ ] Tests cover both success and failure paths.
```

---

# 31. Follow-Up Cleanup

After this phase, consider:

```text
1. Deprecate/consolidate:
   app/api/generatePlanWithSummary/route.ts
   lib/generate-plan.ts

2. Remove unused:
   @/lib/experiential
   if no other caller depends on it.

3. Consolidate:
   .env.example
   env.example

4. Add a production-grade guide booking workflow.

5. Add caching for expensive Google API calls.

6. Add rate limiting and abuse protection to the itinerary endpoint.
```

---

# 32. Final Implementation Principle

The most important rule for Roamly is:

```text
                  FACTS
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
   Google        Open-Meteo     Roamly DB
   Maps
      │             │             │
      └─────────────┼─────────────┘
                    ▼
             Deterministic Data
                    │
                    ▼
                 Gemini
                    │
              Reasoning Only
                    │
                    ▼
               Validation
                    │
             ┌──────┴──────┐
             ▼             ▼
            PASS          FAIL
             │             │
             ▼             ▼
          Persist       Re-optimize
```

**Gemini should make the itinerary understandable and useful.
The APIs and deterministic logic should make it true.
The validator should decide whether it is safe to persist.**
