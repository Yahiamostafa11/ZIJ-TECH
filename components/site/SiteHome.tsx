import React from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  BadgeCheck,
  Code2,
  Cpu,
  ExternalLink,
  GraduationCap,
  Lock,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { GoldButton } from "@/components/ui/GoldButton";
import { GlyphStrip } from "@/components/visuals/GlyphStrip";
import { ContactSection } from "./ContactSection";
import { LINKS, SITE_COPY, type DivisionKey, type SiteCopy, type SiteLocale } from "./content";
import { SiteHeader } from "./SiteHeader";

const DIVISION_ICONS: Record<DivisionKey, LucideIcon> = {
  academy: GraduationCap,
  software: Code2,
  iot: Cpu,
};

/** The public homepage in one language. /  is English, /ar is Arabic. */
export function SiteHome({ locale }: { locale: SiteLocale }) {
  const copy = SITE_COPY[locale];
  const homeHref = locale === "ar" ? "/ar" : "/";

  return (
    <div lang={locale} dir={copy.dir} className={locale === "ar" ? "font-cairo" : "font-dmsans"}>
      <SiteHeader copy={copy} homeHref={homeHref} />
      <main className="relative z-10">
        <Hero copy={copy} />
        <Proof copy={copy} />
        <Academy copy={copy} />
        <Division
          id="software"
          icon={Code2}
          eyebrow={copy.software.eyebrow}
          title={copy.software.title}
          body={copy.software.body}
          points={copy.software.points}
          cta={copy.software.cta}
          ctaHref="#contact-software"
        />
        <Division
          id="iot"
          icon={Cpu}
          eyebrow={copy.iot.eyebrow}
          title={copy.iot.title}
          body={copy.iot.body}
          points={copy.iot.points}
          cta={copy.iot.cta}
          ctaHref="#contact-iot"
        />
        <Work copy={copy} />
        <Why copy={copy} />
        <ContactSection copy={copy.contact} />
      </main>
      <SiteFooter copy={copy} homeHref={homeHref} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] rtl:tracking-normal text-gold-light">{eyebrow}</p>
      <h2 className="text-3xl font-semibold leading-tight text-text-primary md:text-5xl">{title}</h2>
      {body && <p className="mt-4 text-lg leading-8 text-text-secondary">{body}</p>}
    </div>
  );
}

