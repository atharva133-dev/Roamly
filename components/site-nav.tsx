"use client"

import { SignedIn, SignedOut, UserButton, useUser, useClerk } from "@clerk/nextjs"
import { Sparkles, Menu, X, CalendarDays, Users, Plane } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

export function SiteNav() {
  const { openSignIn } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()
  const username = user?.firstName || user?.username || user?.fullName || "Traveler"
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  const navItems = [
    { href: "/llm", label: "AI Travel Planner", icon: Plane },
    { href: "/mapcalendar", label: "My Schedule", icon: CalendarDays },
    { href: "/community", label: "View Community", icon: Users },
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
            <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/#destinations">
              Destinations
            </Link>
            <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/llm">
              Trips
            </Link>
            <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/#itinerary-widget">
              Stays
            </Link>
            <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/mapcalendar">
              Travel Tools
            </Link>
            <Link className="hover:text-[#3f520f] transition-colors duration-150" href="/community">
              Community
            </Link>
          </nav>

          {/* Right side: Search button + Auth */}
          <div className="flex items-center gap-3.5 shrink-0">
            {/* Circular Search Icon Button */}
            <button
              type="button"
              aria-label="Search"
              className="flex size-9 items-center justify-center rounded-full border border-[#d6dacb] bg-white text-[#4a5043] hover:text-[#1a1a1a] hover:border-[#3f520f] hover:bg-[#DFECC6]/30 transition-all duration-200 cursor-pointer shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>

            {/* Auth Buttons */}
            <SignedOut>
              <Button
                className="h-10 rounded-full px-6 text-sm font-semibold bg-[#3f520f] hover:bg-[#32420b] text-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => openSignIn({ afterSignInUrl: `${window.location.origin}/auth-redirect` })}
              >
                Sign In
              </Button>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center gap-2.5">
                <UserButton />
                <span className="hidden sm:inline-block text-sm font-medium text-foreground">
                  Hello, <span className="font-semibold text-[#3f520f]">{username}</span>
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
              <Link href="/#destinations" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Destinations</Link>
              <Link href="/#itinerary-widget" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Preview</Link>
              <Link href="/#comparison" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Why Roamly</Link>
              <Link href="/community" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Community</Link>
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
