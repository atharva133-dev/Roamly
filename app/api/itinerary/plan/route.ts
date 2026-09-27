import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole, VerificationStatus, AvailabilityStatus } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { planItinerary } from "@/server/src/agents/agentRouter.js";

const VALID_PACES = ["RELAXED", "MODERATE", "FAST"];
const VALID_GUIDE_PREFERENCES = ["NO_GUIDE", "NEED_GUIDE", "CHOOSE_GUIDE"];
const VALID_TRANSPORT_MODES = ["TRAIN", "PUBLIC_TRANSIT", "CAB", "WALKING"];

interface ItineraryPlanRequestBody {
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
  selectedGuideId?: string | null;
}

function validateRequest(body: Partial<ItineraryPlanRequestBody>): string[] {
  const errors: string[] = [];

  if (!Array.isArray(body.destinations) || body.destinations.length === 0) {
    errors.push("destinations must be a non-empty array of strings");
  }

  const start = body.startDate ? new Date(body.startDate) : null;
  const end = body.endDate ? new Date(body.endDate) : null;

  if (!start || Number.isNaN(start.getTime())) errors.push("startDate is missing or invalid");
  if (!end || Number.isNaN(end.getTime())) errors.push("endDate is missing or invalid");
  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end.getTime() < start.getTime()) {
    errors.push("endDate must not be before startDate");
  }

  if (!Number.isFinite(body.travelerCount) || (body.travelerCount as number) < 1) {
    errors.push("travelerCount must be a number >= 1");
  }

  if (!Number.isFinite(body.totalBudget) || (body.totalBudget as number) <= 0) {
    errors.push("totalBudget must be a positive number");
  }

  if (body.pace && !VALID_PACES.includes(body.pace)) {
    errors.push(`pace must be one of ${VALID_PACES.join(", ")}`);
  }

  if (body.guidePreference && !VALID_GUIDE_PREFERENCES.includes(body.guidePreference)) {
    errors.push(`guidePreference must be one of ${VALID_GUIDE_PREFERENCES.join(", ")}`);
  }

  if (body.transportationPreference && !VALID_TRANSPORT_MODES.includes(body.transportationPreference)) {
    errors.push(`transportationPreference must be one of ${VALID_TRANSPORT_MODES.join(", ")}`);
  }

  return errors;
}

/**
 * POST /api/itinerary/plan
 *
 * Protected endpoint — the workflow persists a Trip linked to the
 * authenticated user, so it deliberately is NOT in middleware.ts's public
 * route whitelist (see docs/Roamly_Grounded_Agent_Router_Fixed_Plan.md §0.3).
 */
export async function POST(req: Request) {
  // Use the resolved Prisma User.user_id (via getAuthenticatedUser), NOT the
  // raw Clerk session id.
  const authContext = await getAuthenticatedUser();
  if (!authContext) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }

  // RBAC: Guides cannot generate or plan traveler trips (TEST 14/15)
  if (authContext.role === UserRole.GUIDE) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Forbidden: Guides cannot plan traveler trips.",
          currentRole: authContext.role,
        },
      },
      { status: 403 }
    );
  }

  let body: Partial<ItineraryPlanRequestBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST", message: "Request body must be valid JSON" } }, { status: 400 });
  }

  const validationErrors = validateRequest(body);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "Request validation failed", details: validationErrors } },
      { status: 400 }
    );
  }

  // Validate selected guide if specified
  if (body.selectedGuideId) {
    const selectedGuide = await prisma.guideProfile.findUnique({
      where: { id: body.selectedGuideId },
      include: { user: true },
    });
    if (!selectedGuide || selectedGuide.user?.role !== UserRole.GUIDE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_GUIDE_SELECTION",
            message: "Selected guide does not exist or is inactive",
          },
        },
        { status: 400 }
      );
    }
    if (selectedGuide.verification_status !== VerificationStatus.VERIFIED) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GUIDE_UNVERIFIED",
            message: "Selected guide is not verified",
          },
        },
        { status: 400 }
      );
    }
    if (selectedGuide.availability_status !== AvailabilityStatus.AVAILABLE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GUIDE_UNAVAILABLE",
            message: `Selected guide is currently not available (${selectedGuide.availability_status})`,
          },
        },
        { status: 400 }
      );
    }
  }

  const tripRequest = {
    destinations: body.destinations,
    startDate: body.startDate,
    endDate: body.endDate,
    travelerCount: body.travelerCount,
    totalBudget: body.totalBudget,
    currency: "INR",
    accommodationPreference: body.accommodationPreference || "Hotel",
    transportationPreference: body.transportationPreference || "CAB",
    interests: body.interests || [],
    travelStyle: body.travelStyle || "Cultural",
    pace: body.pace || "MODERATE",
    guidePreference: body.guidePreference || "NO_GUIDE",
    selectedGuideId: body.selectedGuideId || null
  };

  try {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const result = await planItinerary({ requestId, user: { id: authContext.userId, role: authContext.role }, tripRequest });

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/itinerary/plan] Unhandled router error:", message);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
