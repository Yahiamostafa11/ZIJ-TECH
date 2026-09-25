import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/portal/SignOutButton";
import { homePathFor } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";

export default async function ForbiddenPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const home = homePathFor(user.grants);

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
      <div className="premium-panel max-w-md rounded-xl p-8 text-center">
        <h1 className="text-xl font-semibold text-gold-light">{t("forbidden.title")}</h1>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {home ? t("forbidden.body") : t("forbidden.noRoles")}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {home && (
            <Link href={home} className="text-sm text-gold-light underline-offset-4 hover:underline">
              {t("common.backToHub")}
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
