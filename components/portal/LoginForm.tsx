"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { parseLogin } from "@/lib/auth/accounts";
import { authClient } from "@/lib/auth/client";
import { GoldButton } from "@/components/ui/GoldButton";
import { PasswordInput } from "./PasswordInput";
import { inputClass } from "./ui";

export function LoginForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const login = parseLogin(String(form.get("login") ?? ""));
    const password = String(form.get("password") ?? "");
    setIsPending(true);
    setError("");

    // Staff sign in with email; students and parents with name@zij-academy.
    const { error: signInError } =
      "username" in login
        ? await authClient.signIn.username({ username: login.username, password })
        : await authClient.signIn.email({ email: login.email, password });

    if (signInError) {
      setIsPending(false);
      setError(
        signInError.status === 429
          ? t("tooMany")
          : signInError.status === 401 || signInError.status === 400
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
        {t("login")}
        <input
          type="text"
          name="login"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          dir="ltr"
          placeholder="name@zij-academy"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-text-secondary">
        {t("password")}
        <PasswordInput name="password" required autoComplete="current-password" />
      </label>
      <GoldButton type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? t("submitting") : t("submit")}
      </GoldButton>
      <p role="alert" className="min-h-5 text-center text-sm text-danger">
        {error}
      </p>
      <Link href="/forgot-password" className="text-center text-sm text-gold-light hover:underline">
        {t("forgot")}
      </Link>
    </form>
  );
}
