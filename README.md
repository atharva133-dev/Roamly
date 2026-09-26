<div align="center">
  <h1>🌍 Roamly (TourPlatform)</h1>
  <p><strong>A Unified, Dynamically-Managed Tourism Ecosystem for Travelers & Tour Operators</strong></p>
  <p><em>"Moving tourism from fixed-package to personalized + dynamically managed, while giving operators the same operational control they'd have with fixed packages, not less."</em></p>
</div>

<hr />

## 📑 System Documentation Links
* 🏛️ **[Detailed Architecture Specification](docs/architecture.md)** (Full system topology, DAG dependency model, conflict resolution algorithm, schema ERD, and WebSocket protocol)
* 📐 **Root Mirror:** [architecture.md](architecture.md)

---

## 💡 The Core Thesis & Vision

Traditional travel forces a compromise:
* **Fixed Packages:** Give operators high control, bulk rates, and logistical predictability, but offer travelers zero personalization.
* **Independent Travel:** Gives travelers flexibility, but fragments bookings and leaves operators with zero operational control when things go wrong.

**Roamly bridges this gap:** A single platform where travelers build hyper-personalized trips with dynamic pricing and AI assistance, while tour operators maintain omniscient command, automated disruption recovery, and live inventory control.

---

## 🗂️ Platform Monorepo Architecture (`tour-platform/`)

The platform is designed as a clean, cohesive architecture separating presentation, core engine services, shared data contracts, and external gateways:

