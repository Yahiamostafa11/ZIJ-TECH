"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cloud, Zap, Expand, Cpu, Shield, LineChart } from "lucide-react";

export function FeaturesBar() {
  const features = [
    { name: "SaaS Systems", icon: Cloud },
    { name: "Automation", icon: Cpu },
    { name: "Smartautomation", icon: Zap },
    { name: "Secucle", icon: Shield },
    { name: "Scalable", icon: Expand },
    { name: "Insight Driven", icon: LineChart },
  ];

  return (
    <section className="relative z-20 container mx-auto px-6 md:px-12 -mt-8 md:-mt-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass-card rounded-xl p-8 md:p-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {/* We group them to simulate the 2 column layout from design */}
          <div className="flex flex-col gap-6">
            {[features[0], features[2], features[4]].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <feature.icon className="text-gold-primary group-hover:text-gold-light transition-colors" size={24} />
                <span className="font-dmsans text-text-primary text-lg">{feature.name}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-6">
            {[features[1], features[3], features[5]].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <feature.icon className="text-gold-primary group-hover:text-gold-light transition-colors" size={24} />
                <span className="font-dmsans text-text-primary text-lg">{feature.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
