import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { classGroup, enrollment, groupSlot, level, student } from "@/lib/db/academy";
import { branch } from "@/lib/db/schema";
import {
  CRITERIA,
  DEFAULT_RATES,
  attendance,
  classSession,
  instructorRate,
  studentRequest,
} from "@/lib/db/teaching";
import type { CurrentUser } from "@/lib/auth/session";
import { guardianPhones } from "./queries";
import { addDays, cairoMonthRange, cairoParts, cairoToUtc, recentMonths, scheduleSessions } from "./time";

type Executor = Pick<typeof db, "select" | "insert" | "delete">;

/* Session generation -------------------------------------------------------- */

/**
 * Brings a group's regular sessions in line with its start date, weekly slots
 * and level length. Before any session is held the whole schedule is rebuilt;
 * afterwards only the sessions after the last held one are, starting the day
 * after it. Held sessions are never touched.
 */
export async function syncGroupSessions(executor: Executor, groupId: number) {
  const [group] = await executor
    .select({ startDate: classGroup.startDate, status: classGroup.status, sessionCount: level.sessionCount })
    .from(classGroup)
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .where(eq(classGroup.id, groupId));
  if (!group?.startDate || !["planned", "active"].includes(group.status)) return;

  const slots = await executor.select().from(groupSlot).where(eq(groupSlot.groupId, groupId));
  if (slots.length === 0) return;

  const existing = await executor
    .select({ number: classSession.number, status: classSession.status, scheduledAt: classSession.scheduledAt })
    .from(classSession)
    .where(and(eq(classSession.groupId, groupId), eq(classSession.kind, "regular")));
  const held = existing.filter((row) => row.status === "held");
  const lastHeld = held.reduce((max, row) => Math.max(max, row.number), 0);

  const from = lastHeld
    ? addDays(cairoParts(held.find((row) => row.number === lastHeld)!.scheduledAt).date, 1)
    : group.startDate;
  const planned = scheduleSessions(from, slots, group.sessionCount - lastHeld);

  await executor
    .delete(classSession)
    .where(
      and(
        eq(classSession.groupId, groupId),
        eq(classSession.kind, "regular"),
        gt(classSession.number, lastHeld),
        eq(classSession.status, "scheduled"),
      ),
    );
  if (planned.length) {
    await executor.insert(classSession).values(
      planned.map((item, index) => ({ groupId, kind: "regular" as const, number: lastHeld + index + 1, ...item })),
    );
  }
}

/**
 * Creates sessions for the listed groups that have none yet. Pages call this
 * lazily, so two requests can race: the group row lock serialises them and the
 * second sees the first one's sessions.
 */
export async function ensureSessions(groupIds: number[]) {
  if (groupIds.length === 0) return;
  const withSessions = await db
    .selectDistinct({ groupId: classSession.groupId })
    .from(classSession)
    .where(inArray(classSession.groupId, groupIds));
  const done = new Set(withSessions.map((row) => row.groupId));
  for (const groupId of groupIds) {
    if (done.has(groupId)) continue;
    try {
      await db.transaction(async (tx) => {
        await tx.select({ id: classGroup.id }).from(classGroup).where(eq(classGroup.id, groupId)).for("update");
        const [existing] = await tx
          .select({ id: classSession.id })
          .from(classSession)
          .where(eq(classSession.groupId, groupId))
          .limit(1);
        if (!existing) await syncGroupSessions(tx, groupId);
      });
    } catch (error) {
      // Best effort: the page still renders, and the next load tries again.
      console.error(`Could not create sessions for group ${groupId}.`, error);
    }
  }
}

/* Access -------------------------------------------------------------------- */

/** Instructors act only on groups assigned to them; the super admin on any. */
function teaches(user: CurrentUser, instructorId: string | null) {
  return instructorId === user.id || user.grants.some((grant) => grant.role === "super_admin");
}

