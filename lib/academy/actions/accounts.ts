"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { LOGIN_DOMAIN, USERNAME_PATTERN, placeholderEmail } from "@/lib/auth/accounts";
import { applyName } from "@/lib/auth/names";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { guardian, student } from "@/lib/db/academy";
import { account, nameChangeRequest, session, user, userRole } from "@/lib/db/schema";
import { parseForm, type ActionState } from "@/lib/forms";
import { bilingualMail, sendMail } from "@/lib/mail";
import { hasRealEmail } from "@/lib/auth/accounts";
import { requireStudentAccess } from "../scope";

export type CredentialsState = ActionState & {
  loginId?: string;
  password?: string;
  /** Opens WhatsApp with the login details ready to send to the parent. */
  whatsappUrl?: string;
};

type Kind = "student" | "parent";

const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(new RegExp(`@${LOGIN_DOMAIN}$`), ""))
    .pipe(z.string().regex(USERNAME_PATTERN, "invalidUsername")),
});

function temporaryPassword() {
  return randomBytes(9).toString("base64url");
}

/** The record an account belongs to, its phone for WhatsApp, and the student used for access checks. */
async function loadRecord(kind: Kind, id: number) {
  if (kind === "student") {
    const [row] = await db.select().from(student).where(eq(student.id, id));
    if (!row) return null;
    const phones = await db
      .select({ phone: guardian.phone, relation: guardian.relation })
      .from(guardian)
      .where(eq(guardian.familyId, row.familyId))
      .orderBy(asc(guardian.relation));
    return {
      studentId: row.id,
      userId: row.userId,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      phone: phones[0]?.phone ?? null,
    };
  }
  const [row] = await db.select().from(guardian).where(eq(guardian.id, id));
  if (!row) return null;
  const [child] = await db.select({ id: student.id, nameAr: student.nameAr }).from(student).where(eq(student.familyId, row.familyId));
  if (!child) return null;
  return {
    studentId: child.id,
    userId: row.userId,
    nameAr: row.name ?? `${row.relation === "mother" ? "والدة" : row.relation === "father" ? "والد" : "ولي أمر"} ${child.nameAr}`,
    nameEn: null,
    phone: row.phone,
  };
}

function whatsappLink(phone: string | null, name: string, loginId: string, password: string) {
  if (!phone) return undefined;
  const site = process.env.BETTER_AUTH_URL ?? "";
  const message = [
    `أهلًا، هذه بيانات الدخول لحساب ${name} في بوابة أكاديمية زيج:`,
    `اسم المستخدم: ${loginId}`,
    `كلمة المرور المؤقتة: ${password}`,
    `رابط الدخول: ${site}/login`,
    "سيُطلب منك اختيار كلمة مرور جديدة عند أول دخول، ويمكنك إضافة بريدك الإلكتروني من صفحة حسابي.",
  ].join("\n");
  return `https://wa.me/2${phone}?text=${encodeURIComponent(message)}`;
}

/** Creates the portal login for a student or a parent and returns the one-time credentials. */
export async function createFamilyAccount(
  kind: Kind,
  recordId: number,
  _: CredentialsState,
  formData: FormData,
): Promise<CredentialsState> {
  const actor = await requirePermission("students.write");
  const record = await loadRecord(kind, recordId);
  if (!record) return { error: "notFound" };
  await requireStudentAccess(actor, record.studentId);
  if (record.userId) return { error: "accountExists" };

  const parsed = parseForm(usernameSchema, formData);
  if (!parsed.data) return parsed.state;
  const { username } = parsed.data;
  const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.username, username));
  if (taken) return { error: "checkFields", fieldErrors: { username: "usernameTaken" } };

  const id = randomUUID();
  const password = temporaryPassword();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name: record.nameAr,
      nameAr: record.nameAr,
      nameEn: record.nameEn,
      username,
      email: placeholderEmail(username),
      emailVerified: false,
      mustChangePassword: true,
    });
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(password),
    });
    await tx.insert(userRole).values({ userId: id, role: kind, branchId: null });
    if (kind === "student") await tx.update(student).set({ userId: id }).where(eq(student.id, recordId));
    else await tx.update(guardian).set({ userId: id }).where(eq(guardian.id, recordId));
    await audit(tx, actor.id, `${kind}.account_create`, kind === "student" ? "student" : "guardian", recordId, { username });
  });

  const loginId = `${username}@${LOGIN_DOMAIN}`;
  revalidatePath(`/admin/academy/students/${record.studentId}`);
  return {
    ok: true,
    message: "accountCreated",
    loginId,
    password,
    whatsappUrl: whatsappLink(record.phone, record.nameAr, loginId, password),
  };
}

