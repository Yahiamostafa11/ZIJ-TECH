"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cloud, Zap, Expand, Cpu, Shield, LineChart } from "lucide-react";

export function AboutFeatures() {
  const features = [
    { name: "SaaS Systems", icon: Cloud },
    { name: "Automation", icon: Cpu },
    { name: "Smartautomation", icon: Zap },
    { name: "Secucle", icon: Shield },
    { name: "Scalable", icon: Expand },
    { name: "Insight Driven", icon: LineChart },
  ];

  return (
    <section id="about" className="py-24 relative z-10 bg-bg-primary border-t border-bg-card">
      <div className="container mx-auto px-6 md:px-12 flex flex-col lg:flex-row justify-between items-start gap-16">
        
        {/* Left Side: Branding & Text */}
        <div className="w-full lg:w-1/2 flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col mb-6"
          >
            <span className="font-cinzel font-bold text-6xl md:text-8xl text-gold-primary leading-none">
              ZIJ.
            </span>
            <span className="font-dmsans text-sm md:text-base tracking-[0.3em] text-gold-primary mt-2">
              TECHNOLOGIES
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-cairo text-5xl md:text-7xl font-bold text-gold-primary dir-rtl mb-8"
          >
            زيج
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="font-cairo text-text-secondary text-lg md:text-xl dir-rtl leading-relaxed text-right max-w-lg"
          >
            منهج مستوحى من علم الفلك المصري القديم لتنظيم النجوم واستدلالاتها. نترجم هذا الإرث إلى أنظمة ذكية وأتمتة متقدمة.
          </motion.p>
        </div>

        {/* Right Side: Features Grid */}
        <div className="w-full lg:w-1/2 mt-8 lg:mt-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12"
          >
            {/* Column 1 */}
            <div className="flex flex-col gap-8">
              {[features[0], features[2], features[4]].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="p-2 border border-gold-primary rounded-md flex items-center justify-center">
                    <feature.icon className="text-gold-primary group-hover:text-gold-light transition-colors" size={20} />
                  </div>
                  <span className="font-dmsans text-text-secondary text-base md:text-lg group-hover:text-text-primary transition-colors">{feature.name}</span>
                </div>
              ))}
            </div>
            {/* Column 2 */}
            <div className="flex flex-col gap-8">
              {[features[1], features[3], features[5]].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="p-2 border border-gold-primary rounded-md flex items-center justify-center">
                    <feature.icon className="text-gold-primary group-hover:text-gold-light transition-colors" size={20} />
                  </div>
                  <span className="font-dmsans text-text-secondary text-base md:text-lg group-hover:text-text-primary transition-colors">{feature.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
