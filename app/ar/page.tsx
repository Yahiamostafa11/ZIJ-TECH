import type { Metadata } from "next";
import { OrganizationJsonLd } from "@/components/site/OrganizationJsonLd";
import { SiteHome } from "@/components/site/SiteHome";

const title = "زيج للتكنولوجيا | من الفصول الدراسية إلى المصانع";
const description =
  "برمجيات وأنظمة SaaS، وحلول إنترنت الأشياء والروبوتات، وأكاديمية زيج المعتمدة من STEM.org لتعليم الأطفال البرمجة والروبوتات.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/ar", languages: { en: "/", ar: "/ar" } },
  openGraph: { title, description, url: "/ar", locale: "ar_EG", alternateLocale: ["en_US"] },
  twitter: { title, description },
};

export default function ArabicHome() {
  return (
    <>
      <OrganizationJsonLd />
      <SiteHome locale="ar" />
    </>
  );
}
