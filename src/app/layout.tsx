import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fire-See — Foresee Wildfire Risk",
  description:
    "Fire-See is a wildfire intelligence engine that foresees fire risk in real time. Live NASA FIRMS detections, AEMET weather, and ML-driven scoring for Ourense, Galicia.",
  keywords: [
    "Fire-See",
    "foresee",
    "wildfire",
    "Ourense",
    "Galicia",
    "FIRMS",
    "AEMET",
    "fire risk",
    "machine learning",
  ],
  authors: [{ name: "Pablo Muñoz" }],
  openGraph: {
    title: "Fire-See",
    description: "Foresee wildfire risk — real-time intelligence for Galicia",
    type: "website",
  },
  robots: { index: false },
};

export const viewport = {
  themeColor: "#08090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)]">
        {children}
      </body>
    </html>
  );
}
