import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/about",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/guides(.*)",
  "/guide-register(.*)",
  "/llm(.*)",
  "/mapcalendar(.*)",
  "/trip-map(.*)",
  "/stays(.*)",
  "/api/stays(.*)",
  "/api/public(.*)",
  "/api/locations(.*)",
  "/api/location(.*)",
  "/api/guides(.*)",
  "/api/guide-requests(.*)",
  "/api/places(.*)",
  "/api/routes(.*)",
  "/api/webhooks(.*)",
  "/auth-redirect(.*)",
  "/verify-guide(.*)",
  "/choose-role(.*)",
  "/login(.*)",
  "/api/auth/me(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!isPublicRoute(req) && !userId) {
    // API routes must get a JSON 401, never an HTML redirect — a fetch()
    // caller can't follow a redirect into a sign-in page and still parse
    // the response as JSON (this was causing "Unexpected token '<' ...
    // is not valid JSON" on protected endpoints like /api/itinerary/plan).
    if (req.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    // Redirect unauthenticated users to Clerk sign-in page
    const signInUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};