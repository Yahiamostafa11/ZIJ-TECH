"use client";

import React from "react";
import { motion } from "framer-motion";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export function SectionTitle({ title, subtitle, align = "left" }: SectionTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className={`mb-12 ${align === "center" ? "text-center" : "text-left"}`}
    >
      <h2 className="font-cinzel text-3xl md:text-4xl text-gold-primary tracking-wide mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="font-cairo text-text-secondary dir-rtl text-lg md:text-xl max-w-2xl">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
