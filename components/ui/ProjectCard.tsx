import React from "react";

interface ProjectCardProps {
  title: string;
  description: string;
  type: "dashboard" | "automation" | "analytics";
}

function ProjectPreview({ type }: { type: ProjectCardProps["type"] }) {
  if (type === "automation") {
    return (
      <div className="relative h-full w-full bg-[radial-gradient(circle_at_50%_40%,rgba(242,193,102,0.15),transparent_45%),linear-gradient(135deg,#101b1d,#071011)]">
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-primary/70" />
        <div className="absolute left-[28%] top-[52%] h-16 w-28 rounded border border-text-secondary/15 bg-text-primary/5" />
        <div className="absolute left-[49%] top-[31%] h-28 w-12 origin-bottom -rotate-[35deg] rounded-md border border-gold-primary/50" />
        <div className="absolute left-[55%] top-[24%] h-10 w-20 rotate-12 rounded-full border border-gold-light/55" />
        <div className="absolute left-[62%] top-[42%] h-24 w-10 rotate-[35deg] rounded-md border border-gold-primary/45" />
      </div>
    );
  }

  if (type === "analytics") {
    return (
      <div className="flex h-full items-end gap-3 bg-[linear-gradient(180deg,#111d20,#071011)] px-8 pb-8">
        {[34, 54, 42, 76, 96, 68, 118].map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t bg-gradient-to-t from-gold-primary/45 to-gold-light/80"
            style={{ height }}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_34px]" />
      </div>
    );
  }

  return (
    <div className="h-full bg-[linear-gradient(135deg,#101b1d,#071011)] p-5">
      <div className="h-full rounded-md border border-text-secondary/10 bg-bg-primary/60 p-4">
        <div className="mb-4 flex gap-2">
          <span className="h-2 w-2 rounded-full bg-gold-primary/70" />
          <span className="h-2 w-2 rounded-full bg-text-secondary/30" />
          <span className="h-2 w-2 rounded-full bg-text-secondary/30" />
        </div>
        <div className="grid h-[calc(100%-1.5rem)] grid-cols-[0.35fr_1fr] gap-4">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <span key={item} className="block h-3 rounded bg-text-secondary/10" />
            ))}
          </div>
          <div className="space-y-4">
            <span className="block h-16 rounded border border-gold-primary/25 bg-gold-primary/8" />
            <span className="block h-3 w-3/4 rounded bg-text-secondary/14" />
            <span className="block h-3 w-5/6 rounded bg-text-secondary/10" />
            <span className="block h-3 w-2/3 rounded bg-text-secondary/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectCard({ title, description, type }: ProjectCardProps) {
  return (
    <div className="group overflow-hidden rounded-lg border border-border-subtle bg-bg-card/78 shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-gold-light/60 hover:shadow-[0_0_32px_rgba(242,193,102,0.14)]">
      <div className="relative h-48 overflow-hidden border-b border-border-subtle/70">
        <ProjectPreview type={type} />
      </div>
      <div className="p-6">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p lang="ar" dir="rtl" className="mt-4 text-right font-cairo text-sm leading-7 text-text-secondary">
          {description}
        </p>
      </div>
    </div>
  );
}
