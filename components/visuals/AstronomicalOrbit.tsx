import React from "react";
import Image from "next/image";
import { BarChart3, Code2, Settings, Shield, Users } from "lucide-react";

const iconNodes = [
  { Icon: Settings, className: "left-[23%] top-[19%]" },
  { Icon: Code2, className: "right-[7%] top-[28%]" },
  { Icon: Users, className: "left-[18%] top-[49%]" },
  { Icon: BarChart3, className: "right-[18%] top-[48%]" },
  { Icon: Shield, className: "right-[13%] bottom-[21%]" },
];

export function AstronomicalOrbit() {
  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[560px] text-gold-primary sm:h-[520px] lg:mx-0 lg:h-[600px]">
      <div className="absolute right-0 top-0 aspect-square w-full max-w-[580px] sm:max-w-[620px]">
        <div className="absolute inset-[7%] rounded-full bg-gold-light/5 blur-3xl" />

        <Image
          src="/svg/Orbit.svg"
          alt=""
          aria-hidden="true"
          width={700}
          height={700}
          priority
          className="orbit-spin asset-gold-screen pointer-events-none absolute inset-[1%] h-[98%] w-[98%] select-none object-contain opacity-80"
        />

        <Image
          src="/svg/stars.svg"
          alt=""
          aria-hidden="true"
          width={560}
          height={560}
          className="orbit-stars asset-gold-screen pointer-events-none absolute inset-[8%] h-[84%] w-[84%] select-none object-contain opacity-25"
        />

        <div className="orbit-pulse absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-24 sm:w-24">
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gold-light" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gold-light" />
          <span className="absolute inset-[40%] rounded-full bg-gold-light shadow-[0_0_42px_13px_rgba(242,193,102,0.62)]" />
        </div>

        <div className="orbit-icons absolute inset-0 z-20">
          {iconNodes.map(({ Icon, className }, index) => (
            <div
              key={className}
              className={`orbit-icon absolute ${className} flex h-12 w-12 items-center justify-center rounded-full border border-gold-primary/80 bg-bg-primary/85 text-gold-light shadow-[0_0_24px_rgba(200,146,60,0.16)] md:h-16 md:w-16`}
            >
              <Icon size={index === 2 ? 23 : 25} strokeWidth={1.45} />
            </div>
          ))}
        </div>
      </div>

      <Image
        src="/svg/Pyramid.svg"
        alt=""
        aria-hidden="true"
        width={500}
        height={220}
        priority
        className="asset-gold-screen pointer-events-none absolute bottom-1 right-[4%] z-10 w-[58%] max-w-[390px] select-none object-contain opacity-90 sm:bottom-2 lg:right-0"
      />
    </div>
  );
}
