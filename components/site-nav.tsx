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
      <header className="sticky top-0 z-40 border-b border-[#e5e7db]/80 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold group shrink-0" onClick={closeMobile}>
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#485C11] to-[#6B7F3A] shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <Sparkles className="size-4 text-white" />
            </span>
            <span className="tracking-tight text-foreground">Roamly</span>
          </Link>

          {/* Desktop — Signed-out navigation */}
          <SignedOut>
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium">
              <Link className="text-muted-foreground hover:text-foreground transition-colors duration-300" href="#benefits">Benefits</Link>
              <Link className="text-muted-foreground hover:text-foreground transition-colors duration-300" href="#specs">Specifications</Link>
              <Link className="text-muted-foreground hover:text-foreground transition-colors duration-300" href="#howto">How-to</Link>
              <Link className="text-muted-foreground hover:text-foreground transition-colors duration-300" href="#contact">Contact Us</Link>
            </nav>
          </SignedOut>

          {/* Desktop — Signed-in navigation */}
          <SignedIn>
            <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium">
              {navItems.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "text-[#485C11] bg-[#485C11]/10 font-semibold"
                        : "text-muted-foreground hover:text-[#485C11] hover:bg-[#e5e7db]/40"
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? "text-[#485C11]" : ""}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </SignedIn>

          {/* Right side: auth + hamburger */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Auth buttons (always visible) */}
            <SignedOut>
              <Button
                className="h-9 rounded-full px-5 text-sm font-semibold bg-[#485C11] hover:bg-[#3a4d0d] text-white shadow-sm hover:shadow-md transition-all duration-300"
                onClick={() => openSignIn({ afterSignInUrl: `${window.location.origin}/auth-redirect` })}
              >
                Login
              </Button>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center gap-2.5">
                <UserButton />
                <span className="hidden sm:inline-block text-sm font-medium text-foreground">
                  Hello, <span className="font-semibold text-[#485C11]">{username}</span>
                </span>
              </div>
            </SignedIn>

            {/* Hamburger — mobile toggle */}
            <button
              className="md:hidden flex items-center justify-center size-9 rounded-lg hover:bg-[#e5e7db]/60 transition-colors duration-200"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-5 text-foreground" /> : <Menu className="size-5 text-foreground" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu (Top) */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? "max-h-96 opacity-100 border-t border-[#e5e7db]/80" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-background/95 backdrop-blur-xl px-4 py-3 flex flex-col gap-1">

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
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
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
              <Link href="#benefits" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Benefits</Link>
              <Link href="#specs" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Specifications</Link>
              <Link href="#howto" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">How-to</Link>
              <Link href="#contact" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[#e5e7db]/40 transition-all duration-200">Contact Us</Link>
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
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                    isActive
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
