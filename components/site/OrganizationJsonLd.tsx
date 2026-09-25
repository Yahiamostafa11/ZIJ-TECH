import { LINKS } from "./content";

/** Structured data so search engines understand the company and its academy. */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ZIJ Technologies",
    url: "https://zijtech.com/",
    logo: "https://zijtech.com/icon.png",
    description:
      "Software, IoT and robotics solutions, and Zij Academy — STEM.org accredited programming and robotics classes for children.",
    subOrganization: {
      "@type": "EducationalOrganization",
      name: "Zij Academy",
      hasCredential: { "@type": "EducationalOccupationalCredential", name: "STEM.org Accredited Educational Experience", url: LINKS.stemVerify },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
