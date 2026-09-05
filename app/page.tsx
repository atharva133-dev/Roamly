"use client"

import Image from "next/image"
import { Highlighter } from "@/components/magicui/highlighter";
import { Globe } from "@/components/magicui/globe";
import { GlobeErrorBoundary } from "@/components/magicui/globe-error-boundary";
import Link from "next/link"
import { Smartphone, Earth, IndianRupee, Shield, Sparkles, Check, ArrowRight, Phone, LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useRef, useEffect, FC } from 'react';

// A custom hook to detect if an element is in the viewport
// We specify the type for the ref, which can be any HTMLElement, and the options.
function useInView<T extends HTMLElement = HTMLDivElement>(options: IntersectionObserverInit = {}) {
  const [inView, setInView] = useState<boolean>(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      // Once the element is in view, set the state and disconnect
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    // Cleanup function to disconnect the observer when the component unmounts
    return () => {
      if (ref.current) {
        observer.disconnect();
      }
    };
  }, [options, ref]);

  return [ref, inView] as const;
}

// Define the component using FC (Functional Component) from React
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
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
        <h1 className="text-center font-serif text-[clamp(40px,7vw,96px)] leading-[0.9] tracking-tight">
          Traveling Carefree
        </h1>
        <div className="relative mt-10 sm:mt-14">
          {/* green rounded backdrop */}
          <div className="absolute left-1/2 top-1/2 -z-10 h-[180px] w-[min(100%,900px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[#8E9C78] sm:h-[220px]" />
          {/* tablet-like visual */}
          <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-[18px] border-[6px] border-black/70 shadow-2xl">
            <div className="relative aspect-[16/9] w-full">
              <div className="absolute inset-0 grid place-items-center">
                <GlobeErrorBoundary>
                  <Globe />
                </GlobeErrorBoundary>
              </div>
            </div>
          </div>
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
}

const BenefitsSection: FC = () => {
  const items: BenefitItem[] = [
    { icon: Sparkles, title: "Amplify plans with AI", body: "Unlock relaxing trips with comprehensive plans made by AI, with chatbot and trip summaries" },
    { icon: Earth, title: "Explore any part of the world", body: "Look for whats waiting for you in this world." },
    { icon: IndianRupee, title: "Smart budgeting", body: "Plan your trip, to make it happen all under your budget" },
    { icon: Shield, title: "Your Privacy, our priority", body: "We priorities your experience with utmost respect for your privacy" },
  ]

  // Use the custom hook with a specific element type (section)
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.5 });

  return (
    <section id="benefits" className="border-b" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-3">Benefits</Badge>
          <h2 className="text-pretty text-3xl font-semibold sm:text-4xl">
            {inView ? (
              <Highlighter action="box" animationDuration={1500} color="#8E9C78">
                Travel Anywhere with Roamly
              </Highlighter>
            ) : (
              "Travel Anywhere with Roamly"
            )}
          </h2>
          <p className="text-muted-foreground mt-3">Roamly provides real travel insights, without the data overload.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <Card key={item.title} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <div className="inline-flex size-10 items-center justify-center rounded-lg border bg-muted/60">
                  <item.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
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
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.5 });
  const bullets: string[] = [
    "See your whole trip at a glance. No more juggling spreadsheets; get a clear, visual overview of your itinerary.",
    "Keep everyone on the same page. Easily share your travel plans with your companions so everyone knows what's next.",
    "Bring your adventure to life. Visualize your journey with interactive maps and timelines that make planning fun.",
    "Effortlessly manage your budget. Track your spending and see where your money is going with a quick, clear snapshot of your trip.",
  ]


  return (
    <section className="border-b" ref={ref}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2">
        <div className="relative order-last md:order-first">
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-muted bg-[#DFECC6]/15 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:scale-[1.01]">
            <img
              src="/roamly-3d-map.png"
              alt="Roamly 3D Travel Map"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Badge variant="secondary" className="w-fit">See the Big Picture</Badge>
          <h3 className="text-pretty text-2xl font-semibold sm:text-3xl">
            {inView ? (
              <Highlighter action="highlight" color="#8E9C78" animationDuration={1500}>
                Roamly
              </Highlighter>
            ) : ("Roamly")}{" "}
            transforms your travel ideas into clear, vibrant visuals, giving you a beautiful overview of your next adventure.</h3>
          <ul className="mt-2 space-y-3">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full border text-xs font-semibold">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm text-muted-foreground">{b}</span>
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
}

const SpecsSection: FC = () => {
  const Roamly: string[] = [
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

  const Column: FC<ColumnProps> = ({ title, lines }) => (
    <Card>
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="inline-flex size-9 items-center justify-center rounded-lg border bg-muted/60">
            <Smartphone className="size-5" />
          </div>
          <h4 className="text-lg font-semibold">{title}</h4>
        </div>
        <ul className="space-y-3 text-sm">
          {lines.map((l) => (
            <li key={l} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 text-primary" />
              <span className="text-foreground/90">{l}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )

  return (
    <section id="specs" className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-3">Specs</Badge>
          <h2 className="text-pretty text-3xl font-semibold sm:text-4xl">Why Choose Roamly?</h2>
          <p className="text-muted-foreground mt-3">You need a solution that keeps up. That’s why we developed Roamly. A traveller-friendly approach to get the most out of your trips.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Column title="Roamly" lines={Roamly} />
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
    <section className="border-b">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border">
          <div className="absolute inset-0 -z-10 grid place-items-center">
            <div className="size-48 rounded-full bg-muted blur-3xl" />
          </div>
          <div className="flex flex-col items-center gap-6 p-8 sm:p-12 text-center">
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">Made with ✈️ by</p>
            <div className="flex flex-wrap justify-center gap-3">
              {team.map((name) => (
                <span
                  key={name}
                  className="rounded-full border bg-muted px-5 py-2 text-base font-semibold"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


const SiteFooter: FC = () => {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-md border"><Sparkles className="size-4" /></span>
          <span className="font-semibold">Roamly</span>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <a href="#benefits" className="hover:underline">Benefits</a>
          <a href="#specs" className="hover:underline">Specifications</a>
          <a href="#howto" className="hover:underline">How-to</a>
          <a href="#contact" className="hover:underline">Contact Us</a>
        </nav>
      </div>
    </footer>
  )
}

export default Home;
