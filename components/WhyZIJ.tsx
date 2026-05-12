"use client";

import React from "react";
import { motion } from "framer-motion";
import { Compass, Building, TrendingUp, ShieldCheck } from "lucide-react";

export function WhyZIJ() {
  const bullets = [
    { text: "Inspired by ancient astronomy", icon: Compass },
    { text: "Built for modern businesses", icon: Building },
    { text: "Scalable & future-ready", icon: TrendingUp },
    { text: "Secure & reliable", icon: ShieldCheck },
  ];

  return (
    <section id="about-more" className="py-24 relative z-10 overflow-hidden bg-bg-primary">
      <div className="container mx-auto px-6 md:px-12 relative z-10 flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Content */}
        <div className="w-full lg:w-3/5">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-dmsans text-3xl md:text-4xl text-text-primary mb-8"
          >
            Why ZIJ?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-cairo text-text-secondary text-lg dir-rtl leading-relaxed mb-12 text-right"
          >
            نمزج بين الإرث والحضارة والتكنولوجيا لتحقق قيمة حقيقية
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
            {bullets.map((bullet, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 border border-gold-primary rounded-md flex justify-center items-center flex-shrink-0">
                  <bullet.icon className="text-gold-primary" size={18} />
                </div>
                <span className="font-dmsans text-text-secondary text-sm md:text-base">{bullet.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Content - Pharaoh Image */}
        <div className="w-full lg:w-2/5 flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gold-primary blur-[120px] opacity-10 rounded-full" />
            <img
              src="/svgs/pharaoh-figure.svg"
              alt="Pharaoh Figure"
              className="relative z-10 max-h-[450px] object-contain opacity-80"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
