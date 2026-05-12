"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { SectionTitle } from "./ui/SectionTitle";
import { GoldButton } from "./ui/GoldButton";

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
        (e.target as HTMLFormElement).reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="py-24 relative z-10">
      <div className="container mx-auto px-6 md:px-12 max-w-4xl">
        <SectionTitle
          title="Get In Touch"
          subtitle="تواصل معنا لنبدأ في تحويل رؤيتك إلى واقع رقمي ملموس."
          align="center"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card rounded-xl p-8 md:p-12 mt-12"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="font-dmsans text-text-secondary text-sm">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="bg-bg-primary border border-border-subtle rounded-lg p-3 text-text-primary focus:outline-none focus:border-gold-primary transition-colors"
                  placeholder="John Doe"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="font-dmsans text-text-secondary text-sm">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="bg-bg-primary border border-border-subtle rounded-lg p-3 text-text-primary focus:outline-none focus:border-gold-primary transition-colors"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="message" className="font-dmsans text-text-secondary text-sm">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className="bg-bg-primary border border-border-subtle rounded-lg p-3 text-text-primary focus:outline-none focus:border-gold-primary transition-colors resize-none"
                placeholder="Tell us about your project..."
              />
            </div>

            <div className="mt-4 flex flex-col items-center gap-4">
              <GoldButton type="submit" variant="filled" className="w-full md:w-auto" disabled={status === "loading"}>
                {status === "loading" ? "Sending..." : "Send Message"}
              </GoldButton>
              
              {status === "success" && (
                <p className="text-green-500 font-dmsans text-sm">Message sent successfully!</p>
              )}
              {status === "error" && (
                <p className="text-red-500 font-dmsans text-sm">Failed to send message. Please try again.</p>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
