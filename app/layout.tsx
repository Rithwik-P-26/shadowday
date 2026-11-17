import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "500"] });

export const metadata: Metadata = {
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${schibsted.variable} ${jetbrains.variable} ${plexArabic.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