export async function requireTeachingGroup(user: CurrentUser, groupId: number) {
  const [row] = await db
    .select({
      group: classGroup,
      levelNameAr: level.nameAr,
      levelNameEn: level.nameEn,
      sessionCount: level.sessionCount,
      passMark: level.passMark,
      branchNameAr: branch.nameAr,
      branchNameEn: branch.nameEn,
    })
    .from(classGroup)
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .leftJoin(branch, eq(branch.id, classGroup.branchId))
    .where(eq(classGroup.id, groupId));
  if (!row) notFound();
  if (!teaches(user, row.group.instructorId)) redirect("/forbidden");
  return row;
}

export async function requireTeachingSession(user: CurrentUser, sessionId: number) {
  const [row] = await db.select().from(classSession).where(eq(classSession.id, sessionId));
  if (!row) notFound();
  const group = await requireTeachingGroup(user, row.groupId);
  return { session: row, ...group };
}

/** Whether the session's Cairo date has arrived, so attendance may be taken. */
export function sessionStarted(scheduledAt: Date) {
  return cairoParts(scheduledAt).date <= cairoParts(new Date()).date;
}

export async function rateFor(userId: string, mode: "offline" | "online") {
  const [row] = await db.select().from(instructorRate).where(eq(instructorRate.userId, userId));
  if (!row) return DEFAULT_RATES[mode];
  return Number(mode === "online" ? row.rateOnline : row.rateOffline);
}

/* Queries ------------------------------------------------------------------- */

const attendedSql = sql<number>`sum(case when ${attendance.status} in ('present','late') then 1 else 0 end)`;
const countedSql = sql<number>`sum(case when ${attendance.status} <> 'excused' then 1 else 0 end)`;

/** The instructor's groups with progress, for the groups page. */
export async function listTeachingGroups(userId: string, finished: boolean) {
  const groups = await db
    .select({
      id: classGroup.id,
      name: classGroup.name,
      mode: classGroup.mode,
      status: classGroup.status,
      meetingUrl: classGroup.meetingUrl,
      levelNameAr: level.nameAr,
      levelNameEn: level.nameEn,
      sessionCount: level.sessionCount,
      branchNameAr: branch.nameAr,
      branchNameEn: branch.nameEn,
    })
    .from(classGroup)
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .leftJoin(branch, eq(branch.id, classGroup.branchId))
    .where(
      and(
        eq(classGroup.instructorId, userId),
        inArray(classGroup.status, finished ? ["completed", "cancelled"] : ["planned", "active"]),
      ),
    )
    .orderBy(asc(classGroup.name));
  if (groups.length === 0) return [];

  const ids = groups.map((group) => group.id);
  if (!finished) await ensureSessions(ids);

  const [enrolled, sessions, rates, slots] = await Promise.all([
    db
      .select({ groupId: enrollment.groupId, count: sql<number>`count(*)` })
      .from(enrollment)
      .where(and(inArray(enrollment.groupId, ids), eq(enrollment.status, "active")))
      .groupBy(enrollment.groupId),
    db
      .select({
        groupId: classSession.groupId,
        held: sql<number>`sum(case when ${classSession.status} = 'held' then 1 else 0 end)`,
        next: sql<Date | null>`min(case when ${classSession.status} = 'scheduled' and ${classSession.scheduledAt} >= ${new Date(Date.now() - 3 * 3600_000)} then ${classSession.scheduledAt} end)`,
      })
      .from(classSession)
      .where(and(inArray(classSession.groupId, ids), eq(classSession.kind, "regular")))
      .groupBy(classSession.groupId),
    db
      .select({ groupId: classSession.groupId, attended: attendedSql, counted: countedSql })
      .from(attendance)
      .innerJoin(classSession, eq(classSession.id, attendance.sessionId))
      .where(inArray(classSession.groupId, ids))
      .groupBy(classSession.groupId),
    db.select().from(groupSlot).where(inArray(groupSlot.groupId, ids)).orderBy(asc(groupSlot.weekday)),
  ]);

  return groups.map((group) => {
    const session = sessions.find((row) => row.groupId === group.id);
    const rate = rates.find((row) => row.groupId === group.id);
    return {
      ...group,
      students: Number(enrolled.find((row) => row.groupId === group.id)?.count ?? 0),
      held: Number(session?.held ?? 0),
      next: session?.next ? new Date(session.next) : null,
      attendanceRate: rate && Number(rate.counted) > 0 ? Number(rate.attended) / Number(rate.counted) : null,
      slots: slots.filter((slot) => slot.groupId === group.id),
    };
  });
}

