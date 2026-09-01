import React from "react";
import Image from "next/image";
import { GoldButton } from "./ui/GoldButton";
import { ProjectCard } from "./ui/ProjectCard";
import { Reveal } from "./ui/Reveal";

const projects = [
  {
    title: "Enterprise SaaS Platform",
    description: "منصة متكاملة لإدارة الأعمال والعملاء",
    type: "dashboard" as const,
  },
  {
    title: "Smart Automation System",
    description: "أتمتة سير العمل وتقليل التكاليف التشغيلية",
    type: "automation" as const,
  },
  {
    title: "Data Analytics Dashboard",
    description: "لوحات تحكم ذكية لتحليل البيانات واتخاذ القرار",
    type: "analytics" as const,
  },
];

export function Projects() {
  return (
    <section id="projects" className="relative z-10 px-4 py-10 md:py-20">
      <Reveal className="premium-panel relative mx-auto max-w-[1280px] overflow-hidden rounded-xl p-6 md:p-9">
        <Image
          src="/svg/stars.svg"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="asset-gold-screen pointer-events-none object-cover opacity-15"
        />

        <div className="relative z-10 mb-8">
          <h2 className="text-3xl font-semibold text-gold-light md:text-4xl">Featured Projects</h2>
          <p lang="ar" dir="rtl" className="mt-3 text-right font-cairo text-lg text-text-secondary">
            نماذج من أعمالنا
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>

        <div className="relative z-10 mt-9 flex justify-center">
          <GoldButton href="#contact" variant="outline">Discuss a Similar Project</GoldButton>
        </div>
      </Reveal>
    </section>
  );
}
