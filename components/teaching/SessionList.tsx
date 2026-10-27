import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatSessionTime } from "@/lib/academy/format";
import { cairoParts } from "@/lib/academy/time";
import type { Locale } from "@/lib/i18n/config";
import { Pill } from "./Glass";

type SessionRow = {
  id: number;
  kind: "regular" | "remedial";
  number: number;
  scheduledAt: Date;
  status: "scheduled" | "held" | "cancelled";
  originalScheduledAt: Date | null;
  postponeReason: string | null;
  recorded: number;
  attended: number;
};

/** A group's sessions in date order with their state. */
export async function SessionList({ sessions, linkBase }: { sessions: SessionRow[]; linkBase?: string }) {
  const [t, locale] = await Promise.all([getTranslations("teaching"), getLocale() as Promise<Locale>]);
  const today = cairoParts(new Date()).date;

  return (
    <ol className="grid gap-2">
      {sessions.map((session) => {
        const day = cairoParts(session.scheduledAt).date;
        const pill =
          session.status === "held" ? (
            <Pill tone="green">
              {t("sessionState.held")} · <span className="font-dmsans tabular-nums">{Number(session.attended)}/{Number(session.recorded)}</span>
            </Pill>
          ) : session.status === "cancelled" ? (
            <Pill tone="red">{t("sessionState.cancelled")}</Pill>
          ) : day === today ? (
            <Pill tone="online" live>{t("sessionState.today")}</Pill>
          ) : day < today ? (
            <Pill tone="amber">{t("sessionState.missing")}</Pill>
          ) : session.originalScheduledAt ? (
            <Pill tone="amber">{t("sessionState.postponed")}</Pill>
          ) : (
            <Pill>{t("sessionState.scheduled")}</Pill>
          );
        const body = (
          <>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-primary/12 font-dmsans text-sm font-bold text-gold-light">
              {session.kind === "remedial" ? `R${session.number}` : session.number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{formatSessionTime(session.scheduledAt, locale)}</p>
              {session.originalScheduledAt && (
                <p className="truncate text-xs text-text-secondary">
                  {t("postponedFrom", { date: formatSessionTime(session.originalScheduledAt, locale) })}
                  {session.postponeReason ? ` · ${session.postponeReason}` : ""}
                </p>
              )}
            </div>
            {pill}
          </>
        );
        return (
          <li key={session.id}>
            {linkBase ? (
              <Link href={`${linkBase}${session.id}`} className="glass-inset flex items-center gap-3 px-3 py-2.5 transition hover:bg-gold-primary/10">
                {body}
              </Link>
            ) : (
              <div className="glass-inset flex items-center gap-3 px-3 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