```text
tour-platform/
├── client/                          # Next.js 15 App (Unified Traveler & Operator UI)
│   ├── app/
│   │   ├── (traveler)/              # Traveler Experience Routes
│   │   │   ├── discover/page.tsx    # Destination exploration & inspiration
│   │   │   ├── personalize/page.tsx # Preference Quiz & Travel DNA builder
│   │   │   ├── plan/[tourId]/page.tsx   # Interactive modular day-by-day builder
│   │   │   ├── price/[tourId]/page.tsx  # Dynamic pricing & live budget breakdown
│   │   │   ├── book/[tourId]/page.tsx   # Multi-vendor checkout & payment
│   │   │   ├── trip/[tourId]/page.tsx   # "My complete travel plan" (In-journey)
│   │   │   └── layout.tsx           # Traveler shell with navigation & AI FAB
│   │   ├── (operator)/              # Operator Command Center Routes
│   │   │   ├── dashboard/page.tsx   # Multi-tour command center & KPI cockpit
│   │   │   ├── bookings/page.tsx    # Real-time bookings & lifecycle pipeline
│   │   │   ├── vendors/page.tsx     # Hotel, transport & activity vendor directory
│   │   │   ├── tours/[tourId]/page.tsx  # Live tour instance & change event audit
│   │   │   ├── schedules/page.tsx   # Multi-tour calendar & resource timeline
│   │   │   └── layout.tsx           # Operator ops shell & live alert banner
│   │   ├── (auth)/                  # Clerk Managed Auth
│   │   │   ├── sign-in/page.tsx
│   │   │   └── sign-up/page.tsx
│   │   ├── api/                     # Next.js Edge/BFF Route Handlers
│   │   └── layout.tsx               # Root layout, ClerkProvider, Theme, Fonts
│   ├── components/
│   │   ├── traveler/                # Traveler UX Components
│   │   │   ├── PreferenceForm.tsx       # Multi-step preference capture
│   │   │   ├── ItineraryDayCard.tsx     # Expandable day timeline card
│   │   │   ├── ComponentSwapModal.tsx   # Alternative comparator with trade-offs
│   │   │   ├── CostBreakdown.tsx        # Real-time category budget meter
│   │   │   └── MapView.tsx              # Interactive Mapbox/Google Maps overlay
│   │   ├── operator/                # Operator Ops Components
│   │   │   ├── LiveBookingsTable.tsx    # Filterable booking status table
│   │   │   ├── VendorStatusPanel.tsx    # Vendor availability & health monitor
│   │   │   ├── ChangeEventFeed.tsx      # Real-time WebSocket disruption feed
│   │   │   └── TourGroupOverview.tsx    # Group rosters & coordinator allocations
│   │   └── shared/
│   │       ├── Navbar.tsx               # Context-aware navigation bar
│   │       ├── AIChatbot.tsx            # Slide-in AI travel assistant
│   │       └── ui/                      # Primitive Shadcn/Radix UI components
│   ├── hooks/
│   │   ├── useSocket.ts             # Socket.io real-time subscription hook
│   │   ├── useItinerary.ts          # Itinerary state store & mutation methods
│   │   └── useAuth.ts               # Clerk session & RBAC role hook
│   ├── lib/
│   │   ├── api.ts                   # Axios client with interceptors
│   │   ├── clerk.ts                 # Clerk SDK configuration
│   │   └── mapsClient.ts            # Client-side Google Maps / Mapbox loader
│   ├── middleware.ts                # Edge auth & role-based routing guard
│   └── package.json
│
├── server/                          # Node.js / Express Core Operational Backend
│   ├── src/
│   │   ├── models/                  # Domain Data Models (Prisma / Mongoose)
│   │   │   ├── Traveler.js          # User profile, Travel DNA, history
│   │   │   ├── TourOperator.js      # Operator organization, staff, settings
│   │   │   ├── Vendor.js            # Hotel, transport, activity provider specs
│   │   │   ├── Tour.js              # Instantiated customized tour document
│   │   │   ├── DayPlan.js           # Daily sequence container
│   │   │   ├── Slot.js              # Granular atomic activity/lodging slot
│   │   │   ├── ChangeEvent.js       # The immutable adaptation audit log
│   │   │   ├── Booking.js           # Reservation, status, vouchers, invoices
│   │   │   └── Coordinator.js       # Ground field coordinator profiles
│   │   ├── routes/                  # Express RESTful API Endpoints
│   │   │   ├── traveler.routes.js   # Preference ingestion, profile updates
│   │   │   ├── operator.routes.js   # Admin analytics, assignments, overrides
│   │   │   ├── itinerary.routes.js  # Plan generation, slot swapping, rebuilds
│   │   │   ├── booking.routes.js    # Checkout, deposits, cancellation flows
│   │   │   ├── vendor.routes.js     # Vendor rates, capacity, contracts
│   │   │   └── webhook.routes.js    # External event webhooks (weather, payments)
│   │   ├── controllers/
│   │   ├── services/                # Core Business & Optimization Engines
│   │   │   ├── itineraryEngine.js   # Baseline day-wise construction algorithm
│   │   │   ├── conflictResolver.js  # Re-optimization engine & heuristic scorer
│   │   │   ├── dependencyGraph.js   # Directed Acyclic Graph (DAG) dependency solver
│   │   │   ├── operatorSync.js      # WebSocket broadcast & room dispatcher
│   │   │   ├── pricingService.js    # Real-time multi-currency & markup engine
│   │   │   └── explanationService.js# LLM rationale generator for itinerary changes
│   │   ├── integrations/            # External API Gateway Adapters
│   │   │   ├── googlePlaces.js      # POI lookup, reviews, geometry, photos
│   │   │   ├── googleDistanceMatrix.js # Transit duration & traffic matrices
│   │   │   ├── googleDirections.js  # Step-by-step route geometry
│   │   │   ├── weatherApi.js        # Meteorological forecast & disruption alerts
│   │   │   ├── amadeus.js           # Global Distribution System (GDS) flights/stays
│   │   │   ├── llmClient.js         # Gemini 1.5 Pro / Flash & Claude 3.5 adapters
│   │   │   ├── razorpay.js          # Payment capture, split escrow, refunds
│   │   │   └── firebaseMessaging.js # Mobile/Web push notification gateway
│   │   ├── sockets/
│   │   │   ├── socketServer.js      # Socket.io lifecycle, authentication & rooms
│   │   │   └── events.js            # Standardized event constant dictionary
│   │   ├── middleware/              # clerkAuth.js, roleGuard.js, errorHandler.js
│   │   ├── config/                  # Database & environment validation
│   │   └── app.js                   # Express application bootstrap
│   ├── seed/                        # Seed data for vendors, tours, and coordinators
│   ├── server.js                    # HTTP + WebSocket server entrypoint
│   └── package.json
│
├── shared/                          # Cross-Platform Contracts
│   ├── types/                       # tour.types.ts, changeEvent.types.ts
│   └── constants/                   # lifecycleStages.ts (11 canonical stages)
│
├── docs/
│   ├── architecture.md              # Complete system architecture specification
│   ├── api-reference.md             # REST & WebSocket API specification
│   └── demo-script.md               # Evaluator live demonstration runbook
│
├── .env.example
└── README.md
```

