"use client";

import React, { useEffect, useRef, useState } from "react";
import { GoldButton } from "@/components/ui/GoldButton";
import type { SiteCopy } from "./content";

type Division = "academy" | "software" | "iot" | "other";
const DIVISIONS: Division[] = ["academy", "software", "iot", "other"];

const inputClass =
  "w-full rounded-lg border border-border-subtle bg-field p-3 text-text-primary outline-none transition placeholder:text-text-secondary/70 focus:border-gold-primary focus:shadow-focus";

/**
 * Contact form. Links such as #contact-academy scroll here with that
 * division already chosen.
 */
export function ContactSection({ copy }: { copy: SiteCopy["contact"] }) {
  const [division, setDivision] = useState<Division>("academy");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "timeout">("idle");
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const applyHash = () => {
      const match = window.location.hash.match(/^#contact-(academy|software|iot|other)$/);
      if (!match) return;
      setDivision(match[1] as Division);
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("loading");

    const controller = new AbortController();
    // SMTP can be slow on a cold connection; stay above the server's own timeouts.
    const timeoutId = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
        signal: controller.signal,
      });
      setStatus(response.ok ? "success" : "error");
      if (response.ok) form.reset();
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === "AbortError" ? "timeout" : "error");
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  return (
    <section id="contact" ref={sectionRef} className="border-t border-border-subtle/60 py-16 md:py-24">
      <div className="zij-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] rtl:tracking-normal text-gold-light">{copy.eyebrow}</p>
          <h2 className="text-3xl font-semibold text-text-primary md:text-5xl">{copy.title}</h2>
          <p className="mt-4 text-lg leading-8 text-text-secondary">{copy.body}</p>
        </div>

        <form onSubmit={handleSubmit} className="premium-panel grid gap-5 rounded-xl p-6 md:p-8">
          {/* Honeypot: hidden from people, filled by bots. */}
          <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="company">Company website</label>
            <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm text-text-secondary">{copy.division}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {DIVISIONS.map((key) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                    division === key ? "border-gold-primary bg-gold-primary/10 text-text-primary" : "border-border-subtle text-text-secondary hover:border-gold-light/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="division"
                    value={key}
                    checked={division === key}
                    onChange={() => setDivision(key)}
                    className="accent-[rgb(var(--gold-primary))]"
                  />
                  {copy.divisions[key]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              {copy.name}
              <input name="name" required minLength={2} maxLength={100} autoComplete="name" className={inputClass} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              {copy.email}
              <input name="email" type="email" required maxLength={254} autoComplete="email" dir="ltr" className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            {copy.phone}
            <input name="phone" type="tel" maxLength={30} autoComplete="tel" dir="ltr" className={inputClass} />
          </label>
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            {copy.message}
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              placeholder={copy.messagePlaceholder}
              className={`${inputClass} resize-none`}
            />
          </label>

          <div className="flex flex-wrap items-center gap-4" aria-live="polite">
            <GoldButton type="submit" disabled={status === "loading"}>
              {status === "loading" ? copy.sending : copy.send}
            </GoldButton>
            {status === "success" && <p className="text-sm text-success">{copy.sent}</p>}
            {status === "error" && <p className="text-sm text-danger">{copy.failed}</p>}
            {status === "timeout" && <p className="text-sm text-danger">{copy.timeout}</p>}
          </div>
        </form>
      </div>
    </section>
  );
}
