"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/client";
import { PasswordInput } from "./PasswordInput";
import { buttonClass } from "./ui";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("recovery");
  const [status, setStatus] = useState<"idle" | "pending" | "done" | string>("idle");

  if (status === "done") {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm text-success">{t("resetDone")}</p>
        <Link href="/login" className={buttonClass("primary")}>
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const password = String(data.get("password") ?? "");
        if (password.length < 10) return setStatus("tooShort");
        if (password !== data.get("confirm")) return setStatus("mismatch");
        setStatus("pending");
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        setStatus(error ? "invalidLink" : "done");
      }}
    >
      <label className="flex flex-col gap-2 text-sm text-text-secondary">
        {t("newPassword")}
        <PasswordInput name="password" autoComplete="new-password" required />
      </label>
      <label className="flex flex-col gap-2 text-sm text-text-secondary">
        {t("confirmPassword")}
        <PasswordInput name="confirm" autoComplete="new-password" required />
      </label>
      <button type="submit" disabled={status === "pending"} className={buttonClass("primary")}>
        {t("setPassword")}
      </button>
      {!["idle", "pending"].includes(status) && <p className="text-sm text-danger">{t(status)}</p>}
    </form>
  );
}
