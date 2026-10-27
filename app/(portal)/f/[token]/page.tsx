import React from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { submitFeedback } from "@/lib/academy/actions/feedback";
import { QUESTIONS, type Question } from "@/lib/academy/feedback-questions";
import { isFeedbackExpired } from "@/lib/academy/feedback";
import { localized } from "@/lib/academy/format";
import { db } from "@/lib/db";
import { classGroup, level, student } from "@/lib/db/academy";
import { user } from "@/lib/db/schema";
import { classSession, feedback } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export const metadata = { title: "Zij Academy", robots: { index: false } };

const EMOJI = ["😕", "😐", "😄"];

function Choice({ name, value, label, big = false }: { name: string; value: number; label: React.ReactNode; big?: boolean }) {
  return (
    <label className="relative flex-1">
      <input type="radio" name={name} value={value} required className="peer sr-only" />
      <span
        className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-border-subtle px-2 py-2 text-center font-semibold text-text-secondary transition hover:border-gold-light/60 peer-checked:border-gold-primary peer-checked:bg-gold-primary/20 peer-checked:text-text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-gold-primary ${
          big ? "text-3xl" : "text-sm"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

export default async function FeedbackPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ missing?: string }> }) {
  const { token } = await params;
  const missing = (await searchParams).missing === "1";
  const [row] = await db
    .select({
      feedback,
      number: classSession.number,
      kind: classSession.kind,
      groupName: classGroup.name,
      levelNameAr: level.nameAr,
      levelNameEn: level.nameEn,
      nameAr: student.nameAr,
      nameEn: student.nameEn,
      instructorName: user.name,
    })
    .from(feedback)
    .innerJoin(classSession, eq(classSession.id, feedback.sessionId))
    .innerJoin(classGroup, eq(classGroup.id, classSession.groupId))
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .innerJoin(student, eq(student.id, feedback.studentId))
    .leftJoin(user, eq(user.id, classGroup.instructorId))
    .where(eq(feedback.token, token));
  if (!row) notFound();

  const [t, locale] = await Promise.all([getTranslations("feedback"), getLocale() as Promise<Locale>]);
  const { respondent, form } = row.feedback;
  const name = localized(locale, row.nameAr, row.nameEn).split(" ")[0];
  const expired = isFeedbackExpired(row.feedback.createdAt);
  const session = row.kind === "remedial" ? t("remedial", { number: row.number }) : t("session", { number: row.number });

  const field = (question: Question) => {
    const label = t(`q.${respondent}.${question.key}`, { name });
    switch (question.type) {
      case "scale5":
        return (
          <fieldset key={question.key} className="grid gap-2">
            <legend className="mb-2 font-semibold text-text-primary">{label}</legend>
            <div className="flex gap-2" dir="ltr">
              {[1, 2, 3, 4, 5].map((value) => (
                <Choice key={value} name={question.key} value={value} label={value} />
              ))}
            </div>
            <div className="flex justify-between text-xs text-text-secondary" dir="ltr">
              <span>{t("scaleLow")}</span>
              <span>{t("scaleHigh")}</span>
            </div>
          </fieldset>
        );
      case "nps":
        return (
          <fieldset key={question.key} className="grid gap-2">
            <legend className="mb-2 font-semibold text-text-primary">{label}</legend>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11" dir="ltr">
              {Array.from({ length: 11 }, (_, value) => (
                <Choice key={value} name={question.key} value={value} label={value} />
              ))}
            </div>
            <div className="flex justify-between text-xs text-text-secondary" dir="ltr">
              <span>{t("npsLow")}</span>
              <span>{t("npsHigh")}</span>
            </div>
          </fieldset>
        );
      case "yesno":
        return (
          <fieldset key={question.key} className="grid gap-2">
            <legend className="mb-2 font-semibold text-text-primary">{label}</legend>
            <div className="flex gap-2">
              <Choice name={question.key} value={1} label={t("yes")} />
              <Choice name={question.key} value={0} label={t("no")} />
            </div>
          </fieldset>
        );
      case "emoji3":
        return (
          <fieldset key={question.key} className="grid gap-2">
            <legend className="mb-2 font-semibold text-text-primary">{label}</legend>
            <div className="flex gap-2" dir="ltr">
              {EMOJI.map((emoji, index) => (
                <Choice key={emoji} name={question.key} value={index + 1} label={<span aria-label={t(`emoji.${index + 1}`)}>{emoji}</span>} big />
              ))}
            </div>
          </fieldset>
        );
      case "difficulty":
        return (
          <fieldset key={question.key} className="grid gap-2">
            <legend className="mb-2 font-semibold text-text-primary">{label}</legend>
            <div className="flex gap-2">
              {[1, 2, 3].map((value) => (
                <Choice key={value} name={question.key} value={value} label={t(`difficulty.${value}`)} />
              ))}
            </div>
          </fieldset>
        );
      case "text":
        return (
          <label key={question.key} className="grid gap-2">
            <span className="font-semibold text-text-primary">
              {label} {question.optional && <span className="text-xs font-normal text-text-secondary">({t("optional")})</span>}
            </span>
            <textarea
              name={question.key}
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-border-subtle bg-field p-3 text-text-primary outline-none focus:border-gold-primary"
            />
          </label>
        );
    }
  };

  return (
    <main className="relative min-h-screen px-4 py-10">
      <div className="teaching-glow" aria-hidden="true" />
      <div className="mx-auto grid max-w-xl gap-6">
        <header className="text-center">
          <p className="font-cinzel text-3xl font-bold text-gold-primary" dir="ltr">
            ZIJ.
          </p>
          <h1 className="mt-3 text-2xl font-extrabold text-text-primary">
            {respondent === "parent" ? t("parentTitle") : t("studentTitle", { name })}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            <bdi>{row.groupName}</bdi> · {localized(locale, row.levelNameAr, row.levelNameEn)} · {session}
            {row.instructorName ? ` · ${row.instructorName}` : ""}
          </p>
        </header>

        {row.feedback.submittedAt ? (
          <div className="glass p-8 text-center">
            <p className="text-4xl" aria-hidden="true">
              🌟
            </p>
            <p className="mt-3 text-lg font-bold text-text-primary">{t("thanks")}</p>
            <p className="mt-1 text-sm text-text-secondary">{t("thanksBody")}</p>
          </div>
        ) : expired ? (
          <div className="glass p-8 text-center text-text-secondary">{t("expired")}</div>
        ) : (
          <form action={submitFeedback.bind(null, token)} className="glass grid gap-7 p-6 md:p-8">
            <p className="text-sm text-text-secondary">{respondent === "parent" ? t("parentIntro", { name }) : t("studentIntro")}</p>
            {missing && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{t("missing")}</p>}
            {QUESTIONS[respondent][form].map(field)}
            <button type="submit" className="rounded-xl bg-gold-gradient px-6 py-3 font-bold text-on-accent transition hover:brightness-110">
              {t("submit")}
            </button>
            <p className="text-center text-xs text-text-secondary">{t("privacy")}</p>
          </form>
        )}
      </div>
    </main>
  );
}
