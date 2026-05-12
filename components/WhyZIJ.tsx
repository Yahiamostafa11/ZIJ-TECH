"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Building2, Compass, ShieldCheck, TrendingUp } from "lucide-react";
import { Reveal } from "./ui/Reveal";

const bullets = [
  { text: "Inspired by ancient astronomy", icon: Compass },
  { text: "Built for modern businesses", icon: Building2 },
  { text: "Secure & reliable", icon: ShieldCheck },
  { text: "Scalable & future-ready", icon: TrendingUp },
];

export function WhyZIJ() {
  return (
    <section className="relative z-10 px-4 py-14 md:py-20">
      <Reveal className="premium-panel relative mx-auto grid max-w-[1280px] overflow-hidden rounded-xl p-6 md:grid-cols-[1.1fr_0.9fr] md:p-9">
        <Image
          src="/svg/stars.svg"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="asset-gold-screen pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-16"
        />

        <div className="relative z-10 flex flex-col justify-center py-6">
          <h2 className="text-3xl font-semibold text-gold-light md:text-4xl">Why ZIJ?</h2>
          <p className="dir-rtl mt-5 max-w-2xl text-right font-cairo text-lg leading-8 text-text-secondary">
            نمزج بين الإرث والحضارة والتكنولوجيا لنخلق قيمة حقيقية.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {bullets.map(({ text, icon: Icon }, index) => (
              <Reveal key={text} delay={index * 0.08}>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle bg-bg-card/80 text-gold-primary">
                    <Icon size={18} strokeWidth={1.55} />
                  </span>
                  {text}
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <motion.div
          className="relative z-10 mt-8 flex min-h-[360px] justify-center md:mt-0 md:min-h-[480px] md:justify-end"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute bottom-10 right-8 h-64 w-64 rounded-full bg-gold-primary/10 blur-[80px]" />
          <Image
            src="/svg/Pharaoh.svg"
            alt=""
            aria-hidden="true"
            width={420}
            height={520}
            className="asset-gold-screen pointer-events-none relative h-[360px] w-auto select-none object-contain opacity-90 md:h-[500px]"
          />
        </motion.div>
      </Reveal>
    </section>
  );
}
