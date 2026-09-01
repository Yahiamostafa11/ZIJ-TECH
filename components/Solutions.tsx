import React from "react";
import { BarChart2, GitBranch, Layers, Plug } from "lucide-react";
import { SolutionCard } from "./ui/SolutionCard";
import { Reveal } from "./ui/Reveal";

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

export function Solutions() {
  return (
    <section id="solutions" className="relative z-10 px-4 py-10 md:py-20">
      <Reveal className="premium-panel mx-auto max-w-[1280px] rounded-xl p-6 md:p-9">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-semibold text-gold-light md:text-4xl">Solutions</h2>
            <p lang="ar" dir="rtl" className="mt-3 max-w-2xl text-right font-cairo text-lg text-text-secondary">
              نقدم حلول برمجية وأتمتة متكاملة تناسب احتياجات أعمالك
            </p>
          </div>
          <div className="hidden h-px flex-1 bg-gradient-to-r from-border-subtle to-transparent md:block" />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {solutions.map((solution) => (
            <SolutionCard key={solution.title} {...solution} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
