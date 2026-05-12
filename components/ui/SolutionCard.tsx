"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface SolutionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay: number;
}

export function SolutionCard({ icon: Icon, title, description, delay }: SolutionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-8 flex flex-col items-center text-center group cursor-pointer"
    >
      <div className="mb-8 p-3 border border-border-subtle rounded-md group-hover:border-gold-primary transition-colors bg-bg-card">
        <Icon className="text-gold-primary" size={32} strokeWidth={1.5} />
      </div>
      <h3 className="font-dmsans font-medium text-base md:text-lg text-text-primary mb-6 max-w-[150px]">
        {title}
      </h3>
      <p className="font-cairo text-text-secondary dir-rtl text-xs md:text-sm leading-relaxed mt-auto">
        {description}
      </p>
    </motion.div>
  );
}
