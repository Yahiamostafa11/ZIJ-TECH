import React from "react";
import Image from "next/image";
import { CloudCog, Compass, Network, ShieldCheck, Sparkles, Waypoints } from "lucide-react";
import { Reveal } from "./ui/Reveal";

const chips = [
  { name: "SaaS Systems", icon: CloudCog },
  { name: "Automation", icon: Sparkles },
  { name: "System Mapping", icon: Waypoints },
  { name: "Secure", icon: ShieldCheck },
  { name: "Operational Clarity", icon: Compass },
  { name: "Connected Data", icon: Network },
];

export function AboutFeatures() {
  return (
    <section id="about" className="relative z-10 px-4 py-10 md:py-20">
      <Reveal className="premium-panel relative mx-auto grid max-w-[1280px] gap-8 overflow-hidden rounded-xl p-6 md:grid-cols-[0.82fr_1.18fr] md:p-9">
        <Image
          src="/svg/stars.svg"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="asset-gold-screen pointer-events-none object-cover opacity-15"
        />

        <div className="gold-line-card relative overflow-hidden rounded-lg p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold-primary/10 blur-3xl" />
          <span className="relative block font-cinzel text-7xl font-bold leading-none text-gold-primary md:text-8xl">
            ZIJ.
          </span>
          <span className="relative mt-3 block text-xs font-bold tracking-[0.42em] text-gold-light/75">
            TECHNOLOGIES
          </span>
          <span lang="ar" dir="rtl" className="relative mt-10 block font-cairo text-6xl font-bold text-gold-light">
            زيج
          </span>
          <p lang="ar" dir="rtl" className="relative mt-5 max-w-sm text-right font-cairo text-sm leading-7 text-text-secondary">
            من الفلك القديم إلى أنظمة حديثة تنظّم العمل وتوضح الاتجاه.
          </p>
          <div className="egyptian-rule relative mt-8 h-px w-full" />
        </div>

        <div className="relative z-10 flex flex-col justify-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-gold-light/70">
            ORIGIN
          </p>
          <h2 className="mb-6 max-w-3xl text-3xl font-semibold text-text-primary md:text-5xl">
            Ancient navigation, engineered for modern teams.
          </h2>
          <p lang="ar" dir="rtl" className="max-w-3xl text-right font-cairo text-lg leading-9 text-text-secondary md:text-xl">
            زيج مستوحى من علم الفلك القديم لتنظيم النجوم والاستدلال بها، ونترجم هذا الإرث إلى أنظمة برمجية ذكية ومنظمة تساعد الشركات على العمل بكفاءة ووضوح.
          </p>

          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chips.map(({ name, icon: Icon }) => (
              <Reveal key={name}>
                <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-card/70 px-4 py-3 text-sm text-text-secondary transition hover:border-gold-light/50 hover:text-text-primary hover:shadow-[0_0_24px_rgba(242,193,102,0.13)]">
                  <Icon className="text-gold-primary" size={18} strokeWidth={1.6} />
                  {name}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
