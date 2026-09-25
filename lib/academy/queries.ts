import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classGroup,
  enrollment,
  family,
  groupSlot,
  guardian,
  level,
  payment,
  program,
  student,
} from "@/lib/db/academy";
import { branch, user, userRole } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/auth/session";
import { nameKey } from "./normalize";
import { groupScopeCondition, studentScopeCondition } from "./scope";

/** Sum of non-voided payments per enrollment, for joining. */
export function paidByEnrollment() {
  return db
    .select({
      enrollmentId: payment.enrollmentId,
      paid: sql<string>`coalesce(sum(${payment.amount}), 0)`.as("paid"),
    })
    .from(payment)
    .where(isNull(payment.voidedAt))
    .groupBy(payment.enrollmentId)
    .as("paid_sum");
}

/** Amount still owed on an enrollment: price − discount − paid. */
export function balanceOf(price: string, discount: string, paid: string | null) {
  return Math.round((Number(price) - Number(discount) - Number(paid ?? 0)) * 100) / 100;
}

export async function listBranches(activeOnly = false) {
  return db
    .select()
    .from(branch)
    .where(activeOnly ? eq(branch.active, true) : undefined)
    .orderBy(asc(branch.nameEn));
}

export async function listLevels(activeOnly = false) {
  return db
    .select({
      id: level.id,
      programId: level.programId,
      nameAr: level.nameAr,
      nameEn: level.nameEn,
      position: level.position,
      sessionCount: level.sessionCount,
      passMark: level.passMark,
      remedialMin: level.remedialMin,
      remedialMax: level.remedialMax,
      active: level.active,
      programNameAr: program.nameAr,
      programNameEn: program.nameEn,
    })
    .from(level)
    .innerJoin(program, eq(program.id, level.programId))
    .where(activeOnly ? and(eq(level.active, true), eq(program.active, true)) : undefined)
    .orderBy(asc(program.nameEn), asc(level.position));
}

