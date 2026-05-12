"use client";

import React from "react";
import { motion } from "framer-motion";
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
    <div className="relative mx-auto h-[560px] w-full max-w-[640px] text-gold-primary sm:h-[640px] lg:mx-0">
      <div className="absolute right-0 top-0 aspect-square w-full max-w-[580px] sm:max-w-[620px]">
        <div className="absolute inset-[7%] rounded-full bg-gold-light/5 blur-3xl" />

        <motion.img
          src="/svg/Orbit.svg"
          alt=""
          aria-hidden="true"
          className="asset-gold-screen pointer-events-none absolute inset-[1%] h-[98%] w-[98%] select-none object-contain opacity-82"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 0.82, scale: 1, rotate: 360 }}
          transition={{
            opacity: { duration: 0.8, ease: "easeOut" },
            scale: { duration: 0.8, ease: "easeOut" },
            rotate: { duration: 150, repeat: Infinity, ease: "linear" },
          }}
        />

        <motion.img
          src="/svg/stars.svg"
          alt=""
          aria-hidden="true"
          className="asset-gold-screen pointer-events-none absolute inset-[8%] h-[84%] w-[84%] select-none object-contain opacity-28"
          animate={{ rotate: 360 }}
          transition={{ duration: 220, repeat: Infinity, ease: "linear" }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-24 sm:w-24"
          animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gold-light" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gold-light" />
          <span className="absolute inset-[40%] rounded-full bg-gold-light shadow-[0_0_42px_13px_rgba(242,193,102,0.62)]" />
        </motion.div>

        <motion.div
          className="absolute inset-0 z-20"
          animate={{ rotate: -360 }}
          transition={{ duration: 96, repeat: Infinity, ease: "linear" }}
        >
          {iconNodes.map(({ Icon, className }, index) => (
            <motion.div
              key={className}
              className={`absolute ${className} flex h-14 w-14 items-center justify-center rounded-full border border-gold-primary/80 bg-bg-primary/75 text-gold-light shadow-[0_0_24px_rgba(200,146,60,0.16)] backdrop-blur-md md:h-[72px] md:w-[72px]`}
              animate={{ rotate: 360 }}
              transition={{ duration: 96, repeat: Infinity, ease: "linear" }}
            >
              <Icon size={index === 2 ? 23 : 25} strokeWidth={1.45} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.img
        src="/svg/Pyramid.svg"
        alt=""
        aria-hidden="true"
        className="asset-gold-screen pointer-events-none absolute bottom-1 right-[4%] z-10 w-[58%] max-w-[390px] select-none object-contain opacity-90 sm:bottom-2 lg:right-0"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 0.9, y: 0 }}
        transition={{ duration: 0.75, delay: 0.35, ease: "easeOut" }}
      />
    </div>
  );
}
