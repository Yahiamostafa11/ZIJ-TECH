"use client";

import React from "react";
import { motion } from "framer-motion";
import { GoldButton } from "./ui/GoldButton";
import { Settings, Code, BarChart, Users, Lock } from "lucide-react";

export function Hero() {
  const words = ["Automate.", "Scale.", "Elevate."];

  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-bg-primary">
      {/* Background SVGs */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <img
          src="/svgs/stars-scatter.svg"
          alt="Stars"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute bottom-0 left-0 w-full z-0 opacity-40 pointer-events-none flex justify-center">
        <img
          src="/svgs/pyramid-campus.svg"
          alt="Pyramid Background"
          className="w-full max-w-6xl h-auto object-cover object-bottom"
        />
      </div>

      <div className="container mx-auto px-6 md:px-12 relative z-10 flex flex-col lg:flex-row items-center justify-between">
        {/* Left Content */}
        <div className="w-full lg:w-1/2 pt-12 lg:pt-0">
          <h1 className="font-cinzel text-5xl md:text-7xl font-bold leading-tight mb-8 text-text-primary">
            {words.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="block mb-2"
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-cairo text-text-secondary text-lg md:text-xl dir-rtl mb-10 max-w-lg leading-relaxed text-right"
          >
            نصمم أنظمة برمجية وأتمتة ذكية تدفع أعمالك إلى مستوى جديد من الكفاءة والذكاء.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <GoldButton variant="filled">Discover Solutions</GoldButton>
          </motion.div>
        </div>

        {/* Right Content - Celestial Circle */}
        <div className="w-full lg:w-1/2 mt-16 lg:mt-0 relative flex justify-center items-center min-h-[500px]">
          {/* Main Rotating Star Map */}
          <div className="absolute inset-0 flex justify-center items-center">
            <img
              src="/svgs/star-map.svg"
              alt="Celestial Map"
              className="w-full max-w-[500px] animate-spin-slow opacity-90"
            />
          </div>

          {/* Glowing Center Star */}
          <div className="absolute w-3 h-3 bg-gold-light rounded-full animate-pulse-glow z-20 shadow-[0_0_40px_10px_rgba(212,175,55,0.8)]" />

          {/* Orbiting Icons */}
          <div className="absolute inset-0 flex justify-center items-center z-10 animate-[spin_60s_linear_infinite_reverse]">
            <div className="relative w-full max-w-[450px] aspect-square">
              {[
                { icon: Settings, top: "5%", left: "45%" },
                { icon: Code, top: "75%", left: "15%" },
                { icon: BarChart, top: "45%", left: "85%" },
                { icon: Users, top: "25%", left: "15%" },
                { icon: Lock, top: "80%", left: "70%" },
              ].map((Item, i) => (
                <div
                  key={i}
                  className="absolute -ml-6 -mt-6 w-12 h-12 rounded-full border border-gold-primary bg-bg-primary flex justify-center items-center shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                  style={{ top: Item.top, left: Item.left }}
                >
                  <Item.icon className="text-gold-primary" size={20} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
