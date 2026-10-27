import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { AtSign, ExternalLink, Megaphone, ThumbsUp } from "lucide-react";
import { formatDateTime } from "@/lib/academy/format";
import type { announcement } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";
import { Pill } from "./Glass";

const ICONS = { notice: Megaphone, mention: AtSign, post: ThumbsUp } as const;

export async function AnnouncementCard({ item, unread }: { item: typeof announcement.$inferSelect; unread: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("announcements"), getLocale() as Promise<Locale>]);
  const Icon = ICONS[item.kind];
  return (
    <article className={`glass grid gap-2 p-5 ${unread ? "border-gold-light/70" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="glass-inset grid h-8 w-8 place-items-center text-gold-light">
            <Icon size={16} />
          </span>
          <h2 className="font-bold text-text-primary">{item.title}</h2>
        </span>
        <span className="flex items-center gap-2">
          {unread && <Pill tone="amber" live>{t("new")}</Pill>}
          <Pill tone={item.kind === "notice" ? "neutral" : "online"}>{t(`kinds.${item.kind}`)}</Pill>
        </span>
      </div>
      {item.body && <p className="whitespace-pre-line text-sm leading-7 text-text-primary">{item.body}</p>}
      {item.link && (
        <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-info hover:underline">
          <ExternalLink size={14} /> {t(`open.${item.kind}`)}
        </a>
      )}
      <p className="text-xs text-text-secondary">{formatDateTime(item.createdAt, locale)}</p>
    </article>
  );
}