/** All sessions of a group with how many attendance records each has. */
export async function listGroupSessions(groupId: number) {
  return db
    .select({
      id: classSession.id,
      kind: classSession.kind,
      number: classSession.number,
      scheduledAt: classSession.scheduledAt,
      durationMinutes: classSession.durationMinutes,
      status: classSession.status,
      originalScheduledAt: classSession.originalScheduledAt,
      postponeReason: classSession.postponeReason,
      recorded: sql<number>`count(${attendance.id})`,
      attended: sql<number>`coalesce(${attendedSql}, 0)`,
    })
    .from(classSession)
    .leftJoin(attendance, eq(attendance.sessionId, classSession.id))
    .where(eq(classSession.groupId, groupId))
    .groupBy(classSession.id)
    .orderBy(asc(classSession.scheduledAt));
}

/**
 * Students to mark in a session: those actively enrolled, plus anyone already
 * recorded (e.g. withdrawn since). Each comes with their saved record.
 */
export async function getSessionRoster(sessionId: number, groupId: number) {
  const enrolled = await db
    .select({ studentId: student.id, nameAr: student.nameAr, nameEn: student.nameEn, familyId: student.familyId })
    .from(enrollment)
    .innerJoin(student, eq(student.id, enrollment.studentId))
    .where(and(eq(enrollment.groupId, groupId), eq(enrollment.status, "active")));

  const records = await db
    .select({ record: attendance, nameAr: student.nameAr, nameEn: student.nameEn, familyId: student.familyId })
    .from(attendance)
    .innerJoin(student, eq(student.id, attendance.studentId))
    .where(eq(attendance.sessionId, sessionId));

  const rows = new Map<number, { studentId: number; nameAr: string; nameEn: string | null; familyId: number }>();
  for (const row of enrolled) rows.set(row.studentId, row);
  for (const row of records) {
    if (!rows.has(row.record.studentId)) {
      rows.set(row.record.studentId, { studentId: row.record.studentId, nameAr: row.nameAr, nameEn: row.nameEn, familyId: row.familyId });
    }
  }

  const phones = await guardianPhones([...rows.values()].map((row) => row.familyId));
  return [...rows.values()]
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"))
    .map((row) => {
      const record = records.find((item) => item.record.studentId === row.studentId)?.record ?? null;
      return {
        ...row,
        phones: phones.get(row.familyId) ?? [],
        record: record && {
          status: record.status,
          note: record.note,
          scores: Object.fromEntries(CRITERIA.map((criterion) => [criterion, record[criterion]])) as Record<
            (typeof CRITERIA)[number],
            number | null
          >,
        },
      };
    });
}

/** Attendance and average score per criterion for each student in a group. */
export async function getGroupProgress(groupId: number) {
  const averages = CRITERIA.map((criterion) => sql<string | null>`avg(${attendance[criterion]})`.as(criterion));
  const rows = await db
    .select({
      studentId: attendance.studentId,
      nameAr: student.nameAr,
      nameEn: student.nameEn,
      attended: attendedSql,
      counted: countedSql,
      ...Object.fromEntries(CRITERIA.map((criterion, index) => [criterion, averages[index]])),
    })
    .from(attendance)
    .innerJoin(classSession, eq(classSession.id, attendance.sessionId))
    .innerJoin(student, eq(student.id, attendance.studentId))
    .where(eq(classSession.groupId, groupId))
    .groupBy(attendance.studentId, student.nameAr, student.nameEn)
    .orderBy(asc(student.nameAr));

  return rows.map((row) => {
    const scores = Object.fromEntries(
      CRITERIA.map((criterion) => {
        const value = (row as unknown as Record<string, string | null>)[criterion];
        return [criterion, value === null ? null : Number(value)];
      }),
    ) as Record<(typeof CRITERIA)[number], number | null>;
    const present = Object.values(scores).filter((value): value is number => value !== null);
    return {
      studentId: row.studentId,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      attended: Number(row.attended),
      counted: Number(row.counted),
      scores,
      overall: present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null,
    };
  });
}

