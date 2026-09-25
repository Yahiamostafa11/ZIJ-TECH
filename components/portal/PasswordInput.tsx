"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { inputClass } from "./ui";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

/** Password field with a button that shows or hides what was typed. */
export function PasswordInput(props: Props) {
  const t = useTranslations("login");
  const [visible, setVisible] = useState(false);

  return (
    // Passwords are typed left to right, so the button sits on the right in both languages.
    <div className="relative" dir="ltr">
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-text-secondary transition hover:text-gold-light focus-visible:text-gold-light focus-visible:outline-none"
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