---

## 🔄 The 11 Canonical Lifecycle Stages

| # | Stage | Traveler Experience | Operator Management |
| :--- | :--- | :--- | :--- |
| 1 | **Discover** | Explore curated destinations, seasonal insights, visual cards | Regional demand heatmaps, inquiry analytics |
| 2 | **Personalize** | Travel DNA quiz, budget, accommodation, and pace preferences | Demographic segmentation, traveler preference profile |
| 3 | **Plan** | Modular day-by-day itinerary builder, activity swaps | Unconfirmed pipeline oversight, availability holds |
| 4 | **Price** | Real-time budget meter, dynamic INR pricing, alternative diffs | Rate card markup, margin protection rules |
| 5 | **Book** | Unified multi-vendor checkout via Razorpay/Stripe | Escrow fund allocation, automated vendor vouchers |
| 6 | **Prepare** | Digital document vault, automated packing list, flight alerts | Field coordinator assignment, vendor re-confirmations |
| 7 | **Operate** | Live day-schedule with offline-ready vouchers & map routes | Multi-tour Gantt timeline, live group rosters |
| 8 | **Assist** | In-app Gemini AI Travel Assistant for local questions & needs | Escalation inbox when AI detects customer friction |
| 9 | **Adapt** | Transparent disruption notices with auto-rescheduled slots | ChangeEvent feed, impact blast-radius visualizer, override controls |
| 10| **Complete**| Post-trip digital scrapbook, spend summary, receipt exports | Financial settlement, automated vendor payouts |
| 11| **Review** | Component-level ratings for hotels, guides, and activities | Vendor SLA benchmarking, operator CSAT tracking |

---

## ⚡ Dynamic Management Engine (The Core Differentiator)

When unexpected events occur (weather, delays, vendor cancellations, preference updates), Roamly doesn't ask humans to manually re-stitch schedules:
1. **DAG Representation:** Itinerary is modeled as a Directed Acyclic Graph $G=(V,E)$ linking activities, transit times, and lodging constraints.
2. **Impact Radius:** Breadth-first traversal identifies invalid downstream slots and available slack.
3. **Multi-Constraint Scoring:** Candidate vendor alternatives are ranked across cost delta ($\Delta C$), timing deviation ($\Delta T$), transit distance ($D_{transit}$), traveler preference affinity ($P_{match}$), and vendor reliability ($\Omega_{vendor}$).
4. **LLM Explainability:** Gemini/Claude generates transparent, human-readable rationales explaining *why* the change happened and *what* was done to preserve the trip's essence.
5. **Real-Time Push:** Operator dashboard and traveler screen synchronize instantly via WebSocket events.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** >= 18.x
* **PostgreSQL** or **MongoDB** database instance
* **Redis** (optional for background workers and caching)
* **Clerk API Keys** (Authentication)
* **Gemini API Key** (LLM services)

### Quick Setup
```bash
# 1. Clone repository
git clone https://github.com/atharva133-dev/Roamly.git
cd Roamly

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# 4. Initialize Database Schema
npx prisma db push

# 5. Run Next.js Development Server
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## 🛡️ License & Attributions
Engineered by the Roamly Team. All rights reserved.
For full technical specifications, refer to [docs/architecture.md](docs/architecture.md).
