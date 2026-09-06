"use client"

import Image from "next/image"
import { Highlighter } from "@/components/magicui/highlighter";
import Link from "next/link"
import { RotatingGlobe } from "@/components/RotatingGlobe";
import { Smartphone, Earth, IndianRupee, Shield, Sparkles, Check, X, ArrowRight, MapPin, Plane, LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useRef, useEffect, FC } from 'react';


// A custom hook to detect if an element is in the viewport
function useInView<T extends HTMLElement = HTMLDivElement>(options: IntersectionObserverInit = {}) {
  const [inView, setInView] = useState<boolean>(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [options, ref]);

  return [ref, inView] as const;
}

const Home: FC = () => {
  return (
    <div className="font-sans">
      <main>
        <HeroSection />
        <BenefitsSection />
        <BigPictureSection />
        <SpecsSection />
        <TestimonialSection />
      </main>
      <SiteFooter />
    </div>
  )
}

const HeroSection: FC = () => {
  return (
    <section className="relative overflow-hidden">


      <div className="mx-auto max-w-6xl px-4 pb-0 pt-6 sm:px-6 sm:pt-10">
        {/* Pill badge */}
        <div className="flex justify-center mb-6 animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8E9C78]/30 bg-[#DFECC6]/30 px-4 py-1.5 text-sm font-medium text-[#485C11]">
            <Plane className="size-3.5" />
            AI-Powered Travel Planning
          </span>
        </div>

        <h1 className="text-center font-serif text-[clamp(36px,6vw,80px)] leading-[1] tracking-tight text-foreground animate-fade-in-up">
          Explore the World,
          <br />
          <span className="bg-gradient-to-r from-[#485C11] via-[#6B7F3A] to-[#8E9C78] bg-clip-text text-transparent">
            Travel Carefree
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-center text-base sm:text-lg text-muted-foreground animate-fade-in-up-delay">
          Plan your dream trip in minutes with AI-driven itineraries, smart budgets, and beautiful interactive maps.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up-delay-2">
          <Link href="/llm">
            <Button className="h-12 rounded-full px-8 text-base font-semibold bg-[#485C11] hover:bg-[#3a4d0d] shadow-lg shadow-[#485C11]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#485C11]/30 hover:-translate-y-0.5">
              Start Planning
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
          <Link href="#benefits">
            <Button variant="outline" className="h-12 rounded-full px-8 text-base font-semibold border-[#929292]/30 hover:bg-[#DFECC6]/20 transition-all duration-300">
              Learn More
            </Button>
          </Link>
        </div>

        {/* Animated Roamly Travel Intelligence Globe */}
        <div className="mt-4 flex justify-center animate-fade-in-up-delay-2">
          <RotatingGlobe />
        </div>

      </div>
    </section>
  )
}

// Define the type for each item in the benefits array
interface BenefitItem {
  icon: LucideIcon;
  title: string;
  body: string;
  gradient: string;
}

