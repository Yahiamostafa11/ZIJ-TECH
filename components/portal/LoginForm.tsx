"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { GoldButton } from "@/components/ui/GoldButton";

const inputClass =
  "rounded-lg border border-border-subtle bg-field p-3 text-text-primary outline-none transition focus:border-gold-primary focus:shadow-focus";

export function LoginForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsPending(true);
    setError("");

    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (signInError) {
      setIsPending(false);
      setError(
        signInError.status === 429
          ? t("tooMany")
          : signInError.status === 401
            ? t("invalid")
            : t("failed"),
      );
      return;
    }

    // /admin forwards each user to the portal their roles allow.
    router.replace("/admin");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm text-text-secondary">
        {t("email")}
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          dir="ltr"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-text-secondary">
        {t("password")}
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className={inputClass}
        />
      </label>
      <GoldButton type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? t("submitting") : t("submit")}
      </GoldButton>
      <p role="alert" className="min-h-5 text-center text-sm text-danger">
        {error}
      </p>
    </form>
  );
}