/** New temporary password for a student or parent account; they must change it at next login. */
export async function resetFamilyAccount(kind: Kind, recordId: number): Promise<CredentialsState> {
  const actor = await requirePermission("students.write");
  const record = await loadRecord(kind, recordId);
  if (!record?.userId) return { error: "notFound" };
  await requireStudentAccess(actor, record.studentId);

  const [target] = await db.select().from(user).where(eq(user.id, record.userId));
  if (!target?.username) return { error: "notFound" };

  const password = temporaryPassword();
  await db.transaction(async (tx) => {
    await tx
      .update(account)
      .set({ password: await hashPassword(password) })
      .where(and(eq(account.userId, target.id), eq(account.providerId, "credential")));
    await tx.update(user).set({ mustChangePassword: true }).where(eq(user.id, target.id));
    await tx.delete(session).where(eq(session.userId, target.id));
    await audit(tx, actor.id, "user.reset_password", "user", target.id, { kind, recordId });
  });

  const loginId = `${target.username}@${LOGIN_DOMAIN}`;
  return {
    ok: true,
    message: "passwordReset",
    loginId,
    password,
    whatsappUrl: whatsappLink(record.phone, target.nameAr ?? target.name, loginId, password),
  };
}

/** Approves or rejects a name change submitted after the free edit. */
export async function reviewNameRequest(requestId: number, approve: boolean): Promise<ActionState> {
  const actor = await requirePermission("users.manage");
  const [request] = await db.select().from(nameChangeRequest).where(eq(nameChangeRequest.id, requestId));
  if (!request || request.status !== "pending") return { error: "notFound" };

  await db.transaction(async (tx) => {
    if (approve) await applyName(tx, request.userId, request.nameAr, request.nameEn);
    await tx
      .update(nameChangeRequest)
      .set({ status: approve ? "approved" : "rejected", reviewedBy: actor.id, reviewedAt: new Date() })
      .where(eq(nameChangeRequest.id, requestId));
    await audit(tx, actor.id, approve ? "user.name_change_approve" : "user.name_change_reject", "user", request.userId, {
      nameAr: request.nameAr,
      nameEn: request.nameEn,
    });
  });

  const [target] = await db.select().from(user).where(eq(user.id, request.userId));
  if (target && hasRealEmail(target)) {
    await sendMail({
      to: target.email,
      subject: approve ? "Zij Academy — name change approved / تمت الموافقة على تعديل الاسم" : "Zij Academy — name change not approved / لم تتم الموافقة على تعديل الاسم",
      ...bilingualMail(
        approve
          ? {
              ar: { title: "تمت الموافقة على تعديل الاسم", body: `أصبح اسمك في الأكاديمية: ${request.nameAr}${request.nameEn ? ` / ${request.nameEn}` : ""}.` },
              en: { title: "Name change approved", body: `Your name at the academy is now: ${request.nameAr}${request.nameEn ? ` / ${request.nameEn}` : ""}.` },
            }
          : {
              ar: { title: "لم تتم الموافقة على تعديل الاسم", body: "لم يتم اعتماد الاسم المطلوب. تواصل مع الأكاديمية لمزيد من التفاصيل." },
              en: { title: "Name change not approved", body: "The requested name was not approved. Contact the academy for details." },
            },
      ),
    });
  }

  revalidatePath("/admin/academy/users");
  return { ok: true, message: "saved" };
}
