import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { classGroup } from "@/lib/db/academy";
import { user, userRole } from "@/lib/db/schema";
import { classSession, payrollAdjustment, payrollPayment } from "@/lib/db/teaching";
import { toMoney } from "./format";
import { cairoMonthRange, cairoParts } from "./time";

export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonth() {
  return cairoParts(new Date()).month;
}

/** Everything that makes up an instructor's pay for one month. */
export async function getMonthStatement(instructorId: string, month: string) {
  const { start, end } = cairoMonthRange(month);
  const [sessions, adjustments, payments] = await Promise.all([
    db
      .select({
        id: classSession.id,
        number: classSession.number,
        kind: classSession.kind,
        scheduledAt: classSession.scheduledAt,
        mode: classSession.heldMode,
        rate: classSession.rate,
        groupId: classGroup.id,
        groupName: classGroup.name,
      })
      .from(classSession)
      .innerJoin(classGroup, eq(classGroup.id, classSession.groupId))
      .where(
        and(
          eq(classSession.heldBy, instructorId),
          eq(classSession.status, "held"),
          gte(classSession.scheduledAt, start),
          lt(classSession.scheduledAt, end),
        ),
      )
      .orderBy(asc(classSession.scheduledAt)),
    db
      .select()
      .from(payrollAdjustment)
      .where(and(eq(payrollAdjustment.instructorId, instructorId), eq(payrollAdjustment.month, month)))
      .orderBy(asc(payrollAdjustment.createdAt)),
    db
      .select()
      .from(payrollPayment)
      .where(and(eq(payrollPayment.instructorId, instructorId), eq(payrollPayment.month, month)))
      .orderBy(asc(payrollPayment.createdAt)),
  ]);

  const sessionsAmount = toMoney(sessions.reduce((sum, row) => sum + Number(row.rate ?? 0), 0));
  const bonuses = toMoney(adjustments.filter((row) => row.kind === "bonus").reduce((sum, row) => sum + Number(row.amount), 0));
  const deductions = toMoney(adjustments.filter((row) => row.kind === "deduction").reduce((sum, row) => sum + Number(row.amount), 0));
  const net = toMoney(sessionsAmount + bonuses - deductions);
  const paid = toMoney(payments.filter((row) => !row.voidedAt).reduce((sum, row) => sum + Number(row.amount), 0));

  return {
    month,
    sessions,
    adjustments,
    payments,
    totals: {
      sessions: sessions.length,
      offline: sessions.filter((row) => row.mode === "offline").length,
      online: sessions.filter((row) => row.mode === "online").length,
      sessionsAmount,
      bonuses,
      deductions,
      net,
      paid,
      remaining: toMoney(net - paid),
    },
  };
}

