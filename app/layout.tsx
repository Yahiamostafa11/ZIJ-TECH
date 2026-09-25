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
    default: "ZIJ Technologies | Automate. Scale. Elevate.",
    template: "%s | ZIJ Technologies",
  },
  description:
    "Custom SaaS systems, workflow automation, integrations, and data solutions for modern businesses.",
  alternates: { canonical: "/" },
  applicationName: "ZIJ Technologies",
  keywords: ["SaaS development", "workflow automation", "system integration", "data analytics"],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "ZIJ Technologies",
    title: "ZIJ Technologies | Automate. Scale. Elevate.",
    description: "Modern software systems inspired by ancient navigation and built for business growth.",
    locale: "en_US",
    alternateLocale: ["ar_EG"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZIJ Technologies | Automate. Scale. Elevate.",
    description: "Custom SaaS, automation, integrations, and data solutions.",
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
