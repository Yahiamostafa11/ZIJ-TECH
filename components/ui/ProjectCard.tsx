"use client";

import React from "react";
import { motion } from "framer-motion";

interface ProjectCardProps {
  title: string;
  description: string;
  imageUrl: string;
  delay: number;
}

export function ProjectCard({ title, description, imageUrl, delay }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      className="glass-card rounded-xl overflow-hidden group flex flex-col h-full"
    >
      <div className="relative h-48 w-full overflow-hidden bg-bg-secondary">
        <div className="absolute inset-0 bg-gold-primary/10 group-hover:opacity-0 transition-opacity z-10" />
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="font-dmsans font-bold text-lg text-text-primary mb-3 text-center">
          {title}
        </h3>
        <p className="font-cairo text-text-secondary dir-rtl text-sm leading-relaxed text-center mt-auto">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
