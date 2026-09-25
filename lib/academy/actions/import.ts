"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { GROUP_MODES, classGroup, level } from "@/lib/db/academy";
import { branch, userRole } from "@/lib/db/schema";
import { parseWorkbook, type ImportField, type ParsedSheet } from "../import/parse";
import { runImport, type SheetResult, type SheetTarget } from "../import/run";
import { sheetNameFor } from "../import/sheet-name";
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
  /** Most common subscription in the tab, to pre-fill a new group's price. */
  suggestedPrice: number | null;
  /** The tab name mentions online (أونلاين / online). */
  looksOnline: boolean;
};

export type ImportResponse =
  | { error: string }
  | { stage: "sheets"; sheets: SheetSummary[]; suggested: Record<string, number | null> }
  | { stage: "preview" | "done"; results: SheetResult[] };

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  levelId: z.number().int().positive(),
  mode: z.enum(GROUP_MODES),
  branchId: z.number().int().positive().nullable(),
  instructorId: z.string().min(1).max(36).nullable(),
  price: z.number().min(0).max(1_000_000),
});

const mappingSchema = z.record(
  z.string(),
  z.union([z.object({ groupId: z.number().int().positive() }), z.object({ create: createSchema })]),
);

function mostCommon(values: number[]) {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

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
        suggestedPrice: mostCommon(sheet.rows.flatMap((row) => (row.price === null ? [] : [row.price]))),
        looksOnline: /online|اونلاين|أونلاين|أون لاين|اون لاين/i.test(sheet.name),
      })),
      suggested: Object.fromEntries(
        sheets.map((sheet) => {
          const byName =
            groups.find((group) => nameKey(group.name) === nameKey(sheet.name)) ??
            groups.find((group) => nameKey(sheetNameFor(group.name)) === nameKey(sheet.name));
          const single = sheets.length === 1 && preselected ? preselected : null;
          return [sheet.name, byName?.id ?? single];
        }),
      ),
    };
  }

  let mapping: Record<string, SheetTarget>;
  try {
    const parsed = mappingSchema.safeParse(JSON.parse(rawMapping));
    if (!parsed.success) return { error: "invalidMapping" };
    mapping = parsed.data;
  } catch {
    return { error: "invalidMapping" };
  }
  if (Object.keys(mapping).length === 0) return { error: "noMapping" };

  const scopeError = await checkTargets(user, mapping);
  if (scopeError) return { error: scopeError };

  const commit = formData.get("commit") === "1";
  const results = await runImport({
    sheets,
    mapping,
    actorId: user.id,
    fileName: file.name.slice(0, 255),
    dryRun: !commit,
  });

  if (commit) revalidatePath("/admin/academy", "layout");
  return { stage: commit ? "done" : "preview", results };
}

/** Every target must be a group the user may import into, or a valid new group they may create. */
async function checkTargets(
  user: Awaited<ReturnType<typeof requirePermission>>,
  mapping: Record<string, SheetTarget>,
) {
  const targets = Object.values(mapping);
  const existingIds = [...new Set(targets.flatMap((target) => ("groupId" in target ? [target.groupId] : [])))];
  if (existingIds.length) {
    const groups = await db.select().from(classGroup).where(inArray(classGroup.id, existingIds));
    if (
      groups.length !== existingIds.length ||
      groups.some((group) => !can(user.grants, "students.import", group.branchId))
    ) {
      return "outOfScope";
    }
  }

  for (const target of targets) {
    if (!("create" in target)) continue;
    const spec = target.create;
    const branchId = spec.mode === "online" ? null : spec.branchId;
    if (spec.mode === "offline" && branchId === null) return "invalidMapping";
    if (!can(user.grants, "groups.write", branchId)) return "cannotCreateGroup";

    const [levelRow] = await db
      .select({ id: level.id })
      .from(level)
      .where(and(eq(level.id, spec.levelId), eq(level.active, true)));
    if (!levelRow) return "invalidMapping";

    if (branchId !== null) {
      const [branchRow] = await db
        .select({ id: branch.id })
        .from(branch)
        .where(and(eq(branch.id, branchId), eq(branch.active, true)));
      if (!branchRow) return "invalidMapping";
    }

    if (spec.instructorId) {
      const [instructor] = await db
        .select({ id: userRole.id })
        .from(userRole)
        .where(and(eq(userRole.userId, spec.instructorId), eq(userRole.role, "instructor")));
      if (!instructor) return "invalidMapping";
    }
  }
  return null;
}
