import React from "react";

/** Frosted panel used across the instructor portal. */
export function GlassCard({
  title,
  actions,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass min-w-0 p-5 md:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-text-primary">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const pillTones = {
  online: "bg-info/12 text-info",
  offline: "bg-gold-primary/15 text-gold-light",
  green: "bg-success/12 text-success",
  red: "bg-danger/12 text-danger",
  amber: "bg-warning/12 text-warning",
  neutral: "bg-text-primary/[0.06] text-text-secondary",
};

export function Pill({
  tone = "neutral",
  live = false,
  children,
}: {
  tone?: keyof typeof pillTones;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${pillTones[tone]}`}>
      {live && <span className="live-dot h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  unit,
  sub,
  icon,
  tone = "gold",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "gold" | "green" | "blue" | "red" | "amber";
}) {
  const toneClass = {
    gold: "text-gold-light",
    green: "text-success",
    blue: "text-info",
    red: "text-danger",
    amber: "text-warning",
  }[tone];
  return (
    <div className="glass flex min-w-0 flex-col gap-1.5 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
        <span className={`glass-inset grid h-8 w-8 shrink-0 place-items-center ${toneClass}`}>{icon}</span>
        {label}
      </div>
      <div className={`font-dmsans text-2xl font-bold tabular-nums ${tone === "gold" ? "text-text-primary" : toneClass}`}>
        {value}
        {unit && <span className="ms-1 text-xs font-medium text-text-secondary">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-text-secondary">{sub}</div>}
    </div>
  );
}
