"use client"

import { SignedIn, SignedOut, UserButton, useUser, useClerk } from "@clerk/nextjs"
import { Sparkles, Menu, X, CalendarDays, Users, Plane, Compass, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

export function SiteNav() {
  const { openSignIn } = useClerk()
  const { user, isSignedIn } = useUser()
  const pathname = usePathname()
  const username = user?.firstName || user?.username || user?.fullName || "Traveler"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dbRole, setDbRole] = useState<string | null>(null)

  const closeMobile = () => setMobileOpen(false)

  // Fetch role for authenticated users to customize navigation
  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/auth/me")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.authenticated && data?.user?.role) {
            setDbRole(data.user.role)
          }
        })
        .catch(() => { })
    } else {
      setDbRole(null)
    }
  }, [isSignedIn])

  // Suppress navbar on auth and role selection pages to prevent duplicate headers
  if (
    pathname?.startsWith("/choose-role") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up")
  ) {
    return null
  }

  const isGuide = dbRole === "GUIDE"

  const navItems = isGuide
    ? [
        { href: "/guide-dashboard", label: "Guide Dashboard", icon: Compass },
        { href: "/guides", label: "Public Guides", icon: Users },
      ]
    : [
        { href: "/llm", label: "AI Travel Planner", icon: Plane },
        { href: "/trip-map", label: "Map", icon: MapPin },
        { href: "/mapcalendar", label: "My Schedule", icon: CalendarDays },
      ]

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#e5e7db]/60 bg-[#FAFBF8]/90 backdrop-blur-md">
        <div className="w-full flex h-16 items-center justify-between px-6 sm:px-10 lg:px-16">

          {/* Logo matching the reference image */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" onClick={closeMobile}>
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#3f520f] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Plane className="size-4.5 -rotate-45" />
            </span>
            <span className="text-xl font-bold tracking-tight text-[#1a1a1a] font-sans">
              Roamly
            </span>
          </Link>

          {/* Desktop Navigation Links matching the reference */}
          <nav className="hidden lg:flex items-center gap-8 xl:gap-10 text-[14px] font-medium text-[#2d3129]">
            {isGuide ? (
              <>
                <Link className="text-[#3f520f] font-semibold hover:text-[#32420b] transition-colors" href="/guide-dashboard">
                  Guide Dashboard
                </Link>
                <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/guides">
                  Guides Directory
                </Link>
              </>
            ) : (
              <>
                <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/llm">
                  Trips
                </Link>
                <Link className="hover:text-[#3f520f] transition-colors duration-150 flex items-center gap-1 font-semibold text-[#3f520f]" href="/trip-map">
                  <MapPin className="size-3.5" />
                  Map
                </Link>
                <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/guides">
                  Local Guides
                </Link>
                <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/#itinerary-widget">
                  Stays
                </Link>
                <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/mapcalendar">
                  My Schedule
                </Link>
              </>
            )}
          </nav>

          {/* Right side: Search button + Become a Guide + Auth */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Become a Guide CTA (for travelers or guests) */}
            {!isGuide && (
              <Link
                href="/guide-register"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#8E9C78]/50 bg-[#DFECC6]/50 hover:bg-[#DFECC6] text-[#38480e] transition-all duration-200"
              >
                <Compass className="size-3.5" />
                <span>Become a Guide</span>
              </Link>
            )}

            {/* Guide Portal Quick Link if user is already a Guide */}
            {isGuide && (
              <Link
                href="/guide-dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#3f520f] text-white hover:bg-[#32420b] transition-all duration-200 shadow-xs"
              >
                <Compass className="size-3.5" />
                <span>Guide Portal</span>
              </Link>
            )}

            {/* Auth Buttons: Sign In opens role selection page */}
            <SignedOut>
              <Link href="/choose-role">
                <Button
                  className="h-10 rounded-full px-6 text-sm font-semibold bg-[#3f520f] hover:bg-[#32420b] text-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  Sign In
                </Button>
              </Link>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center gap-2.5">
                <UserButton />
                <span className="hidden sm:inline-block text-sm font-medium text-foreground">
                  Hello, <span className="font-semibold text-[#3f520f]">{username}</span>
                  {isGuide && (
                    <span className="ml-1.5 text-[10px] uppercase font-bold tracking-wide bg-[#DFECC6] text-[#38480e] px-2 py-0.5 rounded-full">
                      Guide
                    </span>
                  )}
                </span>
              </div>
            </SignedIn>

            {/* Hamburger for mobile */}
            <button
              className="lg:hidden flex items-center justify-center size-9 rounded-lg hover:bg-[#e5e7db]/60 text-foreground transition-colors duration-200"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-5 text-foreground" /> : <Menu className="size-5 text-foreground" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu (Top) */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? "max-h-96 opacity-100 border-t border-[#e5e7db]/80" : "max-h-0 opacity-0"
            }`}
        >
          <div className="bg-background/95 backdrop-blur-xl px-4 py-3 flex flex-col gap-1 border-b border-[#e5e7db]/80">
            {/* Guide Register quick link on mobile */}
            <Link
              href="/guide-register"
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg text-xs font-semibold text-[#38480e] bg-[#DFECC6]/60 border border-[#8E9C78]/40"
            >
              <Compass className="size-4 text-[#38480e]" />
              Become a Verified Guide
            </Link>

            {/* Signed-in mobile top links */}
            <SignedIn>
              {navItems.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? "text-[#485C11] bg-[#485C11]/10 font-semibold"
                      : "text-muted-foreground hover:text-[#485C11] hover:bg-[#e5e7db]/40"
                      }`}
                  >
                    <Icon className={`size-5 ${isActive ? "text-[#485C11]" : "text-[#485C11]/70"}`} />
                    {item.label}
                  </Link>
                )
              })}
            </SignedIn>

            {/* Signed-out mobile links */}
            <SignedOut>
              <Link href="/llm" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Trips</Link>
              <Link href="/trip-map" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-[#3f520f] font-semibold hover:bg-[#e5e7db]/40 transition-all duration-200">Map</Link>
              <Link href="/guides" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Local Guides</Link>
              <Link href="/#itinerary-widget" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Preview</Link>
              <Link href="/#comparison" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Why Roamly</Link>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* Overlay for top dropdown */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-black/20 backdrop-blur-xs"
          onClick={closeMobile}
        />
      )}

      {/* Mobile Bottom Dock / Navbar (signed-in only) */}
      <SignedIn>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-[#e5e7db] px-2 py-2 shadow-lg">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${isActive
                    ? "text-[#485C11] font-semibold bg-[#485C11]/10"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Icon className={`size-5 ${isActive ? "text-[#485C11]" : ""}`} />
                  <span className="text-[11px] leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </SignedIn>
    </>
  )
}
