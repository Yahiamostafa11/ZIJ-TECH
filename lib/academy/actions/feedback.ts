"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/teaching";
import { QUESTIONS, questionRange } from "../feedback-questions";
import { isFeedbackExpired } from "../feedback";

/** Saves answers for a feedback link. Anyone holding the link may answer once. */
export async function submitFeedback(token: string, formData: FormData) {
  const [row] = await db.select().from(feedback).where(eq(feedback.token, token));
  if (!row || row.submittedAt) redirect(`/f/${token}`);
  if (isFeedbackExpired(row.createdAt)) redirect(`/f/${token}`);

  const answers: Record<string, number | string> = {};
  for (const question of QUESTIONS[row.respondent][row.form]) {
    const raw = String(formData.get(question.key) ?? "").trim();
    const range = questionRange(question.type);
    if (!range) {
      if (raw) answers[question.key] = raw.slice(0, 1000);
      continue;
    }
    const value = Number(raw);
    if (raw === "" || !Number.isInteger(value) || value < range[0] || value > range[1]) {
      if (question.optional) continue;
      redirect(`/f/${token}?missing=1`);
    }
    answers[question.key] = value;
  }

  await db
    .update(feedback)
    .set({ answers: JSON.stringify(answers), submittedAt: new Date() })
    .where(and(eq(feedback.id, row.id), isNull(feedback.submittedAt)));
  redirect(`/f/${token}`);
}
