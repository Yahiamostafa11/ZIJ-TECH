import React from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { directionOf, type Locale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "ZIJ Portal",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;

  // The root layout owns <html>, so direction is set on this wrapper instead.
  return (
    <div
      lang={locale}
      dir={directionOf(locale)}
      className={locale === "ar" ? "font-cairo" : "font-dmsans"}
    >
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </div>
  );
}
