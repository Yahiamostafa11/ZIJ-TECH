import {
  bigint,
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/*
 * Timestamps are UTC DATETIME values set by the application, not by database
 * defaults. This avoids TIMESTAMP's 2038 limit and differences between the
 * MariaDB/MySQL server time zone and the application's.
 */
export const createdAt = () =>
  datetime("created_at").notNull().$defaultFn(() => new Date());
export const updatedAt = () =>
  datetime("updated_at")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

/* -------------------------------------------------------------------------- */
/* Better Auth tables. Column names must match what Better Auth expects.       */
/* -------------------------------------------------------------------------- */

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  /** Display name; kept in sync with nameAr/nameEn. */
  name: varchar("name", { length: 255 }).notNull(),
  /**
   * Login email for staff, or the person's own verified email. Username-only
   * accounts get an undeliverable placeholder (see lib/auth/accounts.ts).
   */
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Login name shown as <username>@zij-academy (Better Auth username plugin). */
  username: varchar("username", { length: 64 }).unique(),
  nameAr: varchar("name_ar", { length: 160 }),
  nameEn: varchar("name_en", { length: 160 }),
  /** Free self-service name edits used; after one, changes need approval. */
  nameEditsUsed: int("name_edits_used").notNull().default(0),
  /** Set for new accounts and admin resets; cleared when they choose a password. */
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = mysqlTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: datetime("expires_at").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = mysqlTable(
  "account",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: datetime("access_token_expires_at"),
    refreshTokenExpiresAt: datetime("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = mysqlTable(
  "verification",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = mysqlTable("rate_limit", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  count: int("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* -------------------------------------------------------------------------- */
/* Organisation and access control.                                            */
/* -------------------------------------------------------------------------- */

/** A physical academy branch. Online groups belong to no branch. */
export const branch = mysqlTable("branch", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("name_ar", { length: 120 }).notNull(),
  nameEn: varchar("name_en", { length: 120 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const ROLES = [
  "super_admin",
  "academy_admin",
  "branch_admin",
  "moderator",
  "instructor",
  "student",
  "parent",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * A role granted to a user, optionally narrowed to one branch.
 * branch_id NULL means the role applies to every branch (and to online groups).
 */
export const userRole = mysqlTable(
  "user_role",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ROLES).notNull(),
    branchId: int("branch_id").references(() => branch.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("user_role_unique").on(table.userId, table.role, table.branchId),
    index("user_role_user_id_idx").on(table.userId),
  ],
);

/** Append-only record of who changed what. Children's data requires this. */
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    actorId: varchar("actor_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 80 }).notNull(),
    entity: varchar("entity", { length: 60 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    details: text("details"),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_log_entity_idx").on(table.entity, table.entityId),
    index("audit_log_actor_idx").on(table.actorId),
  ],
);

/** A name change submitted after the free edit was used; an admin decides. */
export const nameChangeRequest = mysqlTable(
  "name_change_request",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nameAr: varchar("name_ar", { length: 160 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
    reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    reviewedAt: datetime("reviewed_at"),
    createdAt: createdAt(),
  },
  (table) => [index("name_change_request_status_idx").on(table.status)],
);

/** Pending "add my email" confirmation. Only a hash of the token is stored. */
export const emailChange = mysqlTable(
  "email_change",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("email_change_user_idx").on(table.userId)],
);
