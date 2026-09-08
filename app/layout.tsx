
import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { SiteNav } from "@/components/site-nav";
import { PageLoadingTransition } from "@/components/loading-screen";
import { Suspense } from "react";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roamly - AI Travel Planner",
  description: "Your intelligent companion for seamless, AI-driven travel planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${robotoMono.variable} antialiased pb-16 md:pb-0`}>
        <ClerkProvider>
          <Suspense fallback={null}>
            <PageLoadingTransition />
          </Suspense>
          <SiteNav />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
