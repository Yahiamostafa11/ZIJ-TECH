"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { GROUP_MODES, GROUP_STATUSES, classGroup, groupSlot, level, program } from "@/lib/db/academy";
import { branch, userRole } from "@/lib/db/schema";
import { field, parseForm, type ActionState } from "@/lib/forms";
import { requireGroup } from "../scope";

const BASE = "/admin/academy";

/* Branches ----------------------------------------------------------------- */

const branchSchema = z.object({
  id: field.optionalId(),
  nameAr: field.text(120),
  nameEn: field.text(120),
  active: field.checkbox(),
});

export async function saveBranch(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("branches.manage");
  const parsed = parseForm(branchSchema, formData);
  if (!parsed.data) return parsed.state;
  const { id, ...values } = parsed.data;

  if (id) {
    await db.update(branch).set(values).where(eq(branch.id, id));
    await audit(db, user.id, "branch.update", "branch", id, values);
  } else {
    const [result] = await db.insert(branch).values({ ...values, active: true }).$returningId();
    await audit(db, user.id, "branch.create", "branch", result.id, values);
  }

  revalidatePath(`${BASE}/branches`);
  return { ok: true, message: "saved" };
}

/* Programs and levels ------------------------------------------------------ */

const programSchema = z.object({
  nameAr: field.text(120),
  nameEn: field.text(120),
});

export async function createProgram(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("levels.manage");
  const parsed = parseForm(programSchema, formData);
  if (!parsed.data) return parsed.state;

  const [result] = await db.insert(program).values(parsed.data).$returningId();
  await audit(db, user.id, "program.create", "program", result.id, parsed.data);
  revalidatePath(`${BASE}/levels`);
  return { ok: true, message: "saved" };
}

const levelSchema = z
  .object({
    id: field.optionalId(),
    programId: field.id(),
    nameAr: field.text(120),
    nameEn: field.text(120),
    position: field.int(1, 99),
    sessionCount: field.int(1, 60),
    passMark: field.int(0, 100),
    remedialMin: field.int(0, 20),
    remedialMax: field.int(0, 20),
    active: field.checkbox(),
  })
  .refine((value) => value.remedialMax >= value.remedialMin, {
    path: ["remedialMax"],
    message: "remedialRange",
  });

export async function saveLevel(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("levels.manage");
  const parsed = parseForm(levelSchema, formData);
  if (!parsed.data) return parsed.state;
  const { id, ...values } = parsed.data;

  if (id) {
    await db.update(level).set(values).where(eq(level.id, id));
    await audit(db, user.id, "level.update", "level", id, values);
  } else {
    const [result] = await db.insert(level).values(values).$returningId();
    await audit(db, user.id, "level.create", "level", result.id, values);
  }

  revalidatePath(`${BASE}/levels`);
  if (id) redirect(`${BASE}/levels`);
  return { ok: true, message: "saved" };
}

/* Groups ------------------------------------------------------------------- */

const slotSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(15).max(480),
});

const groupSchema = z
  .object({
    id: field.optionalId(),
    name: field.text(120),
    levelId: field.id(),
    mode: z.enum(GROUP_MODES, "required"),
    branchId: field.optionalId(),
    instructorId: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().max(36).nullable().default(null),
    ),
    capacityMin: field.int(1, 50),
    capacityMax: field.int(1, 50),
    price: field.amount(),
    startDate: field.optionalDate(),
    status: z.enum(GROUP_STATUSES, "required"),
    meetingUrl: field.optionalUrl(),
    notes: field.optionalText(2000),
    "slotWeekday[]": z.array(z.string()).default([]),
    "slotTime[]": z.array(z.string()).default([]),
    "slotDuration[]": z.array(z.string()).default([]),
  })
  .refine((value) => value.capacityMax >= value.capacityMin, {
    path: ["capacityMax"],
    message: "capacityRange",
  })
  .refine((value) => value.mode === "online" || value.branchId !== null, {
    path: ["branchId"],
    message: "branchRequired",
  });

export async function saveGroup(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("groups.write");
  const parsed = parseForm(groupSchema, formData);
  if (!parsed.data) return parsed.state;
  const {
    id,
    "slotWeekday[]": weekdays,
    "slotTime[]": times,
    "slotDuration[]": durations,
    ...values
  } = parsed.data;

  // Online groups belong to no branch.
  const branchId = values.mode === "online" ? null : values.branchId;
  if (!can(user.grants, "groups.write", branchId)) {
    return { error: "outOfScope", fieldErrors: { branchId: "outOfScope" } };
  }
  if (id) await requireGroup(user, id, "groups.write");

  if (values.instructorId) {
    const [isInstructor] = await db
      .select({ id: userRole.id })
      .from(userRole)
      .where(and(eq(userRole.userId, values.instructorId), eq(userRole.role, "instructor")));
    if (!isInstructor) return { error: "checkFields", fieldErrors: { instructorId: "invalid" } };
  }

  const slots: z.infer<typeof slotSchema>[] = [];
  for (let index = 0; index < weekdays.length; index += 1) {
    if (weekdays[index] === "" || !times[index]) continue;
    const slot = slotSchema.safeParse({
      weekday: weekdays[index],
      startTime: times[index],
      durationMinutes: durations[index] || 90,
    });
    if (!slot.success) return { error: "checkFields", fieldErrors: { slots: "invalidSlot" } };
    slots.push(slot.data);
  }

  const row = { ...values, branchId, price: values.price.toFixed(2) };

  const groupId = await db.transaction(async (tx) => {
    let savedId = id;
    if (savedId) {
      await tx.update(classGroup).set(row).where(eq(classGroup.id, savedId));
      await tx.delete(groupSlot).where(eq(groupSlot.groupId, savedId));
    } else {
      [{ id: savedId }] = await tx.insert(classGroup).values(row).$returningId();
    }
    if (slots.length) {
      await tx.insert(groupSlot).values(
        slots.map((slot) => ({ ...slot, startTime: `${slot.startTime}:00`, groupId: savedId! })),
      );
    }
    await audit(tx, user.id, id ? "group.update" : "group.create", "group", savedId!, { ...row, slots });
    return savedId!;
  });

  revalidatePath(`${BASE}/groups`);
  redirect(`${BASE}/groups/${groupId}`);
}
