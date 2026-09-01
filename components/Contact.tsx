"use client";

import React, { useEffect, useState } from "react";
import { GoldButton } from "./ui/GoldButton";
import { Reveal } from "./ui/Reveal";

const inputClass =
  "rounded-lg border border-[rgba(200,146,60,0.25)] bg-white/[0.04] p-3 text-text-primary outline-none transition placeholder:text-text-secondary/70 focus:border-gold-primary focus:shadow-[0_0_0_3px_rgba(200,146,60,0.12)]";

export function Contact() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (status !== "success" && status !== "error") return;

    const timeoutId = window.setTimeout(() => {
      setStatus("idle");
      setFeedback("");
    }, 6_000);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("loading");
    setFeedback("");

    const formData = new FormData(form);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
      company: formData.get("company"),
    };

    const controller = new AbortController();
    // SMTP can take longer on a cold connection. Keep the browser timeout
    // above the transport timeouts to avoid reporting failure after delivery.
    const timeoutId = window.setTimeout(() => controller.abort(), 45_000);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (response.ok) {
        setStatus("success");
        setFeedback("Message sent successfully.");
        form.reset();
      } else {
        setStatus("error");
        setFeedback("Failed to send message. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof DOMException && error.name === "AbortError"
          ? "Sending took too long. Please check your inbox before trying again."
          : "Failed to send message. Please try again.",
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  return (
    <section id="contact" className="relative z-10 px-4 py-10 md:py-20">
      <Reveal className="premium-panel mx-auto max-w-[920px] rounded-xl p-6 md:p-10">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-gold-light/70">
            Contact
          </p>
          <h2 className="text-3xl font-semibold text-text-primary md:text-4xl">Get In Touch</h2>
          <p lang="ar" dir="rtl" className="mt-4 text-center font-cairo text-lg leading-8 text-text-secondary">
            تواصل معنا لنبدأ في تحويل رؤيتك إلى واقع رقمي ملموس.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="company">Company website</label>
            <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm text-text-secondary">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                className={inputClass}
                placeholder="John Doe"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm text-text-secondary">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                inputMode="email"
                className={inputClass}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="message" className="text-sm text-text-secondary">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              className={`${inputClass} resize-none`}
              placeholder="Tell us about your project..."
            />
          </div>

          <div className="mt-3 flex flex-col items-center gap-4" aria-live="polite">
            <GoldButton type="submit" variant="filled" className="w-full md:w-auto" disabled={status === "loading"}>
              {status === "loading" ? "Sending..." : "Send Message"}
            </GoldButton>

            {(status === "success" || status === "error") && (
              <p className={`text-sm ${status === "success" ? "text-gold-light" : "text-red-300"}`}>
                {feedback}
              </p>
            )}
          </div>
        </form>
      </Reveal>
    </section>
  );
}
