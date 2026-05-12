"use client";

import React from "react";
import { motion } from "framer-motion";
import { BarChart3, CloudCog, LockKeyhole, Sparkles } from "lucide-react";
import { AstronomicalOrbit } from "./visuals/AstronomicalOrbit";
import { GoldButton } from "./ui/GoldButton";

const features = [
  { label: "SaaS Systems", icon: CloudCog },
  { label: "Automation", icon: Sparkles },
  { label: "Secure", icon: LockKeyhole },
  { label: "Insight Driven", icon: BarChart3 },
];

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pb-14 pt-32 md:pb-20 md:pt-36">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        className="premium-panel zij-container relative grid min-h-[820px] overflow-hidden rounded-[18px] px-6 py-9 md:px-12 lg:grid-cols-[0.45fr_0.55fr] lg:px-14 lg:py-12"
      >
        <motion.img
          src="/svg/stars.svg"
          alt=""
          aria-hidden="true"
          className="asset-gold-screen pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 1.2, delay: 0.2 }}
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gold-primary/55" />
        <div className="absolute -right-28 top-24 h-[30rem] w-[30rem] rounded-full bg-gold-primary/8 blur-[120px]" />
        <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-gold-primary/40 to-transparent" />

        <div className="relative z-20 flex flex-col justify-center py-8 lg:pr-6">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mb-7 text-xs font-bold uppercase tracking-[0.34em] text-gold-light/75"
          >
            SOFTWARE SYSTEMS • SAAS • AUTOMATION
          </motion.p>

          <h1 className="font-dmsans text-[clamp(3.5rem,7.4vw,5.7rem)] font-bold leading-[0.94] tracking-normal">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="block text-gold-primary"
            >
              Automate.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="block text-text-primary"
            >
              Scale.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.38 }}
              className="block text-text-primary"
            >
              Elevate.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.5 }}
            className="dir-rtl mt-8 max-w-xl text-right font-cairo text-lg leading-9 text-text-primary/90 md:text-xl"
          >
            نصمم أنظمة برمجية وأتمتة ذكية تدفع أعمالك إلى مستوى جديد من الكفاءة والذكاء.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.62 }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <GoldButton href="#solutions" variant="filled">Discover Solutions</GoldButton>
            <GoldButton href="#about" variant="outline">About ZIJ</GoldButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.74 }}
            className="mt-9 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {features.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-text-secondary">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-bg-card/70 text-gold-light shadow-[0_0_20px_rgba(200,146,60,0.08)]">
                  <Icon size={17} strokeWidth={1.6} />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="relative z-10 flex items-center justify-center overflow-visible py-8 lg:justify-end lg:py-0"
        >
          <AstronomicalOrbit />
        </motion.div>
      </motion.div>
    </section>
  );
}
