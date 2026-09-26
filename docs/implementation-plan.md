# Roamly — Phased Technical Implementation Plan
**Document Version:** 1.0  
**Target:** Hackathon MVP & Production-Ready Prototype  
**Execution Strategy:** Progressive Staging from Foundational Geolocation → Core State → Personalization & Scheduling Engine → Dynamic Adaptation → Operator Command Center.

---

## 🧭 Executive Overview & Strategy

This implementation plan defines the exact construction order for Roamly. Instead of building all 11 lifecycle stages and all external integrations in parallel, development progresses along a disciplined critical path:

```text
Google Maps Gateway (Ground Truth)
       ↓
Domain Models & TourPreference Schema
       ↓
Traveler Flow: Discover & Personalization (Travel DNA)
       ↓
Recommendation Engine & Itinerary Solver (DAG)
       ↓
Dynamic Adaptation Engine (Killer Feature: Weather, Delay, Cancellation)
       ↓
Operator Command Center & WebSocket Synchronization
       ↓
Context-Aware AI Assistant & Lightweight Booking
```

### The Architectural Invariant (Strict Rule)
```text
Controller  →  Business Service  →  GoogleMapsGateway  →  Google API Adapter
```
* **Never** call Google APIs directly from controllers or frontend components.
* All external geolocation, places, routing, and transit data flows through `googleMapsGateway.js`.
* All gateway outputs are strictly normalized domain models (`distanceKm`, `durationMinutes`, `placeId`, `lat`, `lng`).
* This enables seamless offline/mock testing for hackathon demos and insulates against Google API contract updates.

---

## 🛠️ Phase-by-Phase Execution Plan

### Phase 0: Freeze Architecture & Directory Refactoring
**Objective:** Establish directory structure, modular Google adapters, and gateway service contracts before writing feature code.

* **File Changes:**
  * Reorganize integrations:
    ```text
    server/src/integrations/
    ├── google/
    │   ├── places.js        # Google Places API (New) with explicit field masks
    │   ├── geocoding.js     # Lat/Lng resolution
    │   ├── routes.js        # Routes API (Route matrix & distance)
    │   ├── weather.js       # Hyper-local weather alerts
    │   └── index.js         # Unified client export
    ├── amadeus.js
    ├── razorpay.js
    └── firebaseMessaging.js
    ```
  * Establish service layer:
    ```text
    server/src/services/
    ├── googleMapsGateway.js   # Normalization boundary
    ├── recommendationEngine.js# Personalization scoring & candidate ranking
    ├── itineraryEngine.js     # Day-wise DAG construction
    ├── conflictResolver.js    # Multi-constraint optimization
    ├── dependencyGraph.js     # Topological sort & cycle validation
    ├── pricingService.js      # Dynamic margin & currency engine
    └── explanationService.js  # Gemini/Claude rationale generator
    ```

---

### Phase 1: Google Maps Foundation (Build Before AI)
**Objective:** Wire up ground-truth geospatial data so that all AI recommendations are anchored in real locations, operating hours, and travel times.

1. **Destination Search (`server/src/integrations/google/places.js`):**
   * Use **Places API (New)** Text Search and Autocomplete.
   * Return: `placeId`, formatted name, destination coordinates.
2. **Geocoding (`server/src/integrations/google/geocoding.js`):**
   * Implement `geocodeDestination(query)`.
   * Standard output contract:
     ```json
     {
       "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
       "name": "Paris",
       "lat": 48.8566,
       "lng": 2.3522,
       "country": "France"
     }
     ```
3. **Place Details with Explicit Field Masks:**
   * Implement `getPlaceDetails(placeId)`.
   * **Mandatory Field Mask:** Request *only* required fields to minimize payload size and latency:
     `displayName,location,formattedAddress,rating,userRatingCount,reviews,regularOpeningHours,photos,types`.
4. **Routes Normalization (`server/src/integrations/google/routes.js`):**
   * Implement `getRoute(origin, destination, travelMode)` and `getRouteMatrix(origins, destinations, travelMode)`.
   * Normalized gateway output:
     ```json
     {
       "distanceKm": 4.3,
       "durationMinutes": 18,
       "travelMode": "DRIVE"
     }
     ```