/** One row per instructor for the admin payroll page. */
export async function getPayrollOverview(month: string) {
  const { start, end } = cairoMonthRange(month);
  const [instructors, sessions, adjustments, payments] = await Promise.all([
    db
      .selectDistinct({ id: user.id, name: user.name })
      .from(user)
      .innerJoin(userRole, eq(userRole.userId, user.id))
      .where(eq(userRole.role, "instructor"))
      .orderBy(asc(user.name)),
    db
      .select({
        instructorId: classSession.heldBy,
        count: sql<number>`count(*)`,
        amount: sql<string>`coalesce(sum(${classSession.rate}), 0)`,
      })
      .from(classSession)
      .where(and(eq(classSession.status, "held"), gte(classSession.scheduledAt, start), lt(classSession.scheduledAt, end)))
      .groupBy(classSession.heldBy),
    db
      .select({
        instructorId: payrollAdjustment.instructorId,
        bonuses: sql<string>`coalesce(sum(case when ${payrollAdjustment.kind} = 'bonus' then ${payrollAdjustment.amount} end), 0)`,
        deductions: sql<string>`coalesce(sum(case when ${payrollAdjustment.kind} = 'deduction' then ${payrollAdjustment.amount} end), 0)`,
      })
      .from(payrollAdjustment)
      .where(eq(payrollAdjustment.month, month))
      .groupBy(payrollAdjustment.instructorId),
    db
      .select({ instructorId: payrollPayment.instructorId, paid: sql<string>`coalesce(sum(${payrollPayment.amount}), 0)` })
      .from(payrollPayment)
      .where(and(eq(payrollPayment.month, month), isNull(payrollPayment.voidedAt)))
      .groupBy(payrollPayment.instructorId),
  ]);

  // Someone who held sessions but has since lost the instructor role still gets paid.
  const ids = new Set(instructors.map((row) => row.id));
  const extraIds = sessions.map((row) => row.instructorId).filter((id): id is string => Boolean(id) && !ids.has(id!));
  const extra = extraIds.length
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, extraIds))
    : [];

  return [...instructors, ...extra].map((person) => {
    const session = sessions.find((row) => row.instructorId === person.id);
    const adjustment = adjustments.find((row) => row.instructorId === person.id);
    const sessionsAmount = Number(session?.amount ?? 0);
    const bonuses = Number(adjustment?.bonuses ?? 0);
    const deductions = Number(adjustment?.deductions ?? 0);
    const net = toMoney(sessionsAmount + bonuses - deductions);
    const paid = Number(payments.find((row) => row.instructorId === person.id)?.paid ?? 0);
    return {
      ...person,
      sessions: Number(session?.count ?? 0),
      sessionsAmount,
      bonuses,
      deductions,
      net,
      paid,
      remaining: toMoney(net - paid),
    };
  });
}

/** Months with pay activity for an instructor, newest first, always including this month. */
export async function listPayrollMonths(instructorId: string) {
  const [sessions, adjustments, payments] = await Promise.all([
    db.select({ at: classSession.scheduledAt }).from(classSession).where(and(eq(classSession.heldBy, instructorId), eq(classSession.status, "held"))),
    db.selectDistinct({ month: payrollAdjustment.month }).from(payrollAdjustment).where(eq(payrollAdjustment.instructorId, instructorId)),
    db.selectDistinct({ month: payrollPayment.month }).from(payrollPayment).where(eq(payrollPayment.instructorId, instructorId)),
  ]);
  const months = new Set<string>([currentMonth()]);
  for (const row of sessions) months.add(cairoParts(row.at).month);
  for (const row of [...adjustments, ...payments]) months.add(row.month);
  return [...months].sort().reverse();
}

/** All-time amount still owed to the instructor, and their latest transfer. */
export async function getPayrollBalance(instructorId: string) {
  const [[earned], [adjusted], [paid], [last]] = await Promise.all([
    db
      .select({ amount: sql<string>`coalesce(sum(${classSession.rate}), 0)` })
      .from(classSession)
      .where(and(eq(classSession.heldBy, instructorId), eq(classSession.status, "held"))),
    db
      .select({
        amount: sql<string>`coalesce(sum(case when ${payrollAdjustment.kind} = 'bonus' then ${payrollAdjustment.amount} else -${payrollAdjustment.amount} end), 0)`,
      })
      .from(payrollAdjustment)
      .where(eq(payrollAdjustment.instructorId, instructorId)),
    db
      .select({ amount: sql<string>`coalesce(sum(${payrollPayment.amount}), 0)` })
      .from(payrollPayment)
      .where(and(eq(payrollPayment.instructorId, instructorId), isNull(payrollPayment.voidedAt))),
    db
      .select()
      .from(payrollPayment)
      .where(and(eq(payrollPayment.instructorId, instructorId), isNull(payrollPayment.voidedAt)))
      .orderBy(desc(payrollPayment.paidOn), desc(payrollPayment.id))
      .limit(1),
  ]);
  return {
    owed: toMoney(Number(earned.amount) + Number(adjusted.amount) - Number(paid.amount)),
    lastPayment: last ?? null,
  };
}