function Hero({ copy }: { copy: SiteCopy }) {
  const divisions: DivisionKey[] = ["academy", "software", "iot"];
  return (
    <section id="home" className="relative overflow-hidden pb-10 pt-32 md:pt-40">
      <div className="zij-container">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="hero-enter mb-6 text-xs font-bold uppercase tracking-[0.3em] rtl:tracking-normal text-gold-light">{copy.hero.eyebrow}</p>
            <h1 className="hero-enter text-[clamp(2.7rem,6.2vw,5.4rem)] font-bold leading-[1.02] [--hero-delay:0.08s]">
              <span className="block text-text-primary">{copy.hero.titleLead}</span>
              <span className="gold-gradient-text block pb-2">{copy.hero.titleAccent}</span>
            </h1>
            <p className="hero-enter mt-6 max-w-xl text-lg leading-8 text-text-secondary [--hero-delay:0.16s] md:text-xl">
              {copy.hero.body}
            </p>
            <div className="hero-enter mt-8 flex flex-wrap gap-3 [--hero-delay:0.24s]">
              <GoldButton href="#academy">{copy.hero.primary}</GoldButton>
              <GoldButton href="#work" variant="outline">
                {copy.hero.secondary}
              </GoldButton>
            </div>
          </div>

          <div className="hero-enter relative mx-auto aspect-square w-full max-w-[520px] [--hero-delay:0.12s]" aria-hidden="true">
            <div className="absolute inset-[12%] rounded-full bg-gold-primary/10 blur-3xl" />
            <Image
              src="/brand/emblem.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 520px, 90vw"
              className="orbit-spin object-contain"
            />
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {divisions.map((key) => {
            const Icon = DIVISION_ICONS[key];
            const item = copy.divisionsShort[key];
            return (
              <a
                key={key}
                href={`#${key}`}
                className="group flex flex-col rounded-xl border border-border-subtle bg-bg-card/80 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-gold-light/60"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary text-gold-light">
                  <Icon size={24} strokeWidth={1.5} />
                </span>
                <span className="text-xl font-semibold text-text-primary">{item.title}</span>
                <span className="mt-2 flex-1 text-sm leading-6 text-text-secondary">{item.body}</span>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-gold-light">
                  {item.cta}
                  <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 rtl:-scale-x-100" />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Proof({ copy }: { copy: SiteCopy }) {
  return (
    <section aria-label={copy.proof.accredited} className="py-8">
      <div className="zij-container grid gap-6 rounded-xl border border-border-subtle bg-bg-secondary/70 p-6 md:p-8 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10">
        <a
          href={LINKS.stemVerify}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-4 rounded-lg border border-gold-primary/40 bg-bg-card/80 px-5 py-4 transition hover:border-gold-light"
        >
          <BadgeCheck className="shrink-0 text-gold-primary" size={36} strokeWidth={1.5} />
          <span className="flex flex-col">
            <span className="font-semibold text-text-primary" dir="ltr">
              {copy.proof.accredited}
            </span>
            <span className="text-xs text-text-secondary">{copy.proof.accreditedSub}</span>
          </span>
          <span className="ms-2 inline-flex items-center gap-1 text-xs font-semibold text-gold-light">
            {copy.proof.verify} <ExternalLink size={13} />
          </span>
        </a>
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {copy.proof.stats.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-3xl font-bold text-gold-primary md:text-4xl">{stat.value}</dd>
              <dd className="mt-1 text-sm leading-5 text-text-secondary">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function PointGrid({ points, columns = 2 }: { points: { title: string; body: string }[]; columns?: 2 | 3 | 4 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "md:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <div className={`grid gap-4 ${grid}`}>
      {points.map((point) => (
        <div key={point.title} className="rounded-lg border border-border-subtle bg-bg-card/70 p-5">
          <h3 className="font-semibold text-text-primary">{point.title}</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{point.body}</p>
        </div>
      ))}
    </div>
  );
}

function Academy({ copy }: { copy: SiteCopy }) {
  const academy = copy.academy;
  return (
    <section id="academy" className="py-16 md:py-24">
      <div className="zij-container grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div>
          <SectionHeading eyebrow={academy.eyebrow} title={academy.title} body={academy.body} />
          <div className="mt-8">
            <PointGrid points={academy.points} columns={3} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <GoldButton href="#contact-academy">{academy.cta}</GoldButton>
            <a
              href={LINKS.shoroukMap}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gold-light hover:underline"
            >
              <MapPin size={16} /> {academy.branch} · {academy.directions}
            </a>
          </div>
        </div>

        <figure className="rounded-xl border border-border-subtle bg-bg-card/80 p-4 shadow-card">
          <a href={LINKS.stemVerify} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border-subtle/60 bg-white">
            <Image
              src="/brand/stem-certificate.webp"
              alt="STEM.org Accredited Educational Experience certificate presented to ZIJ Academy"
              width={1100}
              height={849}
              sizes="(min-width: 1024px) 520px, 100vw"
              className="h-auto w-full"
            />
          </a>
          <figcaption className="mt-4 px-1">
            <p className="flex items-center gap-2 font-semibold text-text-primary">
              <BadgeCheck size={18} className="text-gold-primary" /> {academy.certificateTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">{academy.certificateBody}</p>
            <p className="mt-2 text-xs text-text-secondary">{academy.certificateId}</p>
            <a
              href={LINKS.stemVerify}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-light hover:underline"
            >
              {copy.proof.verify} <ExternalLink size={14} />
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Division({
  id,
  icon: Icon,
  eyebrow,
  title,
  body,
  points,
  cta,
  ctaHref,
}: {
  id: DivisionKey;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  points: { title: string; body: string }[];
  cta: string;
  ctaHref: string;
}) {
  return (
    <section id={id} className="border-t border-border-subtle/60 py-16 md:py-24">
      <div className="zij-container">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow={eyebrow} title={title} body={body} />
          <span className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-bg-card/70 text-gold-primary md:flex" aria-hidden="true">
            <Icon size={38} strokeWidth={1.3} />
          </span>
        </div>
        <div className="mt-10">
          <PointGrid points={points} columns={points.length === 4 ? 4 : 3} />
        </div>
        <div className="mt-8">
          <GoldButton href={ctaHref} variant="outline">
            {cta}
          </GoldButton>
        </div>
      </div>
    </section>
  );
}

function Work({ copy }: { copy: SiteCopy }) {
  return (
    <section id="work" className="border-t border-border-subtle/60 py-16 md:py-24">
      <div className="zij-container">
        <SectionHeading eyebrow={copy.work.eyebrow} title={copy.work.title} body={copy.work.body} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {copy.work.items.map((item, index) => {
            const Icon = DIVISION_ICONS[item.division];
            const featured = index === 0;
            return (
              <article
                key={item.key}
                className={`group flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-card/80 shadow-card transition hover:border-gold-light/60 ${
                  featured ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b border-border-subtle/70 bg-[linear-gradient(135deg,rgb(var(--bg-secondary)),rgb(var(--bg-primary)))]">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill sizes={featured ? "(min-width: 1024px) 800px, 100vw" : "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"} className="object-cover object-top" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col">
                      <div className="flex items-center gap-1.5 border-b border-border-subtle/60 px-4 py-2.5" aria-hidden="true">
                        <span className="h-2 w-2 rounded-full bg-gold-primary/60" />
                        <span className="h-2 w-2 rounded-full bg-text-secondary/30" />
                        <span className="h-2 w-2 rounded-full bg-text-secondary/30" />
                        <span className="ms-3 truncate text-xs text-text-secondary" dir="ltr">
                          {item.url ? item.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : item.name}
                        </span>
                      </div>
                      <div className="flex flex-1 items-center justify-center">
                        <Icon size={featured ? 64 : 44} strokeWidth={1.1} className="text-gold-primary/70" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-light">{item.kind}</p>
                  <h3 className="mt-2 text-lg font-semibold text-text-primary">{item.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-text-secondary">{item.note}</p>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-light hover:underline"
                    >
                      {copy.work.visit} <ExternalLink size={14} />
                    </a>
                  ) : (
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-text-secondary">
                      <Lock size={13} /> {copy.work.privateNote}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Why({ copy }: { copy: SiteCopy }) {
  return (
    <section className="border-t border-border-subtle/60 py-16 md:py-20">
      <div className="zij-container">
        <h2 className="mb-8 text-3xl font-semibold text-text-primary md:text-4xl">{copy.why.title}</h2>
        <PointGrid points={copy.why.points} columns={4} />
      </div>
    </section>
  );
}

function SiteFooter({ copy, homeHref }: { copy: SiteCopy; homeHref: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 mt-10 overflow-hidden border-t border-border-subtle bg-bg-secondary pb-24 pt-12">
      <GlyphStrip />
      <div className="zij-container grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <a href={homeHref} className="flex items-center gap-3" dir="ltr">
            <Image src="/brand/emblem-96.png" alt="" width={44} height={44} className="h-11 w-11" />
            <span className="flex flex-col leading-none">
              <span className="font-cinzel text-2xl font-bold text-gold-primary">ZIJ.</span>
              <span className="mt-0.5 text-[9px] font-bold tracking-[0.34em] text-gold-light">TECHNOLOGIES</span>
            </span>
          </a>
          <p className="mt-4 max-w-xs text-sm leading-6 text-text-secondary">{copy.footer.tagline}</p>
        </div>
        <FooterColumn
          title={copy.footer.divisions}
          links={[
            { label: copy.nav.academy, href: "#academy" },
            { label: copy.nav.software, href: "#software" },
            { label: copy.nav.iot, href: "#iot" },
          ]}
        />
        <FooterColumn
          title={copy.footer.company}
          links={[
            { label: copy.nav.work, href: "#work" },
            { label: copy.nav.contact, href: "#contact" },
            { label: copy.footer.portal, href: "/login" },
            { label: copy.nav.language, href: copy.nav.languageHref },
          ]}
        />
        <div className="grid content-start gap-3 text-sm">
          <a href={LINKS.shoroukMap} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-text-secondary hover:text-gold-light">
            <MapPin size={16} className="text-gold-primary" /> {copy.footer.branch}
          </a>
          <a href={LINKS.stemVerify} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-text-secondary hover:text-gold-light">
            <BadgeCheck size={16} className="text-gold-primary" /> <span dir="ltr">{copy.proof.accredited}</span>
          </a>
        </div>
      </div>
      <p className="zij-container mt-10 text-xs text-text-secondary">
        © {year} ZIJ Technologies. {copy.footer.rights}
      </p>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] rtl:tracking-normal text-gold-light">{title}</p>
      <ul className="grid gap-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="text-text-secondary transition hover:text-gold-light">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