---

### Phase 2: Core Database & Domain Models
**Objective:** Finalize Prisma / PostgreSQL schema with the new `TourPreference` entity and slot constraints.

* **Extend Domain Entities:**
  * **Traveler:** `preferences`, `travelStyle`, `budget`, `interests`, `travelDNA`.
  * **Tour:** `destination`, `startDate`, `endDate`, `budget`, `status`, `totalCost`.
  * **DayPlan:** `date`, `city`, `slots[]`.
  * **Slot:** `placeId`, `type` (HOTEL | TRANSPORT | ACTIVITY), `startTime`, `endTime`, `cost`, `travelTimeFromPrevious`, `transportMode`, `constraints`, `dependsOnSlotId`.
  * **Vendor:** `name`, `type`, `availability`, `pricing`, `capacity`, `reliabilityScore`.
  * **Booking:** `vendorId`, `slotId`, `paymentStatus`, `cancellationStatus`.
  * **ChangeEvent:** `trigger`, `affectedSlots`, `alternatives`, `selectedResolution`, `status`, `explanationMarkdown`.
* **Add `TourPreference` Contract:**
  ```json
  {
    "budget": 70000,
    "pace": "relaxed",
    "interests": ["culture", "food", "history"],
    "accommodation": "4-star",
    "transport": ["transit", "walking"],
    "avoid": ["nightlife"]
  }
  ```
  *This becomes the primary input to both the Recommendation Engine and the Itinerary Optimizer.*

---

### Phase 3: Traveler Discovery Flow (`/discover`)
**Objective:** Deliver a rich destination explorer powered by Google Places and verified partner vendors.

* **Route:** `client/app/(traveler)/discover/page.tsx`
* **Flow:**
  * Traveler searches destination (e.g., *"Paris"* or *"Jaipur"*).
  * Backend calls `googleMapsGateway.searchPlaces("Paris")` combined with seeded local vendors.
  * UI displays:
    * Top destination highlights with real photos and ratings.
    * Popular attractions categorized by cultural, culinary, and outdoor tags.
    * Curated partner stays and activities with base pricing in INR (₹).

---

### Phase 4: Personalization Engine & Travel DNA (`/personalize`)
**Objective:** Capture multi-dimensional traveler preferences and translate them into a quantitative Travel DNA vector.

* **Route:** `client/app/(traveler)/personalize/page.tsx`
* **Inputs Captured:**
  * Destination & travel dates.
  * Group size & budget cap.
  * Travel style (relaxed, moderate, fast-paced).
  * Interest weights (history, art, food, nature, nightlife, shopping).
  * Lodging preference (hostel, boutique, luxury hotel, villa).
  * Dietary and physical accessibility constraints.
* **Backend Function:** `buildTravelerProfile(input)` in `traveler.controller.js`.
* **Output Contract:**
  ```json
  {
    "interests": {
      "history": 0.9,
      "food": 0.8,
      "nature": 0.5,
      "nightlife": 0.1
    },
    "pace": "relaxed",
    "budget": 70000,
    "transportPreference": ["TRANSIT", "WALK"],
    "dailyPaceLimitHours": 6
  }
  ```

---

### Phase 5: Recommendation Engine (`recommendationEngine.js`)
**Objective:** Programmatic filtering and scoring of places before any LLM is invoked.

* **Algorithmic Pipeline:**
  ```text
  Traveler DNA
       ↓
  Fetch Candidate Places (Google Places API New + Vendor Directory)
       ↓
  Hard Constraint Filtering (Operating hours, duration, category)
       ↓
  Affinity Scoring Function:
       Score = 0.50 * InterestMatch + 0.25 * RatingScore + 0.15 * DistanceScore + 0.10 * BudgetFit
       ↓
  Top-K Candidates Selected
       ↓
  Gemini 1.5 Rationale ("Why this matches your profile")
  ```
* **Output Display:**
  * *"Louvre Museum — 94% match (High affinity for historical art & architecture)"*
  * *"Montmartre Culinary Walk — 89% match (Matches your food exploration interest)"*
  * *Rule: Gemini explains why something matches; it never invents opening hours or coordinates.*

---

