import type { Metadata } from "next";
import { Cinzel, DM_Sans, Cairo } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
});

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "ZIJ Technologies | Automate. Scale. Elevate.",
  description: "Automate. Scale. Elevate. Ancient Egyptian heritage combined with modern software and AI technology.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${dmSans.variable} ${cairo.variable} font-dmsans bg-bg-primary text-text-primary antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
