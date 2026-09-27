# Roamly — Technology Stack

**Version:** 2.0  
**Last Updated:** September 2026  
**Architecture:** Full-Stack Monorepo (Next.js App Router)

---

## Overview

Roamly is a unified B2C & B2B dynamic travel management platform built as a **Next.js full-stack monorepo**. The frontend, backend API routes, and background workers all live within a single codebase, leveraging Next.js App Router for server-side rendering, API route handlers, and edge middleware.

---

## 1. Frontend

| Technology | Version | Purpose |
|:---|:---|:---|
| **Next.js** | 15.4.x | React meta-framework — App Router, SSR, API routes, edge middleware, Turbopack dev server |
| **React** | 19.1.0 | UI library — component architecture, hooks, Suspense |
| **TypeScript** | 5.x | Static type-checking across the entire codebase |
| **Tailwind CSS** | 4.x | Utility-first CSS framework for rapid UI styling |
| **Radix UI** | Latest | Headless, accessible primitive components (Dialog, Select, Tabs, Accordion, Dropdown, Tooltip, etc.) |
| **shadcn/ui** | — | Pre-built component library on top of Radix UI + Tailwind (47 components) |
| **Lucide React** | 0.539.x | Icon library used across all UI surfaces |
| **Motion (Framer Motion)** | 12.x | Animation library for page transitions, micro-interactions, and dynamic UI |
| **Recharts** | 2.15.x | Charting library for admin dashboards and analytics visualizations |
| **Leaflet + React Leaflet** | 1.9.x / 5.0.x | Interactive map rendering for location views and guide profiles |
| **COBE** | 0.6.x | 3D rotating globe visualization on the landing page |
| **Embla Carousel** | 8.6.x | Lightweight carousel/slider component |
| **cmdk** | 1.1.x | Command palette component (⌘K search) |
| **Rough Notation** | 0.5.x | Animated hand-drawn annotation effects |
| **Sonner** | 2.0.x | Toast notification system |
| **Vaul** | 1.1.x | Drawer/bottom-sheet component |
| **React Day Picker** | 9.8.x | Date picker component for calendar inputs |
| **React Hook Form + Zod** | 7.62.x / 4.0.x | Form state management with schema-based validation |
| **next-themes** | 0.4.x | Dark/light mode theme management |
| **jsPDF** | 4.2.x | Client-side PDF generation for itinerary exports |

### Fonts

| Font | Source | Usage |
|:---|:---|:---|
| **Inter** | Google Fonts | Primary sans-serif (`--font-geist-sans`) |
| **Roboto Mono** | Google Fonts | Monospace font (`--font-geist-mono`) |

---

## 2. Backend (Next.js API Routes)

| Technology | Version | Purpose |
|:---|:---|:---|
| **Next.js API Route Handlers** | 15.4.x | RESTful API endpoints under `app/api/` — serverless-compatible |
| **Prisma ORM** | 6.13.x | Type-safe database client, schema management, migrations |
| **PostgreSQL** | — | Primary relational database (all domain models) |
| **Redis (ioredis)** | 5.7.x | Caching, Pub/Sub, session state (with in-memory fallback) |
| **BullMQ** | 5.56.x | Background job queue for long-running tasks (itinerary generation) |
| **tsx** | 4.20.x | TypeScript execution for worker scripts and CLI tools |

---

## 3. Authentication & Authorization

| Technology | Purpose |
|:---|:---|
| **Clerk** (`@clerk/nextjs` v6.30.x) | Identity provider — Google OAuth, session management, JWT tokens |
| **Clerk SDK Node** (`@clerk/clerk-sdk-node` v4.13.x) | Server-side user management and webhook verification |
| **Clerk Edge Middleware** | Route-level auth guard with RBAC role matching |
| **Svix** (v1.71.x) | Webhook signature verification for Clerk webhook events |

### User Roles (RBAC)

| Role | Description |
|:---|:---|
| `USER` | Default traveler — plans trips, books guides |
| `GUIDE` | Verified local guide — manages profile, receives booking requests |
| `SUPER_ADMIN` | Platform administrator — manages guides, locations, system config |

---

## 4. AI & Machine Learning

| Technology | Purpose |
|:---|:---|
| **Google Generative AI** (`@google/generative-ai` v0.24.x) | Gemini model — AI-powered itinerary generation and travel planning |
| **Google GenAI SDK** (`@google/genai` v1.13.x) | Newer Google AI client library |
| **Google AI Generative Language** (`@google-ai/generativelanguage` v3.3.x) | Low-level Generative Language API access |

### AI Features

