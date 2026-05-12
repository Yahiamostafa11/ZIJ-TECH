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
  return (
    <main className="min-h-screen bg-bg-primary">
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