### Phase 6: Initial Itinerary Engine (`itineraryEngine.js`)
**Objective:** Construct a conflict-free, geographically sequenced day-by-day itinerary.

* **Inputs:** Destination, dates, Travel DNA, candidate slots, opening hours, route matrices.
* **Execution Logic:**
  1. Group slots by geographic clusters (reducing inter-slot transit).
  2. Sequence slots temporally: morning anchor → lunch → afternoon activity → sunset/evening dinner.
  3. Query `googleMapsGateway.getRoute()` for transit time and distance between consecutive slots.
  4. Validate opening hour constraints and lunch/dinner windows.
  5. Establish `Slot.dependsOnSlotId` links in the database to build the Directed Acyclic Graph (DAG).
* **Sample Output (`Day 1`):**
  * `09:30 - 10:00`: Transit from Hotel to Louvre (3.2 km, 18 mins).
  * `10:00 - 13:00`: Louvre Museum (Activity slot, ₹1,800).
  * `13:00 - 14:15`: Bistrot Vivienne (Food slot, ₹1,200).
  * `14:30 - 16:30`: Notre-Dame & Île de la Cité (Activity slot, Free).
  * `17:00 - 18:30`: Seine River Sunset Cruise (Activity slot, ₹1,500).
  * `19:30 - 21:00`: Dinner at Le Marais (Food slot, ₹2,200).

---

### Phase 7: Dynamic Adaptation Engine (The Killer Feature)
**Objective:** Automated disruption detection, DAG cascade traversal, constraint re-optimization, and multi-actor notifications.

