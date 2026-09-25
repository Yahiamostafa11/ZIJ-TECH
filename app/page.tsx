import type { Metadata } from "next";
import { OrganizationJsonLd } from "@/components/site/OrganizationJsonLd";
import { SiteHome } from "@/components/site/SiteHome";

export const metadata: Metadata = {
  alternates: { canonical: "/", languages: { en: "/", ar: "/ar" } },
};

export default function Home() {
  return (
    <>
      <OrganizationJsonLd />
      <SiteHome locale="en" />
    </>
  );
}