- **Itinerary Generation** — AI creates personalized day-by-day travel plans based on preferences, budget, and duration
- **AI Chatbot** — In-app conversational travel assistant (slide-in panel, available on every page)
- **LLM Explainability** — Natural-language rationale for itinerary changes and conflict resolution

---

## 5. External APIs & Integrations

| Service | API Key Env Variable | Purpose |
|:---|:---|:---|
| **Google Maps Platform** | `GOOGLE_MAPS_SERVER_API_KEY` | Places autocomplete, place details, geocoding, geolocation |
| **Google Places API (New)** | — | Location search for guide registration, destination discovery |
| **Clerk** | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Authentication, OAuth, user management |
| **Unsplash** | — | Remote image hosting (configured in `next.config.ts`) |

---

## 6. Database Schema

| Model | Table | Purpose |
|:---|:---|:---|
| `User` | `users` | Core user account (Clerk-linked, role-based) |
| `UserProfile` | `user_profiles` | Traveler preferences — travel style, budget, interests, dietary needs |
| `GuideProfile` | `guide_profiles` | Guide details — bio, languages, expertise, rates, availability |
| `Location` | `locations` | Google Places-linked locations with geocoordinates |
| `GuideLocation` | `guide_locations` | Many-to-many: guides ↔ operating locations |
| `GuideRequest` | `guide_requests` | Booking requests between travelers and guides |
| `City` | `city` | City catalog with descriptions and images |
| `Trip` | `trips` | User-created trip itineraries |
| `Stop` | `stops` | Ordered stops within a trip (linked to cities and locations) |
| `Budget` | `budgets` | Per-category budget breakdown (transport, food, hotel, activities) |
| `Activity` | `activities` | Activity catalog per city |
| `StopActivity` | `stop_activities` | Many-to-many: stops ↔ activities |
| `Review` | `reviews` | User reviews for completed trips |
| `Admin` | `admin` | Admin accounts for platform management |

---

## 7. DevOps & Tooling

| Tool | Purpose |
|:---|:---|
| **Turbopack** | Next.js dev server bundler (enabled via `next dev --turbopack`) |
| **ESLint** | Code linting with `eslint-config-next` |
| **TypeScript** (strict mode) | Static analysis and type safety |
| **Prisma CLI** | Database migrations, schema validation, client generation |
| **PostCSS** (`@tailwindcss/postcss`) | CSS processing pipeline for Tailwind |
| **tw-animate-css** | Tailwind animation utilities |

---

## 8. Infrastructure

```
┌─────────────────────────────────────────────┐
│               Client Browser                │
│         (React 19 + Next.js SSR)            │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────┐
│           Next.js App Router                │
│   ┌──────────────┬──────────────────┐       │
│   │  Pages (SSR)  │  API Routes     │       │
│   │  /guides      │  /api/guides/*  │       │
│   │  /llm         │  /api/chat      │       │
│   │  /guide-reg   │  /api/places/*  │       │
│   └──────────────┴──────────────────┘       │
│              Edge Middleware                 │
│         (Clerk Auth + RBAC Guard)           │
└──────┬──────────┬──────────┬────────────────┘
       │          │          │
┌──────▼───┐ ┌────▼────┐ ┌──▼──────────────┐
│PostgreSQL│ │  Redis  │ │  External APIs  │
│ (Prisma) │ │(ioredis)│ │ Google Maps     │
│          │ │ BullMQ  │ │ Gemini AI       │
│          │ │         │ │ Clerk           │
└──────────┘ └─────────┘ └─────────────────┘
```

---

## 9. Key Dependencies Summary

### Production Dependencies (30+)

```
next@15.4.10          react@19.1.0          typescript@5.x
@clerk/nextjs@6.30    @prisma/client@6.13   ioredis@5.7
bullmq@5.56           @google/generative-ai  leaflet@1.9
react-leaflet@5.0     recharts@2.15         motion@12.23
lucide-react@0.539    zod@4.0               jspdf@4.2
sonner@2.0            tailwind-merge@3.3    react-hook-form@7.62
```

### Dev Dependencies

```
prisma@6.13           tailwindcss@4.x       tsx@4.20
eslint@9.x            @types/react@19       @types/node@20
```

---

## 10. Environment Variables

| Variable | Service | Required |
|:---|:---|:---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | ✅ |
| `CLERK_SECRET_KEY` | Clerk server key | ✅ |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Google Generative AI | ✅ |
| `GOOGLE_MAPS_SERVER_API_KEY` | Google Maps Platform | ✅ |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection | Optional (in-memory fallback) |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook verification | Optional |
| `NEXT_PUBLIC_APP_URL` | Application base URL | Optional |
