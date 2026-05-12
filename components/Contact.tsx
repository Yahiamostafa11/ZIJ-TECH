"use client";

import React, { useState } from "react";
import { GoldButton } from "./ui/GoldButton";
import { Reveal } from "./ui/Reveal";

const inputClass =
  "rounded-lg border border-[rgba(200,146,60,0.25)] bg-white/[0.04] p-3 text-text-primary outline-none transition placeholder:text-text-secondary/70 focus:border-gold-primary focus:shadow-[0_0_0_3px_rgba(200,146,60,0.12)]";

export function Contact() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setStatus("success");
        e.currentTarget.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="relative z-10 px-4 py-14 md:py-20">
      <Reveal className="premium-panel mx-auto max-w-[920px] rounded-xl p-6 md:p-10">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-gold-light/70">
            Contact
          </p>
          <h2 className="text-3xl font-semibold text-text-primary md:text-4xl">Get In Touch</h2>
          <p className="dir-rtl mt-4 text-center font-cairo text-lg leading-8 text-text-secondary">
            تواصل معنا لنبدأ في تحويل رؤيتك إلى واقع رقمي ملموس.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              rows={5}
              className={`${inputClass} resize-none`}
              placeholder="Tell us about your project..."
            />
          </div>

          <div className="mt-3 flex flex-col items-center gap-4">
            <GoldButton type="submit" variant="filled" className="w-full md:w-auto" disabled={status === "loading"}>
              {status === "loading" ? "Sending..." : "Send Message"}
            </GoldButton>

            {status === "success" && <p className="text-sm text-gold-light">Message sent successfully.</p>}
            {status === "error" && <p className="text-sm text-red-300">Failed to send message. Please try again.</p>}
          </div>
        </form>
      </Reveal>
    </section>
  );
}
