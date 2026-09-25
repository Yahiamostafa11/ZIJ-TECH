"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { classGroup } from "@/lib/db/academy";
import { parseWorkbook, type ImportField, type ParsedSheet } from "../import/parse";
import { runImport, type SheetResult } from "../import/run";
import { nameKey } from "../normalize";
import { groupScopeCondition } from "../scope";

const MAX_BYTES = 5 * 1024 * 1024;

export type SheetSummary = {
  name: string;
  headerFound: boolean;
  rowCount: number;
  errorCount: number;
  warningCount: number;
  columns: ImportField[];
  ignoredHeaders: string[];
};

export type ImportResponse =
  | { error: string }
  | { stage: "sheets"; sheets: SheetSummary[]; suggested: Record<string, number | null> }
  | { stage: "preview" | "done"; results: SheetResult[] };

export async function analyzeImport(formData: FormData): Promise<ImportResponse> {
  const user = await requirePermission("students.import");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "noFile" };
  if (file.size > MAX_BYTES) return { error: "fileTooLarge" };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "notXlsx" };

  let sheets: ParsedSheet[];
  try {
    sheets = await parseWorkbook(await file.arrayBuffer());
  } catch {
    return { error: "unreadableFile" };
  }
  if (sheets.length === 0) return { error: "unreadableFile" };

  const rawMapping = formData.get("mapping");
  if (typeof rawMapping !== "string" || !rawMapping) {
    const groups = await db
      .select({ id: classGroup.id, name: classGroup.name })
      .from(classGroup)
      .where(groupScopeCondition(user));
    const preselected = Number(formData.get("group")) || null;

    return {
      stage: "sheets",
      sheets: sheets.map((sheet) => ({
        name: sheet.name,
        headerFound: sheet.headerRow !== null,
        rowCount: sheet.rows.length,
        errorCount: sheet.rows.filter((row) => row.errors.length).length,
        warningCount: sheet.rows.filter((row) => row.warnings.length).length,
        columns: Object.keys(sheet.columns) as ImportField[],
        ignoredHeaders: sheet.ignoredHeaders,
      })),
      suggested: Object.fromEntries(
        sheets.map((sheet) => {
          const byName = groups.find((group) => nameKey(group.name) === nameKey(sheet.name));
          const single = sheets.length === 1 && preselected ? preselected : null;
          return [sheet.name, byName?.id ?? single];
        }),
      ),
    };
  }

  let mapping: Record<string, number>;
  try {
    const parsed = JSON.parse(rawMapping) as Record<string, unknown>;
    mapping = Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => Number.isInteger(value) && Number(value) > 0)
        .map(([key, value]) => [key, Number(value)]),
    );
  } catch {
    return { error: "invalidMapping" };
  }
  const groupIds = [...new Set(Object.values(mapping))];
  if (groupIds.length === 0) return { error: "noMapping" };

  const groups = await db.select().from(classGroup).where(inArray(classGroup.id, groupIds));
  if (
    groups.length !== groupIds.length ||
    groups.some((group) => !can(user.grants, "students.import", group.branchId))
  ) {
    return { error: "outOfScope" };
  }

  const commit = formData.get("commit") === "1";
  const results = await runImport({
    sheets,
    mapping,
    actorId: user.id,
    fileName: file.name.slice(0, 255),
    dryRun: !commit,
  });

  if (commit) {
    revalidatePath("/admin/academy", "layout");
  }
  return { stage: commit ? "done" : "preview", results };
}
