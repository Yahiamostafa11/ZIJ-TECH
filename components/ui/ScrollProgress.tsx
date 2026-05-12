"use client";

import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] h-px bg-transparent" aria-hidden="true">
      <motion.div
        className="h-full origin-left bg-gradient-to-r from-gold-dark via-gold-light to-gold-primary shadow-[0_0_18px_rgba(242,193,102,0.45)]"
        style={{ scaleX }}
      />
    </div>
  );
}
