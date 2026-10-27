"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/portal/ui";

export type RunnerQuestion = {
  id: number;
  kind: "mcq" | "essay";
  text: string;
  points: number;
  options: { index: number; text: string }[];
};

type Answers = Record<string, number | string>;

/**
 * Takes a quiz: saves answers as the student goes, counts leaving the page
 * and copying, and hands in automatically when the time is up.
 */
export function QuizRunner({
  quizId,
  questions,
  initial,
  deadline,
  save,
  submit,
  log,
}: {
  quizId: number;
  questions: RunnerQuestion[];
  initial: Answers;
  /** Epoch milliseconds, or null without a time limit. */
  deadline: number | null;
  save: (quizId: number, answers: Answers) => Promise<{ ok: boolean }>;
  submit: (quizId: number, answers: Answers) => Promise<{ ok: boolean }>;
  log: (quizId: number, kind: "blur" | "copy" | "paste") => Promise<void>;
}) {
  const t = useTranslations("quizzes.take");
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initial);
  const [left, setLeft] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [warned, setWarned] = useState(0);
  const answersRef = useRef(answers);
  const lastLog = useRef(0);
  const done = useRef(false);

  const handIn = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    setSending(true);
    await submit(quizId, answersRef.current);
    router.refresh();
  }, [quizId, router, submit]);

  // Autosave a second after the last change.
  useEffect(() => {
    answersRef.current = answers;
    const timer = window.setTimeout(() => void save(quizId, answers), 1000);
    return () => window.clearTimeout(timer);
  }, [answers, quizId, save]);

  // Countdown, and hand in when time runs out.
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const remaining = Math.max(0, deadline - Date.now());
      setLeft(remaining);
      if (remaining === 0) void handIn();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline, handIn]);

  // Leaving the page or copying is recorded for the instructor.
  useEffect(() => {
    const record = (kind: "blur" | "copy" | "paste") => {
      if (done.current) return;
      const now = Date.now();
      if (kind === "blur" && now - lastLog.current < 2000) return;
      lastLog.current = now;
      if (kind === "blur") setWarned((count) => count + 1);
      void log(quizId, kind);
    };
    const onVisibility = () => document.visibilityState === "hidden" && record("blur");
    const onBlur = () => record("blur");
    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      record("copy");
    };
    const onPaste = () => record("paste");
    const onContext = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [log, quizId]);

  const answered = questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== "").length;
  const clock = left === null ? null : `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="grid select-none gap-5">
      <div className="glass sticky top-20 z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <span className="text-sm font-semibold">{t("progress", { answered, total: questions.length })}</span>
        {clock && (
          <span className={`font-dmsans text-lg font-bold tabular-nums ${left! < 60_000 ? "text-danger" : "text-gold-light"}`} dir="ltr" aria-live="off">
            {clock}
          </span>
        )}
      </div>

      {warned > 0 && <p className="rounded-xl bg-warning/15 px-4 py-3 text-sm text-warning">{t("leftWarning", { count: warned })}</p>}

      <ol className="grid gap-4">
        {questions.map((question, index) => (
          <li key={question.id} className="glass grid gap-3 p-5">
            <p className="font-semibold text-text-primary">
              {index + 1}. {question.text} <span className="text-xs font-normal text-text-secondary">({t("points", { points: question.points })})</span>
            </p>
            {question.kind === "mcq" ? (
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                {question.options.map((option) => {
                  const chosen = answers[question.id] === option.index;
                  return (
                    <button
                      key={option.index}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.index }))}
                      className={`rounded-xl border px-4 py-3 text-start text-sm transition ${
                        chosen ? "border-gold-primary bg-gold-primary/20 font-semibold text-text-primary" : "border-border-subtle text-text-secondary hover:border-gold-light/60"
                      }`}
                    >
                      {option.text}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                rows={4}
                maxLength={5000}
                value={typeof answers[question.id] === "string" ? String(answers[question.id]) : ""}
                onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                aria-label={t("yourAnswer")}
                className="w-full select-text resize-y rounded-xl border border-border-subtle bg-field p-3 text-text-primary outline-none focus:border-gold-primary"
              />
            )}
          </li>
        ))}
      </ol>

      <div className="glass flex flex-wrap items-center gap-3 p-5">
        {confirming ? (
          <>
            <p className="text-sm">{answered < questions.length ? t("confirmMissing", { missing: questions.length - answered }) : t("confirm")}</p>
            <button type="button" disabled={sending} onClick={() => void handIn()} className={buttonClass("primary")}>
              {sending ? t("sending") : t("yesSubmit")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost")}>
              {t("back")}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={buttonClass("primary")}>
            {t("submit")}
          </button>
        )}
      </div>
    </div>
  );
}
