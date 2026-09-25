"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { reviewNameRequest } from "@/lib/academy/actions/accounts";
import { buttonClass } from "./ui";

export function NameRequestActions({ requestId }: { requestId: number }) {
  const t = useTranslations("users");
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => void (await reviewNameRequest(requestId, true)))}
        className={buttonClass("primary")}
      >
        {t("approve")}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => void (await reviewNameRequest(requestId, false)))}
        className={buttonClass("danger")}
      >
        {t("reject")}
      </button>
    </div>
  );
}
