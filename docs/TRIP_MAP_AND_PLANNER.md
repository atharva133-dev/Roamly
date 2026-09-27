# Roamly — Trip Map & Interactive Planner Documentation

## 1. Existing Architecture

Roamly is a multi-role tourism web application built with Next.js 15, Prisma ORM, PostgreSQL, Clerk Authentication, and Google Maps Platform.

The system enforces strict role isolation:
- `USER` (Traveler): Can plan trips, select guides, view maps, search hotels and nearby places, and manage itineraries.
- `GUIDE`: Can manage guide profile, accept or reject booking requests, and set availability. Blocked from traveler trip-planning access.
- `SUPER_ADMIN`: Can manage locations, verify guides, and oversee platform operations.

---

## 2. Guide-Fallback Fix (Part A)

### Problem Identified
Previously, `server/src/agents/guideAgent.js` fell back to `getDemoGuides()` from `server/src/services/demoGuides.js` when no matching guide was found in PostgreSQL. For arbitrary destinations like Qatar or Paris, it dynamically synthesized fake guides named "Rajesh V. (Qatar Expert)" and marked them as verified and available.

### Solution Implemented
1. Removed all calls to `getDemoGuides()` from `guideAgent.js`.
2. When zero eligible guides exist in PostgreSQL for a destination, the system returns `guides = []` and issues a transparent warning (`NO_ROAMLY_GUIDE_AVAILABLE`).
3. If an invalid or demo `selectedGuideId` (such as `guide_rahul_sharma`) is supplied, it is rejected with a validation error (`GUIDE_NOT_FOUND`).
4. Real guides must exist in PostgreSQL, have `role = GUIDE`, satisfy verification requirements (`verification_status = VERIFIED`), satisfy email verification, and be `AVAILABLE`.
5. Passed all 10 tests in `scripts/test-no-demo-guides.ts`.

---

## 3. Google Maps Architecture

The map features are integrated via a layered architecture:
```
Frontend UI (app/trip-map/page.tsx, components/site-nav.tsx)
    │
    ▼
Next.js Protected API Routes (app/api/trips/[tripId]/*, app/api/places/*)
    │
    ▼
Google Maps Gateway (server/src/services/googleMapsGateway.js)
    │
    ▼
Google Maps Platform Integrations (Places New, Routes v2, Geocoding, Geolocation)
```

