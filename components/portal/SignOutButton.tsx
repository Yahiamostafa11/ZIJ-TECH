"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-text-secondary transition hover:bg-gold-primary/10 hover:text-gold-light disabled:opacity-60"
    >
      <LogOut size={16} strokeWidth={1.6} className="rtl:-scale-x-100" />
      {t("signOut")}
    </button>
  );
}
