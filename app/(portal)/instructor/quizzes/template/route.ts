import { buildQuizTemplate } from "@/lib/academy/quiz";
import { requirePermission } from "@/lib/auth/session";

export const runtime = "nodejs";

/** GET /instructor/quizzes/template → the Excel file instructors fill in. */
export async function GET() {
  await requirePermission("teaching.grades");
  const buffer = await buildQuizTemplate();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="zij-quiz-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