export async function listGroupRequests(groupId: number) {
  return db
    .select()
    .from(studentRequest)
    .where(eq(studentRequest.groupId, groupId))
    .orderBy(desc(studentRequest.createdAt))
    .limit(20);
}

/* Instructor home ----------------------------------------------------------- */

export async function getInstructorHome(userId: string) {
  const now = new Date();
  const today = cairoParts(now);
  const month = today.month;
  const { start: monthStart, end: monthEnd } = cairoMonthRange(month);
  const months = recentMonths(month, 6);
  const chartStart = cairoMonthRange(months[0]).start;

  const activeGroups = await db
    .select({ id: classGroup.id })
    .from(classGroup)
    .where(and(eq(classGroup.instructorId, userId), inArray(classGroup.status, ["planned", "active"])));
  const groupIds = activeGroups.map((group) => group.id);
  await ensureSessions(groupIds);

  const sessionColumns = {
    id: classSession.id,
    number: classSession.number,
    kind: classSession.kind,
    scheduledAt: classSession.scheduledAt,
    durationMinutes: classSession.durationMinutes,
    status: classSession.status,
    originalScheduledAt: classSession.originalScheduledAt,
    groupId: classGroup.id,
    groupName: classGroup.name,
    mode: classGroup.mode,
    meetingUrl: classGroup.meetingUrl,
    levelNameAr: level.nameAr,
    levelNameEn: level.nameEn,
    branchNameAr: branch.nameAr,
    branchNameEn: branch.nameEn,
  };
  const sessionsOf = () =>
    db
      .select(sessionColumns)
      .from(classSession)
      .innerJoin(classGroup, eq(classGroup.id, classSession.groupId))
      .innerJoin(level, eq(level.id, classGroup.levelId))
      .leftJoin(branch, eq(branch.id, classGroup.branchId));

  const dayStart = cairoToUtc(today.date, "00:00");
  const dayEnd = cairoToUtc(addDays(today.date, 1), "00:00");

  const [todaySessions, upcoming, held, monthScheduled, students, pending, monthRate] = await Promise.all([
    groupIds.length
      ? sessionsOf()
          .where(
            and(
              inArray(classSession.groupId, groupIds),
              gte(classSession.scheduledAt, dayStart),
              lt(classSession.scheduledAt, dayEnd),
            ),
          )
          .orderBy(asc(classSession.scheduledAt))
      : [],
    groupIds.length
      ? sessionsOf()
          .where(
            and(
              inArray(classSession.groupId, groupIds),
              eq(classSession.status, "scheduled"),
              // Today's sessions still waiting for attendance come first.
              gte(classSession.scheduledAt, dayStart),
            ),
          )
          .orderBy(asc(classSession.scheduledAt))
          .limit(1)
      : [],
    db
      .select({ id: classSession.id, scheduledAt: classSession.scheduledAt, rate: classSession.rate })
      .from(classSession)
      .where(and(eq(classSession.heldBy, userId), gte(classSession.scheduledAt, chartStart), lt(classSession.scheduledAt, monthEnd))),
    groupIds.length
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(classSession)
          .where(
            and(
              // Sessions of current groups, plus any the instructor held in groups since finished.
              or(inArray(classSession.groupId, groupIds), eq(classSession.heldBy, userId)),
              gte(classSession.scheduledAt, monthStart),
              lt(classSession.scheduledAt, monthEnd),
            ),
          )
      : [{ count: 0 }],
    groupIds.length
      ? db
          .select({ count: sql<number>`count(distinct ${enrollment.studentId})` })
          .from(enrollment)
          .where(and(inArray(enrollment.groupId, groupIds), eq(enrollment.status, "active")))
      : [{ count: 0 }],
    db
      .select({ count: sql<number>`count(*)` })
      .from(studentRequest)
      .where(and(eq(studentRequest.requestedBy, userId), eq(studentRequest.status, "pending"))),
    db
      .select({ attended: attendedSql, counted: countedSql })
      .from(attendance)
      .innerJoin(classSession, eq(classSession.id, attendance.sessionId))
      .where(and(eq(classSession.heldBy, userId), gte(classSession.scheduledAt, monthStart), lt(classSession.scheduledAt, monthEnd))),
  ]);

  // Students taught per month: distinct students recorded in the instructor's sessions.
  const heldIds = held.map((row) => row.id);
  const taught = heldIds.length
    ? await db
        .select({ sessionId: attendance.sessionId, studentId: attendance.studentId })
        .from(attendance)
        .where(inArray(attendance.sessionId, heldIds))
    : [];
  const monthOf = new Map(held.map((row) => [row.id, cairoParts(row.scheduledAt).month]));
  const chart = months.map((key) => {
    const inMonth = held.filter((row) => monthOf.get(row.id) === key);
    const studentsInMonth = new Set(taught.filter((row) => monthOf.get(row.sessionId) === key).map((row) => row.studentId));
    return {
      month: key,
      earnings: inMonth.reduce((sum, row) => sum + Number(row.rate ?? 0), 0),
      sessions: inMonth.length,
      students: studentsInMonth.size,
    };
  });
  const current = chart[chart.length - 1];

  return {
    todaySessions,
    next: upcoming[0] ?? null,
    activeGroups: groupIds.length,
    chart,
    month: {
      key: month,
      earnings: current.earnings,
      held: current.sessions,
      scheduled: Number(monthScheduled[0]?.count ?? 0),
      attendanceRate: Number(monthRate[0]?.counted ?? 0) > 0 ? Number(monthRate[0].attended) / Number(monthRate[0].counted) : null,
    },
    students: Number(students[0]?.count ?? 0),
    pendingRequests: Number(pending[0]?.count ?? 0),
  };
}

