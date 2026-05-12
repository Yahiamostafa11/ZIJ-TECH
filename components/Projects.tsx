"use client";

import React from "react";
import { ProjectCard } from "./ui/ProjectCard";
import { GoldButton } from "./ui/GoldButton";
import { motion } from "framer-motion";

export function Projects() {
  const projects = [
    {
      title: "Enterprise SaaS Platform",
      description: "منصة متكاملة لإدارة الأعمال والعملاء",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop",
    },
    {
      title: "Smart Automation System",
      description: "أتمتة سير العمل وتقليل التكاليف التشغيلية",
      imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000&auto=format&fit=crop",
    },
    {
      title: "Data Analytics Dashboard",
      description: "لوحات تحكم ذكية لتحليل البيانات واتخاذ القرار",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop",
    },
  ];

  return (
    <section id="projects" className="py-24 relative z-10 bg-bg-card border-t border-bg-card">
      <div className="container mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="font-dmsans text-3xl md:text-4xl text-gold-primary mb-4">
            Featured Projects
          </h2>
          <p className="font-cairo text-text-secondary dir-rtl text-lg text-right">
            نماذج من أعمالنا
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((proj, i) => (
            <ProjectCard
              key={proj.title}
              title={proj.title}
              description={proj.description}
              imageUrl={proj.imageUrl}
              delay={i * 0.15}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 flex justify-center"
        >
          <GoldButton variant="outline">View All Projects</GoldButton>
        </motion.div>
      </div>
    </section>
  );
}
