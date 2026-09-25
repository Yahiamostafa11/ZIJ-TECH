import type { Metadata, Viewport } from "next";
import { Cairo, Cinzel, DM_Sans } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zijtech.com"),
  title: {
    default: "ZIJ Technologies | From classrooms to factories",
    template: "%s | ZIJ Technologies",
  },
  description:
    "Software and SaaS, IoT and robotics solutions, and Zij Academy — STEM.org accredited programming and robotics classes for children.",
  applicationName: "ZIJ Technologies",
  keywords: ["software development Egypt", "SaaS", "IoT", "predictive maintenance", "digital twin", "robotics for kids", "programming for kids", "STEM academy El Shorouk"],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "ZIJ Technologies",
    title: "ZIJ Technologies | From classrooms to factories",
    description: "Software, IoT and robotics, and a STEM.org accredited academy for young engineers.",
    locale: "en_US",
    alternateLocale: ["ar_EG"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZIJ Technologies | From classrooms to factories",
    description: "Software, IoT and robotics, and a STEM.org accredited academy.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#071011" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The theme script sets data-theme on <html> before React hydrates.
    <html lang="en" className={`${cinzel.variable} ${dmSans.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-dmsans bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
