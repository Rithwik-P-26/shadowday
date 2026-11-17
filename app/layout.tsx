import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "500"] });

// Absolute URLs for the share image: SITE_URL if set, else the production domain Vercel exposes, else local dev.
const siteUrl =
  process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Shadowday: a first day at a tech job",
  description: "A free browser simulation of a first day at a tech job for UAE students. Real Python, real tests, AI coworkers, in English and Arabic.",
  openGraph: {
    title: "Shadowday",
    description: "A first day at a tech job, from anywhere in the UAE.",
    images: ["/share.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  // The on-screen keyboard shrinks the layout (and 100dvh) on Android, so the KeyBar and Run bar stay above it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${schibsted.variable} ${jetbrains.variable} ${plexArabic.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
