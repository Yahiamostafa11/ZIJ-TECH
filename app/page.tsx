import React from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AboutFeatures } from "@/components/AboutFeatures";
import { Solutions } from "@/components/Solutions";
import { WhyZIJ } from "@/components/WhyZIJ";
import { Projects } from "@/components/Projects";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ZIJ Technologies",
    url: "https://zijtech.com/",
    description:
      "Custom SaaS systems, workflow automation, integrations, and data solutions for modern businesses.",
  };

  return (
    <main className="min-h-screen bg-bg-primary">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Navbar />
      <Hero />
      <AboutFeatures />
      <Solutions />
      <WhyZIJ />
      <Projects />
      <Contact />
      <Footer />
    </main>
  );
}
