import type { Metadata } from "next";
import "./globals.css";

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
      <body className="font-dmsans bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