export type ActivityItem =
  | { kind: "held"; at: Date; groupName: string; number: number; sessionKind: string }
  | { kind: "joined"; at: Date; groupName: string; studentName: string; studentNameEn: string | null }
  | { kind: "request"; at: Date; groupName: string; studentName: string; studentNameEn: string | null; status: "pending" | "approved" | "rejected"; note: string | null };

/** Recent events in the instructor's groups, newest first. */
export async function getInstructorActivity(userId: string, limit = 8): Promise<ActivityItem[]> {
  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const [held, joined, requests] = await Promise.all([
    db
      .select({ at: classSession.heldAt, groupName: classGroup.name, number: classSession.number, sessionKind: classSession.kind })
      .from(classSession)
      .innerJoin(classGroup, eq(classGroup.id, classSession.groupId))
      .where(and(eq(classSession.heldBy, userId), isNotNull(classSession.heldAt), gte(classSession.heldAt, since)))
      .orderBy(desc(classSession.heldAt))
      .limit(limit),
    db
      .select({ at: enrollment.enrolledAt, groupName: classGroup.name, studentName: student.nameAr, studentNameEn: student.nameEn })
      .from(enrollment)
      .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
      .innerJoin(student, eq(student.id, enrollment.studentId))
      .where(and(eq(classGroup.instructorId, userId), gte(enrollment.enrolledAt, since)))
      .orderBy(desc(enrollment.enrolledAt))
      .limit(limit),
    db
      .select({
        createdAt: studentRequest.createdAt,
        reviewedAt: studentRequest.reviewedAt,
        groupName: classGroup.name,
        studentName: studentRequest.nameAr,
        studentNameEn: studentRequest.nameEn,
        status: studentRequest.status,
        note: studentRequest.reviewNote,
      })
      .from(studentRequest)
      .innerJoin(classGroup, eq(classGroup.id, studentRequest.groupId))
      .where(and(eq(studentRequest.requestedBy, userId), gte(studentRequest.createdAt, since)))
      .orderBy(desc(studentRequest.createdAt))
      .limit(limit),
  ]);

  const items: ActivityItem[] = [
    ...held.map((row) => ({ kind: "held" as const, at: row.at!, groupName: row.groupName, number: row.number, sessionKind: row.sessionKind })),
    ...joined.map((row) => ({ kind: "joined" as const, ...row })),
    ...requests.map((row) => ({
      kind: "request" as const,
      at: row.reviewedAt ?? row.createdAt,
      groupName: row.groupName,
      studentName: row.studentName,
      studentNameEn: row.studentNameEn,
      status: row.status,
      note: row.note,
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