* **Build Exactly 3 Disruption Scenarios for the Demo:**
  1. **Scenario A — Weather Disruption:**
     * *Trigger:* Weather API flags heavy rain in afternoon.
     * *Engine Action:* Identifies outdoor activity (e.g., Seine Walking Tour), queries indoor alternatives (e.g., Musee d'Orsay), recalculates transit and price delta.
  2. **Scenario B — Transit / Flight Delay:**
     * *Trigger:* Inbound flight delayed by 2.5 hours.
     * *Engine Action:* Traverses DAG downstream, computes slack time between airport arrival and first activity. Since delay > slack, shifts subsequent slots, auto-drops or reschedules lowest-priority slot, preserves evening hotel check-in.
  3. **Scenario C — Vendor Cancellation / Overbooking:**
     * *Trigger:* Activity vendor cancels reservation.
     * *Engine Action:* Gathers alternate vendors in category, ranks by cost + distance + traveler DNA affinity, alerts operator for one-click approval.
* **The Multi-Constraint Penalty Function:**
  $$J(a) = w_c \cdot \Delta C(a) + w_t \cdot \Delta T(a) + w_d \cdot D_{transit}(a) + w_p \cdot (1 - P_{match}(a)) + w_o \cdot \Omega_{vendor}(a)$$

---

### Phase 8: Operator Command Center (`/operator`)
**Objective:** Give the tour operator omniscient oversight and human-in-the-loop control.

* **Primary Cockpit View (`/operator/dashboard`):**
  * Real-time metrics: Active Tours, Total Travelers in Region, Disruption Alerts, Revenue.
  * Live alert stream showing active `ChangeEvents`.
* **Main Evaluation Screen (`/operator/tours/[tourId]`):**
  * Displays the live tour state and interactive adaptation card:
  ```text
  ┌────────────────────────────────────────────────────────┐
  │ Paris Heritage Tour #1042                             │
  │ 6 Travelers • Day 2 • Assigned: Coordinator Arjun      │
  ├────────────────────────────────────────────────────────┤
  │ 🔴 WEATHER DISRUPTION DETECTED                         │
  │ Heavy rain forecasted in Central Paris at 15:00        │
  │ Affected: 2 outdoor activities | Impact: 6 Travelers   │
  ├────────────────────────────────────────────────────────┤
  │ ORIGINAL                   PROPOSED ALTERNATIVE        │
  │ Seine Walking Tour         Musee d'Orsay + Tea Tasting │
  │ 15:00 - 17:00              15:15 - 17:15               │
  │ ₹1,200 / person            ₹1,550 / person (+₹350)     │
  │                                                        │
  │ [ Reject Proposal ]  [ Manual Edit ]  [ Approve & Push ]│
  └────────────────────────────────────────────────────────┘
  ```

---

### Phase 9: Real-Time WebSocket Infrastructure
**Objective:** Instant, bi-directional synchronization between Operator and Traveler.

* **Rule:** Ensure all REST APIs work completely before enabling Socket.io.
* **Rooms:**
  * `tour:{tourId}` — Subscribed by Traveler and Assigned Field Coordinator.
  * `operator:{operatorId}` — Subscribed by Operator Dashboard sessions.
* **Standardized Event Matrix:**
  * `CHANGE_EVENT_DETECTED`: Disruption identified; status set to adapting.
  * `PROPOSAL_GENERATED`: Conflict resolver proposes resolution.
  * `OPERATOR_APPROVED` / `TRAVELER_ACCEPTED`: Decision committed to database.
  * `ITINERARY_UPDATED`: Full updated schedule pushed to traveler's pocket view.

---

### Phase 10: Lightweight Booking & Payment
**Objective:** Operational booking flow without getting bogged down in real GDS/OTA billing.

* **Checkout Route:** `client/app/(traveler)/book/[tourId]/page.tsx`
* **Flow:**
  * Review dynamic price breakdown (Lodging + Activities + Transport + Taxes).
  * Razorpay checkout modal (sandbox key) or Mock One-Click Payment.
  * On success:
    * `Booking` record created with status `CONFIRMED`.
    * Generates digital vouchers with QR code tokens.
    * Operator dashboard instantly increments confirmed booking count.

---

### Phase 11: Context-Aware In-App AI Assistant
**Objective:** Transform the slide-in chatbot into an active itinerary copilot rather than a generic text generator.

* **Component:** `components/AIChatbot.tsx`
* **Context Injection:** When the signed-in user opens the chat, the system prompt receives:
  * Current tour destination and dates.
  * Traveler's Travel DNA profile.
  * Active day schedule and current location.
* **Actionable Intent:**
  * Traveler: *"Can we swap tomorrow's museum for an outdoor garden tour?"*
  * Assistant: Invokes `recommendationEngine.js` for alternatives, calculates budget/timing difference, and renders an in-chat **"Apply to Itinerary"** button.

---

### Phase 12: Security, RBAC & API Protection
**Objective:** Protect backend endpoints, hide sensitive keys, and enforce role separation.

* **Key Management:**
  * Google Maps Server Key stored in backend `.env` (never exposed to browser).
  * Browser Google Maps Key restricted by HTTP referrer.
* **Role-Based Guards:**
  * `client/middleware.ts`: Redirects unauthorized travelers away from `/operator/*`.
  * `server/src/middleware/roleGuard.js`: Verifies Clerk JWT claims for operator endpoints.
* **Places API Field Masking:** Enforced on every backend Google Places call.

---

### Phase 13: Scope Discipline (Hackathon Triage)

| Priority Level | Components & Features | Action Plan |
| :--- | :--- | :--- |
| **MUST HAVE (Critical)** | Google Places, Geocoding, Routes, Weather, Travel DNA, Recommendation Engine, DAG Itinerary Builder, Conflict Resolver, Operator Dashboard, Dynamic Price Meter, Real-Time WebSocket updates. | Implement thoroughly and test deterministically. |
| **NICE TO HAVE (Secondary)** | Razorpay sandbox payment, In-app AI chatbot, PDF voucher download, dark mode toggle. | Implement with clean lightweight implementations. |
| **DON'T BUILD (Cut Scope)** | Full GDS flight booking, production banking escrow, native mobile apps, Kubernetes deployment, multi-region distributed databases. | Explicitly mock or defer to post-hackathon roadmap. |

---

## 📅 Day-by-Day Development Roadmap

| Day | Focus Area | Key Deliverables | Verification Step |
| :---: | :--- | :--- | :--- |
| **Day 1** | Foundation & Architecture | Monorepo directories, Clerk Auth, Prisma schema, `TourPreference` model. | `npx prisma db push` succeeds. |
| **Day 2** | Google Maps Gateway | `integrations/google/` suite (places, geocoding, routes, weather) & `googleMapsGateway.js`. | Unit test: `geocodeDestination("Paris")` returns normalized coordinates. |
| **Day 3** | Discovery & Personalization | `/discover` page, `/personalize` multi-step form, `buildTravelerProfile()` Travel DNA engine. | Test Travel DNA vector generation with edge inputs. |
| **Day 4** | Recommendation Engine | Candidate place filtering, interest scoring algorithm, Gemini explanation decorator. | Verify Top-3 recommendations match traveler interests. |
| **Day 5** | Initial Itinerary Engine | Day-by-day scheduler, transit calculation, slot dependency DAG creation. | Generate 3-day Paris itinerary with verified operating hours. |
| **Day 6** | Pricing & Traveler Trip View | Dynamic category budget meter, `/trip/[tourId]` interactive timeline. | Modifying a slot instantly updates total trip price. |
| **Day 7** | Dynamic Adaptation Engine | `conflictResolver.js`, DAG BFS cascade traversal, Scenario A (Weather) & B (Delay). | Injected rain trigger successfully substitutes outdoor activity. |
| **Day 8** | Operator Dashboard | `/operator/dashboard` and `/operator/tours/[tourId]` adaptation review screen. | Operator can review original vs. proposed alternative side-by-side. |
| **Day 9** | Real-Time WebSockets | Socket.io server and `useSocket.ts` client hook. Rooms for tour and operator. | Operator approval instantly updates traveler's screen without refresh. |
| **Day 10** | Contextual AI Assistant | Enhance `AIChatbot.tsx` with active tour context and swap proposal cards. | Chatbot suggests valid nearby alternative and offers swap button. |
| **Day 11** | Booking & Seed Polish | Razorpay sandbox integration, digital vouchers, robust seed data for Paris & Jaipur. | Complete end-to-end checkout with voucher generation. |
| **Day 12** | Demo Rehearsal & Hardening | Polish demo script, record fallback demo video, verify offline mock fallbacks. | Run complete 4-minute judge evaluation flow cleanly. |

---

## 🎬 The Ultimate Judge Presentation Demo Flow

The entire prototype will be demonstrated around one seamless, high-drama narrative:

```text
1. TRAVELER INITIATION (30 seconds)
   • Traveler signs in, selects "4-day Paris Journey", Budget: ₹70,000, Style: "Culture + Culinary", Pace: "Relaxed".
   • Clicks "Generate Plan" → Recommendation & Itinerary Engines construct a customized DAG itinerary.
   • Traveler swaps a museum for a culinary tasting → Budget meter automatically updates in real-time.
   • Traveler clicks "Confirm & Book" → Booking is registered.

2. OPERATOR VISIBILITY (30 seconds)
   • Switch to Operator Command Center (/operator/dashboard).
   • The newly booked tour appears instantly on the live timeline alongside other active tours.
   • Operator sees confirmed slots, assigned local coordinator, and margin metrics.

3. THE DISRUPTION EVENT (60 seconds — The "Wow" Moment)
   • Operator hits "Simulate Weather Alert" (Heavy rain detected at 15:00 in Paris on Day 2).
   • Roamly's Dynamic Adaptation Engine triggers:
     - Detects affected outdoor slot (Seine Walking Tour).
     - Traverses downstream DAG dependencies.
     - Evaluates 3 indoor alternatives via the multi-constraint penalty function.
     - Evaluates transit slack, opening hours, and price delta (+₹350).
   • Operator screen displays the side-by-side diff with Gemini's operational rationale.

4. THE REAL-TIME RESOLUTION (30 seconds)
   • Operator clicks "[Approve & Push Resolution]".
   • Instantly, via WebSockets, the Traveler screen (simulated on side-by-side browser window) pulses:
     "🌧️ Itinerary Updated: Due to heavy rain, your afternoon walk has been upgraded to Musee d'Orsay & VIP Tea Tasting. Your 19:30 dinner remains unaffected."
   • Map route and budget update in real-time without refreshing the page.

5. PITCH CONCLUSION (30 seconds)
   • Summarize thesis: "Traveler got complete personalization; Operator retained 100% operational control and resolved a crisis in two clicks."
```
