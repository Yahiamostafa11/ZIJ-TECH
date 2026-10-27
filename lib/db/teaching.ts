import {
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  tinyint,
  uniqueIndex,
  varchar,
  date,
} from "drizzle-orm/mysql-core";
import { GROUP_MODES, PAYMENT_METHODS, classGroup, student } from "./academy";
import { createdAt, updatedAt, user } from "./schema";

/* -------------------------------------------------------------------------- */
/* Sessions                                                                    */
/* -------------------------------------------------------------------------- */

export const SESSION_KINDS = ["regular", "remedial"] as const;
export const SESSION_STATUSES = ["scheduled", "held", "cancelled"] as const;

/**
 * One class meeting. Regular sessions are generated from the group's start
 * date and weekly slots; a postponed session keeps its original time in
 * `originalScheduledAt`. A session becomes `held` when its instructor saves
 * attendance, and that instructor is paid `rate` for it.
 */
export const classSession = mysqlTable(
  "class_session",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("group_id")
      .notNull()
      .references(() => classGroup.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", SESSION_KINDS).notNull().default("regular"),
    /** 1-based order within its kind. */
    number: int("number").notNull(),
    scheduledAt: datetime("scheduled_at").notNull(),
    durationMinutes: int("duration_minutes").notNull().default(90),
    status: mysqlEnum("status", SESSION_STATUSES).notNull().default("scheduled"),
    originalScheduledAt: datetime("original_scheduled_at"),
    postponeReason: varchar("postpone_reason", { length: 255 }),
    heldAt: datetime("held_at"),
    /** The instructor credited for the session (payroll). */
    heldBy: varchar("held_by", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    /** Mode and rate at the time it was held, so later changes keep history. */
    heldMode: mysqlEnum("held_mode", GROUP_MODES),
    rate: decimal("rate", { precision: 10, scale: 2 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("class_session_group_kind_number_unique").on(table.groupId, table.kind, table.number),
    index("class_session_scheduled_idx").on(table.scheduledAt),
    index("class_session_held_by_idx").on(table.heldBy, table.heldAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Attendance and evaluation                                                   */
/* -------------------------------------------------------------------------- */

export const ATTENDANCE_STATUSES = ["present", "late", "absent", "excused"] as const;

/**
 * Per-session evaluation criteria, each scored 1–4 (beginning, approaching,
 * meeting, exceeding). Based on computational thinking, the engineering design
 * process and the collaboration/communication/creativity skills of STEM
 * education. The order here is the order shown to instructors.
 */
export const CRITERIA = [
  "understanding",
  "computational",
  "building",
  "creativity",
  "collaboration",
  "conduct",
] as const;
export type Criterion = (typeof CRITERIA)[number];

export const attendance = mysqlTable(
  "attendance",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("session_id")
      .notNull()
      .references(() => classSession.id, { onDelete: "cascade" }),
    studentId: int("student_id")
      .notNull()
      .references(() => student.id),
    status: mysqlEnum("status", ATTENDANCE_STATUSES).notNull(),
    /** Scores are null when the student was absent or excused. */
    understanding: tinyint("understanding"),
    computational: tinyint("computational"),
    building: tinyint("building"),
    creativity: tinyint("creativity"),
    collaboration: tinyint("collaboration"),
    conduct: tinyint("conduct"),
    note: varchar("note", { length: 500 }),
    recordedBy: varchar("recorded_by", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("attendance_session_student_unique").on(table.sessionId, table.studentId),
    index("attendance_student_idx").on(table.studentId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Instructor requests and pay                                                 */
/* -------------------------------------------------------------------------- */

export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;

/** An instructor's request to add a student to one of their groups. */
export const studentRequest = mysqlTable(
  "student_request",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("group_id")
      .notNull()
      .references(() => classGroup.id, { onDelete: "cascade" }),
    requestedBy: varchar("requested_by", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    nameAr: varchar("name_ar", { length: 160 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }),
    birthDate: date("birth_date", { mode: "string" }),
    motherPhone: varchar("mother_phone", { length: 20 }),
    fatherPhone: varchar("father_phone", { length: 20 }),
    notes: text("notes"),
    status: mysqlEnum("status", REQUEST_STATUSES).notNull().default("pending"),
    reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    reviewedAt: datetime("reviewed_at"),
    reviewNote: varchar("review_note", { length: 255 }),
    /** The student created or matched when approved. */
    studentId: int("student_id").references(() => student.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("student_request_status_idx").on(table.status),
    index("student_request_group_idx").on(table.groupId),
  ],
);

/** Per-session pay. Instructors without a row are paid the defaults. */
export const DEFAULT_RATES = { offline: 350, online: 300 } as const;

export const instructorRate = mysqlTable("instructor_rate", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  rateOffline: decimal("rate_offline", { precision: 10, scale: 2 }).notNull(),
  rateOnline: decimal("rate_online", { precision: 10, scale: 2 }).notNull(),
  updatedAt: updatedAt(),
});

/* -------------------------------------------------------------------------- */
/* Payroll                                                                     */
/* -------------------------------------------------------------------------- */

export const ADJUSTMENT_KINDS = ["bonus", "deduction"] as const;

/** A bonus or deduction for an instructor in a Cairo month (YYYY-MM). */
export const payrollAdjustment = mysqlTable(
  "payroll_adjustment",
  {
    id: int("id").autoincrement().primaryKey(),
    instructorId: varchar("instructor_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    month: varchar("month", { length: 7 }).notNull(),
    kind: mysqlEnum("kind", ADJUSTMENT_KINDS).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    createdBy: varchar("created_by", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [index("payroll_adjustment_month_idx").on(table.instructorId, table.month)],
);

/**
 * Money transferred to an instructor for a month. Each transfer is a receipt;
 * its id is the receipt number. Transfers are never deleted, only voided.
 */
export const payrollPayment = mysqlTable(
  "payroll_payment",
  {
    id: int("id").autoincrement().primaryKey(),
    instructorId: varchar("instructor_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    month: varchar("month", { length: 7 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    method: mysqlEnum("method", PAYMENT_METHODS).notNull(),
    reference: varchar("reference", { length: 120 }),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    notes: varchar("notes", { length: 500 }),
    /** Snapshot of the month's figures when this transfer was made. */
    sessionsAmount: decimal("sessions_amount", { precision: 10, scale: 2 }).notNull(),
    bonuses: decimal("bonuses", { precision: 10, scale: 2 }).notNull(),
    deductions: decimal("deductions", { precision: 10, scale: 2 }).notNull(),
    paidBefore: decimal("paid_before", { precision: 10, scale: 2 }).notNull(),
    createdBy: varchar("created_by", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    voidedAt: datetime("voided_at"),
    voidedBy: varchar("voided_by", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    voidReason: varchar("void_reason", { length: 255 }),
  },
  (table) => [index("payroll_payment_month_idx").on(table.instructorId, table.month)],
);
