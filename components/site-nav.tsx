"use client"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useClerk } from "@clerk/nextjs"
import Link from "next/link"

export function SiteNav() {
  const { openSignIn } = useClerk()
  return (
    <header className="sticky top-0 z-30 border-b border-[#e5e7db]/80 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold group">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#485C11] to-[#6B7F3A] shadow-sm group-hover:shadow-md transition-shadow duration-300">
            <Sparkles className="size-4 text-white" />
          </span>
          <span className="tracking-tight">Roamly</span>
        </Link>

        {/* Signed-out navigation */}
        <SignedOut>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link className="text-muted-foreground hover:text-foreground transition-colors duration-300" href="#benefits">Benefits</Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors duration-300" href="#specs">Specifications</Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors duration-300" href="#howto">How-to</Link>
            <Link className="text-muted-foreground hover:text-foreground transition-colors duration-300" href="#contact">Contact Us</Link>
          </nav>
        </SignedOut>

        {/* Signed-in navigation */}
        <SignedIn>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link className="text-muted-foreground hover:text-[#485C11] transition-colors duration-300" href="/llm">AI Travel Planner</Link>
            <Link className="text-muted-foreground hover:text-[#485C11] transition-colors duration-300" href="/mapcalendar">My Schedule</Link>
            <Link className="text-muted-foreground hover:text-[#485C11] transition-colors duration-300" href="/community">View Community</Link>
          </nav>
        </SignedIn>

        {/* Auth buttons */}
        <div className="flex items-center justify-end">
          <SignedOut>
            <Button
              className="h-10 rounded-full px-6 font-semibold bg-[#485C11] hover:bg-[#3a4d0d] shadow-sm hover:shadow-md transition-all duration-300"
              onClick={() => openSignIn({ redirectUrl: `${window.location.origin}/auth-redirect` })}
            >
              Login
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton></UserButton>
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
