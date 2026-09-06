
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { SiteNav } from "@/components/site-nav";
import { PageLoadingTransition } from "@/components/loading-screen";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
