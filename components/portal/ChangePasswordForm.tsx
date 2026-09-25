"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/client";
import { Field, buttonClass, inputClass } from "./ui";

export function ChangePasswordForm() {
  const t = useTranslations("account");
  const [status, setStatus] = useState<{ tone: "error" | "ok"; key: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const next = String(data.get("newPassword") ?? "");
    if (next.length < 10) return setStatus({ tone: "error", key: "tooShort" });
    if (next !== data.get("confirmPassword")) return setStatus({ tone: "error", key: "mismatch" });

    setIsPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(data.get("currentPassword") ?? ""),
      newPassword: next,
      revokeOtherSessions: true,
    });
    setIsPending(false);
    if (error) return setStatus({ tone: "error", key: error.status === 400 ? "wrongCurrent" : "failed" });
    form.reset();
    setStatus({ tone: "ok", key: "changed" });
  };

  return (
    <form onSubmit={handleSubmit} className="grid max-w-md gap-4">
      {(["currentPassword", "newPassword", "confirmPassword"] as const).map((name) => (
        <Field key={name} label={t(name)} htmlFor={name}>
          <input
            id={name}
            name={name}
            type="password"
            dir="ltr"
            autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
            required
            className={inputClass}
          />
        </Field>
      ))}
      <button type="submit" disabled={isPending} className={buttonClass("primary")}>
        {t("submit")}
      </button>
      {status && (
        <p role="status" className={`text-sm ${status.tone === "ok" ? "text-success" : "text-danger"}`}>
          {t(status.key)}
        </p>
      )}
    </form>
  );
}