export async function listInstructors() {
  return db
    .selectDistinct({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .innerJoin(userRole, eq(userRole.userId, user.id))
    .where(eq(userRole.role, "instructor"))
    .orderBy(asc(user.name));
}

export async function listGroups(
  viewer: CurrentUser,
  filters: { status?: string; mode?: string } = {},
) {
  const enrolledCount = db
    .select({
      groupId: enrollment.groupId,
      count: sql<number>`count(*)`.as("enrolled_count"),
    })
    .from(enrollment)
    .where(eq(enrollment.status, "active"))
    .groupBy(enrollment.groupId)
    .as("enrolled");

  const statusCondition =
    filters.status === "all"
      ? undefined
      : filters.status
        ? eq(classGroup.status, filters.status as "active")
        : inArray(classGroup.status, ["planned", "active"]);

  return db
    .select({
      id: classGroup.id,
      name: classGroup.name,
      mode: classGroup.mode,
      status: classGroup.status,
      price: classGroup.price,
      capacityMin: classGroup.capacityMin,
      capacityMax: classGroup.capacityMax,
      startDate: classGroup.startDate,
      levelNameAr: level.nameAr,
      levelNameEn: level.nameEn,
      branchNameAr: branch.nameAr,
      branchNameEn: branch.nameEn,
      instructorId: classGroup.instructorId,
      instructorName: user.name,
      enrolled: sql<number>`coalesce(${enrolledCount.count}, 0)`,
    })
    .from(classGroup)
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .leftJoin(branch, eq(branch.id, classGroup.branchId))
    .leftJoin(user, eq(user.id, classGroup.instructorId))
    .leftJoin(enrolledCount, eq(enrolledCount.groupId, classGroup.id))
    .where(
      and(
        groupScopeCondition(viewer),
        statusCondition,
        filters.mode ? eq(classGroup.mode, filters.mode as "online") : undefined,
      ),
    )
    .orderBy(asc(classGroup.name));
}

export async function getGroupDetail(groupId: number) {
  const [row] = await db
    .select({
      group: classGroup,
      levelNameAr: level.nameAr,
      levelNameEn: level.nameEn,
      sessionCount: level.sessionCount,
      branchNameAr: branch.nameAr,
      branchNameEn: branch.nameEn,
      instructorName: user.name,
    })
    .from(classGroup)
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .leftJoin(branch, eq(branch.id, classGroup.branchId))
    .leftJoin(user, eq(user.id, classGroup.instructorId))
    .where(eq(classGroup.id, groupId));
  if (!row) return null;

  const slots = await db
    .select()
    .from(groupSlot)
    .where(eq(groupSlot.groupId, groupId))
    .orderBy(asc(groupSlot.weekday), asc(groupSlot.startTime));

  return { ...row, slots };
}

export async function getGroupRoster(groupId: number) {
  const paid = paidByEnrollment();
  const rows = await db
    .select({
      enrollmentId: enrollment.id,
      status: enrollment.status,
      price: enrollment.price,
      discount: enrollment.discount,
      paid: paid.paid,
      studentId: student.id,
      nameAr: student.nameAr,
      birthDate: student.birthDate,
      birthYear: student.birthYear,
      familyId: student.familyId,
    })
    .from(enrollment)
    .innerJoin(student, eq(student.id, enrollment.studentId))
    .leftJoin(paid, eq(paid.enrollmentId, enrollment.id))
    .where(eq(enrollment.groupId, groupId))
    .orderBy(asc(student.nameAr));

  const phones = await guardianPhones(rows.map((row) => row.familyId));
  return rows.map((row) => ({
    ...row,
    balance: balanceOf(row.price, row.discount, row.paid),
    phones: phones.get(row.familyId) ?? [],
  }));
}

/** Guardian phones keyed by family id. */
export async function guardianPhones(familyIds: number[]) {
  const map = new Map<number, { relation: string; phone: string; name: string | null }[]>();
  if (familyIds.length === 0) return map;
  const rows = await db
    .select({
      familyId: guardian.familyId,
      relation: guardian.relation,
      phone: guardian.phone,
      name: guardian.name,
    })
    .from(guardian)
    .where(inArray(guardian.familyId, [...new Set(familyIds)]))
    .orderBy(asc(guardian.relation));
  for (const row of rows) {
    const list = map.get(row.familyId) ?? [];
    list.push(row);
    map.set(row.familyId, list);
  }
  return map;
}

export async function getStudentDetail(studentId: number) {
  const [row] = await db
    .select({ student, familyName: family.name, familyNotes: family.notes })
    .from(student)
    .innerJoin(family, eq(family.id, student.familyId))
    .where(eq(student.id, studentId));
  if (!row) return null;

  const [guardians, siblings, enrollments] = await Promise.all([
    db.select().from(guardian).where(eq(guardian.familyId, row.student.familyId)).orderBy(asc(guardian.relation)),
    db
      .select({ id: student.id, nameAr: student.nameAr })
      .from(student)
      .where(and(eq(student.familyId, row.student.familyId), ne(student.id, studentId))),
    getStudentEnrollments(studentId),
  ]);

  return { ...row, guardians, siblings, enrollments };
}

export async function getStudentEnrollments(studentId: number) {
  const paid = paidByEnrollment();
  const rows = await db
    .select({
      id: enrollment.id,
      status: enrollment.status,
      price: enrollment.price,
      discount: enrollment.discount,
      enrolledAt: enrollment.enrolledAt,
      paid: paid.paid,
      groupId: classGroup.id,
      groupName: classGroup.name,
      groupBranchId: classGroup.branchId,
      mode: classGroup.mode,
      levelNameAr: level.nameAr,
      levelNameEn: level.nameEn,
    })
    .from(enrollment)
    .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .leftJoin(paid, eq(paid.enrollmentId, enrollment.id))
    .where(eq(enrollment.studentId, studentId))
    .orderBy(desc(enrollment.enrolledAt));

  const ids = rows.map((row) => row.id);
  const payments = ids.length
    ? await db
        .select({
          id: payment.id,
          enrollmentId: payment.enrollmentId,
          amount: payment.amount,
          paidOn: payment.paidOn,
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
          source: payment.source,
          voidedAt: payment.voidedAt,
          voidReason: payment.voidReason,
          receivedByName: user.name,
        })
        .from(payment)
        .leftJoin(user, eq(user.id, payment.receivedBy))
        .where(inArray(payment.enrollmentId, ids))
        .orderBy(desc(payment.paidOn), desc(payment.id))
    : [];

  return rows.map((row) => ({
    ...row,
    balance: balanceOf(row.price, row.discount, row.paid),
    payments: payments.filter((item) => item.enrollmentId === row.id),
  }));
}

export async function listStudents(
  viewer: CurrentUser,
  filters: { q?: string; status?: string } = {},
  limit = 200,
) {
  const q = filters.q?.trim();
  const digits = q?.replace(/\D/g, "");
  const searchCondition = q
    ? digits && digits.length >= 4
      ? sql`exists (select 1 from ${guardian} where ${guardian.familyId} = ${student.familyId} and ${guardian.phone} like ${`%${digits}%`})`
      : sql`${student.nameKey} like ${`%${nameKeyForSearch(q)}%`}`
    : undefined;

  const rows = await db
    .select({
      id: student.id,
      nameAr: student.nameAr,
      nameEn: student.nameEn,
      birthDate: student.birthDate,
      birthYear: student.birthYear,
      status: student.status,
      familyId: student.familyId,
    })
    .from(student)
    .where(
      and(
        filters.status === "archived" ? eq(student.status, "archived") : eq(student.status, "active"),
        searchCondition,
        studentScopeCondition(viewer, student.id),
      ),
    )
    .orderBy(asc(student.nameAr))
    .limit(limit);

  const ids = rows.map((row) => row.id);
  const paid = paidByEnrollment();
  const enrollments = ids.length
    ? await db
        .select({
          studentId: enrollment.studentId,
          status: enrollment.status,
          price: enrollment.price,
          discount: enrollment.discount,
          paid: paid.paid,
          groupId: classGroup.id,
          groupName: classGroup.name,
        })
        .from(enrollment)
        .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
        .leftJoin(paid, eq(paid.enrollmentId, enrollment.id))
        .where(inArray(enrollment.studentId, ids))
    : [];
  const phones = await guardianPhones(rows.map((row) => row.familyId));

  return rows.map((row) => {
    const own = enrollments.filter((item) => item.studentId === row.id);
    return {
      ...row,
      phones: phones.get(row.familyId) ?? [],
      groups: own.filter((item) => item.status === "active").map((item) => ({ id: item.groupId, name: item.groupName })),
      balance: own.reduce((sum, item) => sum + balanceOf(item.price, item.discount, item.paid), 0),
    };
  });
}

/** Enrollments with money still owed, largest first. */
export async function listOutstanding(viewer: CurrentUser) {
  const paid = paidByEnrollment();
  const rows = await db
    .select({
      enrollmentId: enrollment.id,
      price: enrollment.price,
      discount: enrollment.discount,
      paid: paid.paid,
      enrolledAt: enrollment.enrolledAt,
      studentId: student.id,
      nameAr: student.nameAr,
      familyId: student.familyId,
      groupId: classGroup.id,
      groupName: classGroup.name,
    })
    .from(enrollment)
    .innerJoin(student, eq(student.id, enrollment.studentId))
    .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
    .leftJoin(paid, eq(paid.enrollmentId, enrollment.id))
    .where(
      and(
        inArray(enrollment.status, ["active", "completed"]),
        groupScopeCondition(viewer),
        sql`${enrollment.price} - ${enrollment.discount} - coalesce(${paid.paid}, 0) > 0`,
      ),
    );

  const phones = await guardianPhones(rows.map((row) => row.familyId));
  return rows
    .map((row) => ({
      ...row,
      balance: balanceOf(row.price, row.discount, row.paid),
      phones: phones.get(row.familyId) ?? [],
    }))
    .sort((a, b) => b.balance - a.balance);
}

export async function listPayments(
  viewer: CurrentUser,
  filters: { from?: string; to?: string; method?: string },
) {
  return db
    .select({
      id: payment.id,
      amount: payment.amount,
      paidOn: payment.paidOn,
      method: payment.method,
      reference: payment.reference,
      source: payment.source,
      voidedAt: payment.voidedAt,
      voidReason: payment.voidReason,
      studentId: student.id,
      nameAr: student.nameAr,
      groupName: classGroup.name,
      receivedByName: user.name,
    })
    .from(payment)
    .innerJoin(enrollment, eq(enrollment.id, payment.enrollmentId))
    .innerJoin(student, eq(student.id, enrollment.studentId))
    .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
    .leftJoin(user, eq(user.id, payment.receivedBy))
    .where(
      and(
        groupScopeCondition(viewer),
        filters.from ? sql`${payment.paidOn} >= ${filters.from}` : undefined,
        filters.to ? sql`${payment.paidOn} <= ${filters.to}` : undefined,
        filters.method ? eq(payment.method, filters.method as "cash") : undefined,
      ),
    )
    .orderBy(desc(payment.paidOn), desc(payment.id))
    .limit(500);
}

function nameKeyForSearch(query: string) {
  return nameKey(query).replace(/[%_]/g, "");
}
