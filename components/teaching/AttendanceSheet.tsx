"use client";

import React, { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import type { ActionState } from "@/lib/forms";
import { buttonClass, inputClass } from "@/components/portal/ui";

const CRITERIA = ["understanding", "computational", "building", "creativity", "collaboration", "conduct"] as const;
const STATUSES = ["present", "late", "absent", "excused"] as const;
type Criterion = (typeof CRITERIA)[number];
type Status = (typeof STATUSES)[number];
type Scores = Record<Criterion, number | null>;

export type SheetRow = {
  studentId: number;
  name: string;
  phones: { relation: string; phone: string; whatsapp: string }[];
  record: { status: Status; note: string | null; scores: Scores } | null;
};

type Entry = { status: Status; note: string; scores: Scores };

const DEFAULT_SCORE = 3;
const fullScores = (value: number | null = DEFAULT_SCORE) =>
  Object.fromEntries(CRITERIA.map((criterion) => [criterion, value])) as Scores;

const statusTone: Record<Status, string> = {
  present: "bg-success/15 text-success",
  late: "bg-warning/15 text-warning",
  absent: "bg-danger/15 text-danger",
  excused: "bg-info/15 text-info",
};

/**
 * Attendance and per-criterion evaluation for one session. Every present
 * student starts at level 3 ("meets"); the instructor changes the exceptions.
 */
export function AttendanceSheet({
  action,
  rows,
  editable,
  absenceMessage,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  rows: SheetRow[];
  editable: boolean;
  /** WhatsApp text for a guardian; `{name}` is replaced by the student's name. */
  absenceMessage: string;
}) {
  const t = useTranslations("teaching");
  const tErrors = useTranslations("errors");
  const tMessages = useTranslations("messages");
  const [state, formAction, pending] = useActionState(action, {});
  const [entries, setEntries] = useState<Record<number, Entry>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.studentId,
        row.record
          ? {
              status: row.record.status,
              note: row.record.note ?? "",
              scores: Object.fromEntries(
                CRITERIA.map((criterion) => [criterion, row.record!.scores[criterion] ?? DEFAULT_SCORE]),
              ) as Scores,
            }
          : { status: "present" as Status, note: "", scores: fullScores() },
      ]),
    ),
  );

  const update = (studentId: number, patch: Partial<Entry>) =>
    setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));

  const sheet = useMemo(
    () =>
      JSON.stringify(
        rows.map((row) => {
          const entry = entries[row.studentId];
          const scored = entry.status === "present" || entry.status === "late";
          return { studentId: row.studentId, status: entry.status, note: entry.note.trim() || null, scores: scored ? entry.scores : fullScores(null) };
        }),
      ),
    [entries, rows],
  );

  const counts = STATUSES.map((status) => [status, rows.filter((row) => entries[row.studentId].status === status).length] as const);
  const savedAbsent = rows.filter((row) => (state.ok ? entries[row.studentId].status : row.record?.status) === "absent");

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="sheet" value={sheet} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {counts.map(([status, count]) => (
            <span key={status} className={`rounded-full px-2.5 py-1 font-bold ${statusTone[status]}`}>
              {t(`status.${status}`)} · <span className="font-dmsans tabular-nums">{count}</span>
            </span>
          ))}
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass("ghost")}
              onClick={() => setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, entry]) => [id, { ...entry, status: "present" }])))}
            >
              {t("allPresent")}
            </button>
            <button
              type="button"
              className={buttonClass("ghost")}
              onClick={() => setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, entry]) => [id, { ...entry, scores: fullScores() }])))}
            >
              {t("resetScores")}
            </button>
          </div>
        )}
      </div>

      <details className="glass-inset px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-gold-light">{t("rubric.title")}</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {CRITERIA.map((criterion) => (
            <div key={criterion}>
              <p className="font-semibold text-text-primary">{t(`criteria.${criterion}`)}</p>
              <p className="text-xs leading-6 text-text-secondary">{t(`criteriaHint.${criterion}`)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          {[1, 2, 3, 4].map((level) => `${level} ${t(`levels.${level}`)}`).join(" · ")}
        </p>
      </details>

      <ul className="grid gap-3">
        {rows.map((row) => {
          const entry = entries[row.studentId];
          const scored = entry.status === "present" || entry.status === "late";
          return (
            <li key={row.studentId} className="glass-inset grid gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <bdi className="font-bold text-text-primary">{row.name}</bdi>
                <div role="radiogroup" aria-label={t("attendanceOf", { name: row.name })} className="inline-flex overflow-hidden rounded-xl border border-border-subtle">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      role="radio"
                      aria-checked={entry.status === status}
                      disabled={!editable}
                      onClick={() => update(row.studentId, { status })}
                      className={`px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                        entry.status === status ? statusTone[status] : "text-text-secondary hover:bg-hover"
                      }`}
                    >
                      {t(`status.${status}`)}
                    </button>
                  ))}
                </div>
              </div>

              {scored && (
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                  {CRITERIA.map((criterion) => (
                    <div key={criterion} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-text-secondary">{t(`criteria.${criterion}`)}</span>
                      <div role="radiogroup" aria-label={`${t(`criteria.${criterion}`)} · ${row.name}`} className="flex gap-1" dir="ltr">
                        {[1, 2, 3, 4].map((level) => {
                          const on = (entry.scores[criterion] ?? 0) >= level;
                          return (
                            <button
                              key={level}
                              type="button"
                              role="radio"
                              aria-checked={entry.scores[criterion] === level}
                              title={t(`levels.${level}`)}
                              disabled={!editable}
                              onClick={() => update(row.studentId, { scores: { ...entry.scores, [criterion]: level } })}
                              className={`h-6 w-6 rounded-md text-[11px] font-bold transition disabled:cursor-not-allowed ${
                                on ? "bg-gold-gradient text-on-accent" : "bg-text-primary/[0.07] text-text-secondary hover:bg-gold-primary/20"
                              }`}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input
                id={`note-${row.studentId}`}
                aria-label={t("noteFor", { name: row.name })}
                value={entry.note}
                maxLength={500}
                disabled={!editable}
                onChange={(event) => update(row.studentId, { note: event.target.value })}
                placeholder={entry.status === "absent" ? t("notePlaceholderAbsent") : t("notePlaceholder")}
                className={inputClass}
              />
            </li>
          );
        })}
      </ul>

      {editable && (
        <div className="flex flex-wrap items-center gap-4" aria-live="polite">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? t("saving") : t("saveSession")}
          </button>
          <p className={`text-sm ${state.error ? "text-danger" : "text-success"}`}>
            {state.error ? tErrors(state.error) : state.message ? tMessages(state.message) : ""}
          </p>
        </div>
      )}

      {savedAbsent.length > 0 && (
        <div className="glass-inset grid gap-3 p-4">
          <p className="text-sm font-semibold text-text-primary">{t("absentNotify")}</p>
          <ul className="grid gap-2">
            {savedAbsent.map((row) => (
              <li key={row.studentId} className="flex flex-wrap items-center justify-between gap-2">
                <bdi className="text-sm">{row.name}</bdi>
                <div className="flex flex-wrap gap-2">
                  {row.phones.map((phone) => (
                    <a
                      key={phone.phone}
                      href={`https://wa.me/${phone.whatsapp}?text=${encodeURIComponent(absenceMessage.replace("{name}", row.name))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success hover:bg-success/25"
                    >
                      <MessageCircle size={14} /> {t(`relation.${phone.relation}`)}
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
