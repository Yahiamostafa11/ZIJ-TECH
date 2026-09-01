import React from "react";
import Image from "next/image";
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
      <div
        className="premium-panel zij-container relative grid min-h-[680px] overflow-hidden rounded-[18px] px-6 py-9 md:px-12 lg:min-h-[760px] lg:grid-cols-[0.48fr_0.52fr] lg:px-14 lg:py-12"
      >
        <Image
          src="/svg/stars.svg"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="asset-gold-screen pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-20"
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gold-primary/55" />
        <div className="absolute -right-28 top-24 h-[30rem] w-[30rem] rounded-full bg-gold-primary/8 blur-[120px]" />
        <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-gold-primary/40 to-transparent" />

        <div className="relative z-20 flex flex-col justify-center py-8 lg:pr-6">
          <p className="hero-enter mb-7 text-xs font-bold uppercase tracking-[0.34em] text-gold-light/75">
            SOFTWARE SYSTEMS • SAAS • AUTOMATION
          </p>

          <h1 className="font-dmsans text-[clamp(3.5rem,7.4vw,5.7rem)] font-bold leading-[0.94] tracking-normal">
            <span className="hero-enter block text-gold-primary [--hero-delay:0.08s]">
              Automate.
            </span>
            <span className="hero-enter block text-text-primary [--hero-delay:0.14s]">
              Scale.
            </span>
            <span className="hero-enter block text-text-primary [--hero-delay:0.2s]">
              Elevate.
            </span>
          </h1>

          <p
            lang="ar"
            dir="rtl"
            className="hero-enter mt-8 max-w-xl text-right font-cairo text-lg leading-9 text-text-primary/90 [--hero-delay:0.26s] md:text-xl"
          >
            نصمم أنظمة برمجية وأتمتة ذكية تدفع أعمالك إلى مستوى جديد من الكفاءة والذكاء.
          </p>

          <div className="hero-enter mt-8 flex flex-wrap gap-4 [--hero-delay:0.32s]">
            <GoldButton href="#solutions" variant="filled">Discover Solutions</GoldButton>
            <GoldButton href="#about" variant="outline">About ZIJ</GoldButton>
          </div>

          <div className="hero-enter mt-9 grid max-w-xl grid-cols-2 gap-4 [--hero-delay:0.38s] sm:grid-cols-4">
            {features.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-text-secondary">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-bg-card/70 text-gold-light shadow-[0_0_20px_rgba(200,146,60,0.08)]">
                  <Icon size={17} strokeWidth={1.6} />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-enter pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden opacity-25 [--hero-delay:0.18s] lg:pointer-events-auto lg:relative lg:justify-end lg:overflow-visible lg:py-0 lg:opacity-100">
          <AstronomicalOrbit />
        </div>
      </div>
    </section>
  );
}
