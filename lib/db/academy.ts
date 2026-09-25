import {
  bigint,
  boolean,
  date,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  smallint,
  text,
  time,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { branch, createdAt, updatedAt, user } from "./schema";

/* -------------------------------------------------------------------------- */
/* Curriculum                                                                  */
/* -------------------------------------------------------------------------- */

/** A track of study, e.g. Robotics or Programming. */
export const program = mysqlTable("program", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("name_ar", { length: 120 }).notNull(),
  nameEn: varchar("name_en", { length: 120 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const level = mysqlTable(
  "level",
  {
    id: int("id").autoincrement().primaryKey(),
    programId: int("program_id")
      .notNull()
      .references(() => program.id),
    nameAr: varchar("name_ar", { length: 120 }).notNull(),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    /** Order within the program; the next level is position + 1. */
    position: int("position").notNull().default(1),
    sessionCount: int("session_count").notNull().default(12),
    passMark: int("pass_mark").notNull().default(65),
    remedialMin: int("remedial_min").notNull().default(2),
    remedialMax: int("remedial_max").notNull().default(4),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [index("level_program_idx").on(table.programId)],
);

/* -------------------------------------------------------------------------- */
/* Groups                                                                      */
/* -------------------------------------------------------------------------- */

export const GROUP_MODES = ["offline", "online"] as const;
export const GROUP_STATUSES = ["planned", "active", "completed", "cancelled"] as const;

export const classGroup = mysqlTable(
  "class_group",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    levelId: int("level_id")
      .notNull()
      .references(() => level.id),
    mode: mysqlEnum("mode", GROUP_MODES).notNull(),
    /** NULL for online groups, which only unscoped admins manage. */
    branchId: int("branch_id").references(() => branch.id),
    instructorId: varchar("instructor_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    capacityMin: int("capacity_min").notNull(),
    capacityMax: int("capacity_max").notNull(),
    /** Default price for new enrollments; each enrollment keeps its own copy. */
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    startDate: date("start_date", { mode: "string" }),
    status: mysqlEnum("status", GROUP_STATUSES).notNull().default("active"),
    meetingUrl: varchar("meeting_url", { length: 500 }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("class_group_branch_idx").on(table.branchId),
    index("class_group_instructor_idx").on(table.instructorId),
    index("class_group_level_idx").on(table.levelId),
  ],
);

/** A weekly time slot. Weekday follows JavaScript: 0 = Sunday … 6 = Saturday. */
export const groupSlot = mysqlTable(
  "group_slot",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("group_id")
      .notNull()
      .references(() => classGroup.id, { onDelete: "cascade" }),
    weekday: tinyint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    durationMinutes: int("duration_minutes").notNull().default(90),
  },
  (table) => [index("group_slot_group_idx").on(table.groupId)],
);

/* -------------------------------------------------------------------------- */
/* Families and students                                                       */
/* -------------------------------------------------------------------------- */

/** The paying household. Siblings share one family. */
export const family = mysqlTable("family", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const GUARDIAN_RELATIONS = ["mother", "father", "other"] as const;

export const guardian = mysqlTable(
  "guardian",
  {
    id: int("id").autoincrement().primaryKey(),
    familyId: int("family_id")
      .notNull()
      .references(() => family.id, { onDelete: "cascade" }),
    relation: mysqlEnum("relation", GUARDIAN_RELATIONS).notNull(),
    name: varchar("name", { length: 160 }),
    /** Normalised Egyptian mobile number, e.g. 01012345678. One family per number. */
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (table) => [index("guardian_family_idx").on(table.familyId)],
);

export const STUDENT_STATUSES = ["active", "archived"] as const;

export const student = mysqlTable(
  "student",
  {
    id: int("id").autoincrement().primaryKey(),
    familyId: int("family_id")
      .notNull()
      .references(() => family.id),
    nameAr: varchar("name_ar", { length: 160 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }),
    /** Normalised Arabic name used to match re-imported rows to this student. */
    nameKey: varchar("name_key", { length: 160 }).notNull(),
    birthDate: date("birth_date", { mode: "string" }),
    /** Estimated from an age when the birth date is unknown. */
    birthYear: smallint("birth_year"),
    school: varchar("school", { length: 160 }),
    notes: text("notes"),
    status: mysqlEnum("status", STUDENT_STATUSES).notNull().default("active"),
    /** Guardian consent to show the student's work or photos publicly. */
    photoConsent: boolean("photo_consent").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("student_family_idx").on(table.familyId),
    index("student_name_key_idx").on(table.familyId, table.nameKey),
  ],
);

/* -------------------------------------------------------------------------- */
/* Enrollment and payments                                                     */
/* -------------------------------------------------------------------------- */

export const ENROLLMENT_STATUSES = ["active", "completed", "withdrawn", "transferred"] as const;

export const enrollment = mysqlTable(
  "enrollment",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("student_id")
      .notNull()
      .references(() => student.id),
    groupId: int("group_id")
      .notNull()
      .references(() => classGroup.id),
    /** Agreed price at enrollment; later group price changes do not affect it. */
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0.00"),
    status: mysqlEnum("status", ENROLLMENT_STATUSES).notNull().default("active"),
    enrolledAt: datetime("enrolled_at").notNull().$defaultFn(() => new Date()),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("enrollment_student_group_unique").on(table.studentId, table.groupId),
    index("enrollment_group_idx").on(table.groupId),
  ],
);

export const PAYMENT_METHODS = [
  "cash",
  "instapay",
  "vodafone_cash",
  "bank_transfer",
  "other",
] as const;

export const payment = mysqlTable(
  "payment",
  {
    id: int("id").autoincrement().primaryKey(),
    enrollmentId: int("enrollment_id")
      .notNull()
      .references(() => enrollment.id),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    method: mysqlEnum("method", PAYMENT_METHODS).notNull(),
    reference: varchar("reference", { length: 120 }),
    notes: text("notes"),
    source: mysqlEnum("source", ["manual", "import"]).notNull().default("manual"),
    receivedBy: varchar("received_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    /** Payments are never deleted; a mistaken one is voided with a reason. */
    voidedAt: datetime("voided_at"),
    voidedBy: varchar("voided_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    voidReason: varchar("void_reason", { length: 255 }),
  },
  (table) => [
    index("payment_enrollment_idx").on(table.enrollmentId),
    index("payment_paid_on_idx").on(table.paidOn),
  ],
);

/** One Excel upload, kept for the audit trail. */
export const importBatch = mysqlTable("import_batch", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => user.id, {
    onDelete: "set null",
  }),
  summary: text("summary").notNull(),
  createdAt: createdAt(),
});