Rules:
- Secret API keys remain server-side (`GOOGLE_MAPS_SERVER_API_KEY`).
- Frontend Maps JavaScript API uses `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- All Google API calls are cached in memory to avoid redundant quota usage.

---

## 4. Places API Usage & Place IDs

Roamly uses the Google Places API (New):
- Place IDs (`ChIJ...`) are canonical identifiers stored in the `Location` table (`google_place_id`).
- Locations visited multiple times (e.g. Delhi → Agra → Delhi) reuse the same canonical `Location` record while creating distinct `Stop` entries.
- Explicit field masks are applied to every request to keep payload sizes and costs minimal.

---

## 5. Nearby Famous Places

- Endpoint: `GET /api/trips/[tripId]/nearby`
- Gateway: `searchNearbyPlaces({ latitude, longitude, radiusMeters, includedTypes, excludedPlaceIds })`
- Default radius: 1,500m (configurable up to 10,000m).
- Categories: Tourist attractions, historical landmarks, museums, parks, restaurants, cafes, shopping.
- Excludes places already present in the trip itinerary.
- Returns 5–10 places with name, rating, user review count, distance, category, and address.

---

## 6. Place Details, Reviews & Opening Hours

- Endpoint: `GET /api/places/details?placeId=...`
- Returns: `displayName`, `rating`, `userRatingCount`, `reviews` (with author and time description), `regularOpeningHours`, `currentOpeningHours`, `priceLevel`, and `googleMapsUri`.
- Zero fabrication rule: If reviews or opening hours are not returned by Google, the UI explicitly shows "Unavailable" or "Opening hours unavailable".

---

## 7. Hotel Search & Comparison

- Endpoint: `GET /api/trips/[tripId]/hotels`
- Searches lodging within 5,000m of the destination or stops.
- Endpoint: `POST /api/trips/[tripId]/hotels/compare`
- Allows selecting 2–5 hotels to view side-by-side factual trade-offs (name, rating, review count, price level, distance from trip activities, address).
- Does not declare a global "winner" — displays transparent trade-offs.

---

## 8. Hotel Selection as Trip Anchor

- Endpoint: `POST /api/trips/[tripId]/hotel/select`
- Persists selected hotel into PostgreSQL as an anchor stop (`sequence: 0`) linked to a canonical `Location` with `type: "lodging"`.
- Appears on the map with a distinct 🏨 icon.
- Acts as the default daily route anchor:
  `Hotel → Activity A → Activity B → Activity C → Hotel`

---

## 9. Start / End Scheduling & Opening-Hours Validation

- Endpoint: `POST /api/trips/[tripId]/stops` and `PATCH /api/trips/[tripId]/stops/[stopId]`
- Time format: `HH:mm` (e.g. `09:00`–`10:30`).
- Validates:
  1. `endTime > startTime` (rejects equal or backward times).
  2. Overlapping schedule detection on the same day.
  3. Opening-hours comparison with Google `regularOpeningHours.periods`. If scheduled outside operating hours, returns a non-destructive warning (`SCHEDULE_HOURS_MISMATCH`).

---

## 10. Route Calculation & Multi-Stop Optimization

- Endpoint: `POST /api/trips/[tripId]/route`
- Travel modes:
  - `DRIVE` / `CAR` (Google Routes API DRIVE)
  - `TRANSIT` (Public transit)
  - `TWO_WHEELER` (Roamly two-wheeler estimate)
  - `WALK` (Google Routes API WALK)
  - `BICYCLE` (Walking baseline approximation)
- Multi-stop routing computes all consecutive legs and aggregates distance and duration.
- Waypoint Optimization (`optimizeOrder: true`): Re-orders stops using nearest-neighbor heuristic and presents an "Accept / Keep Current Order" choice without silently altering user data.

---

## 11. Transparent Transport Cost Estimation

- Service: `lib/transport/cost-estimator.ts`
- Sources clearly distinguished:
  - **Google transit fare**: Live fare when returned by Google Routes API.
  - **Google toll**: Live toll when returned by Google Routes API.
  - **Roamly estimate**: Configurable per-km rates (DRIVE: ₹12–18/km, base ₹50; TWO_WHEELER: ₹4–7/km, base ₹25).
  - **Free**: Walking and cycling (₹0).
- Never presents a Roamly estimate as an exact live taxi meter or Uber/Ola quote.

---

## 12. Security & Authorization

- All `/api/trips/[tripId]/*` routes require authentication via Clerk.
- Role-based authorization via `enforceRole([UserRole.USER, UserRole.SUPER_ADMIN])`.
- GUIDE users are strictly forbidden (HTTP 403) from accessing traveler trip-planning APIs.
- Cross-user access is prevented by checking `trip.user_id === authContext.userId`.

---

## 13. Test Results Summary

| Test Suite | File | Tests | Result |
|------------|------|-------|--------|
| No Demo Guides Suite | `scripts/test-no-demo-guides.ts` | 10 | 10 PASS, 0 FAIL |
| Guide Discovery Suite | `scripts/test-guide-discovery.ts` | 19 | 19 PASS, 0 FAIL |
| Guide Location Matching | `scripts/test-guide-location-matching.ts` | 12 | 12 PASS, 0 FAIL |
| Guide Email Verification | `scripts/test-guide-email-verification.ts` | 14 | 14 PASS, 0 FAIL |
| RBAC Security Suite | `scripts/test-rbac.ts` | 29 | 29 PASS, 0 FAIL |
| Trip Map & Planner Suite | `scripts/test-trip-map.ts` | 29 | 29 PASS, 0 FAIL |
| Agent Router Suite | `scripts/test-agent-router.mjs` | 21 | 21 PASS, 0 FAIL |
| Google Locations Suite | `scripts/test-google-locations.mjs` | 5 | 5 PASS, 0 FAIL |
| Nugen Chatbot Suite | `scripts/test-nugen-chatbot.ts` | 21 | 21 PASS, 0 FAIL |
| API Route Suite | `scripts/test-api-routes.mjs` | 6 | 6 PASS, 0 FAIL |
| TypeScript Check | `npx tsc --noEmit` | N/A | 0 errors |
| Prisma Schema Check | `npx prisma validate` | N/A | Valid |
