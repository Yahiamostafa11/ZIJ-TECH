import React from "react";
import Link from "next/link";

export const inputClass =
  "w-full rounded-md border border-border-subtle bg-field px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/60 focus:border-gold-primary focus:shadow-focus disabled:opacity-60";

export function buttonClass(variant: "primary" | "secondary" | "danger" | "ghost" = "primary") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  switch (variant) {
    case "primary":
      return `${base} bg-gold-gradient text-on-accent hover:brightness-110`;
    case "secondary":
      return `${base} border border-border-subtle text-gold-light hover:border-gold-light/60 hover:bg-gold-primary/10`;
    case "danger":
      return `${base} border border-danger/40 text-danger hover:bg-danger/10`;
    case "ghost":
      return `${base} text-text-secondary hover:bg-hover hover:text-text-primary`;
  }
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
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
    <section className={`rounded-lg border border-border-subtle bg-bg-card/70 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle/70 px-5 py-3">
          {title && <h2 className="font-semibold text-text-primary">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm text-text-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-text-secondary/70">{hint}</p>}
    </div>
  );
}

const toneClasses = {
  neutral: "border-border-subtle text-text-secondary",
  gold: "border-gold-primary/50 text-gold-light",
  green: "border-success/40 text-success",
  red: "border-danger/40 text-danger",
  blue: "border-info/40 text-info",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof toneClasses;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-border-subtle bg-bg-secondary/80 px-4 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-gold-light/70 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-border-subtle/50 px-4 py-3 align-middle text-text-primary ${className}`}>
      {children}
    </td>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-subtle px-6 py-10 text-center text-sm text-text-secondary">
      {children}
    </div>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}

/** Label/value pairs for detail pages. */
export function DetailList({ items }: { items: { label: React.ReactNode; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-0.5">
          <dt className="text-xs text-text-secondary">{item.label}</dt>
          <dd className="text-sm text-text-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