const BenefitsSection: FC = () => {
  const items: BenefitItem[] = [
    { icon: Sparkles, title: "Amplify plans with AI", body: "Unlock relaxing trips with comprehensive plans made by AI, with chatbot and trip summaries.", gradient: "from-amber-500/10 to-orange-500/10" },
    { icon: Earth, title: "Explore any part of the world", body: "Discover hidden gems and iconic destinations across every continent.", gradient: "from-blue-500/10 to-cyan-500/10" },
    { icon: IndianRupee, title: "Smart budgeting", body: "Plan your trip to make it happen, all within your budget — with real-time estimates.", gradient: "from-emerald-500/10 to-green-500/10" },
    { icon: Shield, title: "Your Privacy, our priority", body: "We prioritize your experience with the utmost respect for your privacy.", gradient: "from-violet-500/10 to-purple-500/10" },
  ]

  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.3 });

  return (
    <section id="benefits" className="relative" ref={ref}>
      {/* Section background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[#f8faf5] to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4 text-xs font-semibold tracking-wider uppercase">Benefits</Badge>
          <h2 className="text-pretty text-3xl font-bold sm:text-4xl tracking-tight">
            {inView ? (
              <Highlighter action="underline" animationDuration={1200} color="#8E9C78" strokeWidth={3}>
                Travel Anywhere with Roamly
              </Highlighter>
            ) : (
              "Travel Anywhere with Roamly"
            )}
          </h2>
          <p className="text-muted-foreground mt-4 text-base">Roamly provides real travel insights, without the data overload.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <Card
              key={item.title}
              className="group h-full border-[#e8ece0] hover:border-[#8E9C78]/40 transition-all duration-500 hover:shadow-lg hover:shadow-[#8E9C78]/8 hover:-translate-y-1"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className={`inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} border border-[#e8ece0] group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="size-5 text-[#485C11]" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const BigPictureSection: FC = () => {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.3 });
  const bullets: string[] = [
    "See your whole trip at a glance. No more juggling spreadsheets; get a clear, visual overview of your itinerary.",
    "Keep everyone on the same page. Easily share your travel plans with your companions so everyone knows what's next.",
    "Bring your adventure to life. Visualize your journey with interactive maps and timelines that make planning fun.",
    "Effortlessly manage your budget. Track your spending and see where your money is going with a quick, clear snapshot.",
  ]

  return (
    <section className="relative" ref={ref}>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[#f5f8f0] to-transparent" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
        <div className="relative order-last md:order-first">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#e8ece0] bg-gradient-to-br from-white to-[#f8faf5] shadow-xl shadow-[#485C11]/5 transition-all duration-500 hover:shadow-2xl hover:shadow-[#485C11]/10 group">
            <img
              src="/roamly-3d-map.png"
              alt="Roamly 3D Travel Map"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Overlay shimmer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          {/* Floating accent */}
          <div className="absolute -bottom-3 -right-3 size-20 rounded-2xl bg-gradient-to-br from-[#DFECC6] to-[#8E9C78]/30 blur-xl -z-10" />
        </div>
        <div className="flex flex-col gap-5">
          <Badge variant="secondary" className="w-fit text-xs font-semibold tracking-wider uppercase">See the Big Picture</Badge>
          <h3 className="text-pretty text-2xl font-bold sm:text-3xl tracking-tight leading-tight">
            {inView ? (
              <Highlighter action="highlight" color="#DFECC6" animationDuration={1200}>
                Roamly
              </Highlighter>
            ) : ("Roamly")}{" "}
            transforms your travel ideas into clear, vibrant visuals.
          </h3>
          <ul className="mt-2 space-y-4">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-4 group/item">
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#485C11] to-[#6B7F3A] text-[11px] font-bold text-white shadow-sm">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-muted-foreground leading-relaxed group-hover/item:text-foreground transition-colors duration-300">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

// Define the props for the Column component
interface ColumnProps {
  title: string;
  lines: string[];
  isHighlighted?: boolean;
}

const SpecsSection: FC = () => {
  const roamlyFeatures: string[] = [
    "Quick trip planning",
    "Smart travel suggestions",
    "Expense prediction",
    "Effortless sharing",
    "Summary generation and Chat Bot support",
  ]
  const websurge: string[] = [
    "Slow trip planning",
    "Limited recommendations",
    "Manual booking required",
    "Basic expense logging",
    "Sharing can be tricky",
    "Potential language errors",
  ]
  const hyperview: string[] = [
    "Moderate speeds",
    "No smart suggestions",
    "Steep learning curve",
    "No expense tracking",
    "Limited sharing options",
    "Partial language support",
  ]

  const Column: FC<ColumnProps> = ({ title, lines, isHighlighted }) => (
    <Card className={`relative overflow-hidden transition-all duration-500 ${
      isHighlighted
        ? "border-[#485C11]/30 shadow-xl shadow-[#485C11]/10 scale-[1.02] bg-gradient-to-b from-[#f8faf5] to-white"
        : "border-[#e8ece0] hover:border-[#929292]/40 hover:shadow-md"
    }`}>
      {isHighlighted && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#485C11] via-[#6B7F3A] to-[#8E9C78]" />
      )}
      <CardContent className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className={`inline-flex size-10 items-center justify-center rounded-xl border ${
            isHighlighted
              ? "bg-gradient-to-br from-[#485C11] to-[#6B7F3A] border-transparent"
              : "bg-muted/60 border-[#e8ece0]"
          }`}>
            <Smartphone className={`size-5 ${isHighlighted ? "text-white" : "text-foreground"}`} />
          </div>
          <div>
            <h4 className="text-lg font-bold">{title}</h4>
            {isHighlighted && (
              <span className="text-xs font-semibold text-[#485C11] uppercase tracking-wider">Recommended</span>
            )}
          </div>
        </div>
        <ul className="space-y-3 text-sm">
          {lines.map((l) => (
            <li key={l} className="flex items-start gap-3">
              {isHighlighted ? (
                <Check className="mt-0.5 size-4 text-[#485C11] shrink-0" />
              ) : (
                <X className="mt-0.5 size-4 text-[#929292]/60 shrink-0" />
              )}
              <span className={isHighlighted ? "text-foreground font-medium" : "text-muted-foreground"}>{l}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )

  return (
    <section id="specs" className="relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[#f8faf5] to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4 text-xs font-semibold tracking-wider uppercase">Comparison</Badge>
          <h2 className="text-pretty text-3xl font-bold sm:text-4xl tracking-tight">Why Choose Roamly?</h2>
          <p className="text-muted-foreground mt-4 text-base">You need a solution that keeps up. That&apos;s why we developed Roamly — a traveller-friendly approach to get the most out of your trips.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-start">
          <Column title="Roamly" lines={roamlyFeatures} isHighlighted />
          <Column title="WebSurge" lines={websurge} />
          <Column title="HyperView" lines={hyperview} />
        </div>
      </div>
    </section>
  )
}

const TestimonialSection: FC = () => {
  const team = ["Mayuri", "Aryan", "Roger", "Mujahid", "Atharva"];
  return (
    <section className="relative">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[#e8ece0] bg-gradient-to-br from-[#f8faf5] via-white to-[#DFECC6]/20">
          {/* Decorative background elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 size-64 rounded-full bg-[#DFECC6]/30 blur-3xl" />
            <div className="absolute bottom-0 left-0 size-48 rounded-full bg-[#8E9C78]/10 blur-3xl" />
          </div>
          <div className="flex flex-col items-center gap-8 p-10 sm:p-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#DFECC6]/40 px-4 py-1.5 text-sm">
              <Plane className="size-4 text-[#485C11]" />
              <span className="font-medium text-[#485C11]">Made with ✈️ by</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {team.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-[#e8ece0] bg-white px-6 py-2.5 text-base font-semibold shadow-sm hover:shadow-md hover:border-[#8E9C78]/40 hover:-translate-y-0.5 transition-all duration-300 cursor-default"
                >
                  {name}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Built with passion for travel and powered by cutting-edge AI technology.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}


const SiteFooter: FC = () => {
  return (
    <footer className="border-t border-[#e8ece0]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#485C11] to-[#6B7F3A]">
            <Sparkles className="size-4 text-white" />
          </span>
          <span className="font-bold text-lg">Roamly</span>
        </div>
        <nav className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <a href="#benefits" className="hover:text-foreground transition-colors duration-300">Benefits</a>
          <a href="#specs" className="hover:text-foreground transition-colors duration-300">Specifications</a>
          <a href="#howto" className="hover:text-foreground transition-colors duration-300">How-to</a>
          <a href="#contact" className="hover:text-foreground transition-colors duration-300">Contact Us</a>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Roamly. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Home;
