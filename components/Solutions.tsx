"use client";

import React from "react";
import { SolutionCard } from "./ui/SolutionCard";
import { Layers, GitBranch, Plug, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

export function Solutions() {
  const solutions = [
    {
      title: "Custom SaaS Development",
      description: "تطوير منصات سحابية مرنة وقابلة للتوسع",
      icon: Layers,
    },
    {
      title: "Workflow Automation",
      description: "أتمتة العمليات والمهام المتكررة",
      icon: GitBranch,
    },
    {
      title: "System Integration",
      description: "ربط الأنظمة وتحسين تدفق البيانات",
      icon: Plug,
    },
    {
      title: "Data & Insights",
      description: "تحليلات وتقارير ذكية تدعم اتخاذ القرار",
      icon: BarChart2,
    },
  ];

  return (
    <section id="solutions" className="py-24 relative z-10 bg-bg-card border-t border-bg-card">
      <div className="container mx-auto px-6 md:px-12">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div className="flex flex-col">
            <h2 className="font-dmsans text-3xl md:text-4xl text-gold-primary mb-4">
              Solutions
            </h2>
            <p className="font-cairo text-text-secondary dir-rtl text-lg md:text-xl">
              نقدم حلول برمجية وأتمتة متكاملة تناسب احتياجات أعمالك
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {solutions.map((sol, i) => (
            <SolutionCard
              key={sol.title}
              title={sol.title}
              description={sol.description}
              icon={sol.icon}
              delay={i * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
