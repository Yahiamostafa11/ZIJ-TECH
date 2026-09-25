"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { emailChange, nameChangeRequest, user } from "@/lib/db/schema";
import { field, parseForm, type ActionState } from "@/lib/forms";
import { bilingualMail, sendMail } from "@/lib/mail";
import { auth } from ".";
import { hasRealEmail, parseLogin } from "./accounts";
import { hashToken } from "./email-tokens";
import { applyName } from "./names";
import { requireUser } from "./session";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "required"),
    newPassword: z.string().min(10, "passwordTooShort").max(128, "tooLong"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "passwordSame",
  });

/** Changes the signed-in user's password; always allowed, also clears a temporary password. */
export async function changeOwnPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser({ allowTemporaryPassword: true });
  const parsed = parseForm(passwordSchema, formData);
  if (!parsed.data) return parsed.state;

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: "checkFields", fieldErrors: { currentPassword: "wrongPassword" } };
    }
    throw error;
  }

  await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, me.id));
  await audit(db, me.id, "user.password_change", "user", me.id);
  if (hasRealEmail(me)) {
    await sendMail({
      to: me.email,
      subject: "Zij Academy — password changed / تم تغيير كلمة المرور",
      ...bilingualMail({
        ar: { title: "تم تغيير كلمة المرور", body: "تم تغيير كلمة مرور حسابك في أكاديمية زيج. إذا لم تقم بذلك، تواصل مع الأكاديمية فورًا." },
        en: { title: "Your password was changed", body: "Your Zij Academy password was just changed. If this was not you, contact the academy right away." },
      }),
    });
  }

  revalidatePath("/account");
  return { ok: true, message: "passwordChanged" };
}

const nameSchema = z.object({ nameAr: field.text(160), nameEn: field.optionalText(160) });

/**
 * The first name edit applies immediately. After that, a new name is sent to
 * the academy for approval so official names (certificates) stay reliable.
 */
export async function updateOwnName(_: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser({ allowTemporaryPassword: true });
  const parsed = parseForm(nameSchema, formData);
  if (!parsed.data) return parsed.state;
  const { nameAr, nameEn } = parsed.data;

  if (me.nameEditsUsed < 1) {
    await db.transaction(async (tx) => {
      await applyName(tx, me.id, nameAr, nameEn);
      await tx.update(user).set({ nameEditsUsed: me.nameEditsUsed + 1 }).where(eq(user.id, me.id));
      await audit(tx, me.id, "user.name_self_edit", "user", me.id, { nameAr, nameEn });
    });
    revalidatePath("/account");
    return { ok: true, message: "nameSaved" };
  }

  const [pending] = await db
    .select({ id: nameChangeRequest.id })
    .from(nameChangeRequest)
    .where(and(eq(nameChangeRequest.userId, me.id), eq(nameChangeRequest.status, "pending")));
  if (pending) {
    await db.update(nameChangeRequest).set({ nameAr, nameEn }).where(eq(nameChangeRequest.id, pending.id));
  } else {
    await db.insert(nameChangeRequest).values({ userId: me.id, nameAr, nameEn });
  }
  await audit(db, me.id, "user.name_change_request", "user", me.id, { nameAr, nameEn });
  revalidatePath("/account");
  return { ok: true, message: "nameRequested" };
}

const emailSchema = z.object({ email: z.email("invalidEmail").max(255, "tooLong") });


/** Sends a confirmation link to a new email; it replaces the old one only once confirmed. */
export async function requestEmailChange(_: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser({ allowTemporaryPassword: true });
  const parsed = parseForm(emailSchema, formData);
  if (!parsed.data) return parsed.state;
  const email = parsed.data.email.toLowerCase();

  if (email.endsWith(".invalid")) return { error: "checkFields", fieldErrors: { email: "invalidEmail" } };
  const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (taken && taken.id !== me.id) return { error: "checkFields", fieldErrors: { email: "emailTaken" } };
  if (taken && me.emailVerified) return { error: "checkFields", fieldErrors: { email: "emailSame" } };

  const token = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx.delete(emailChange).where(eq(emailChange.userId, me.id));
    await tx.insert(emailChange).values({
      userId: me.id,
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });

  const url = `${process.env.BETTER_AUTH_URL ?? ""}/account/verify-email?token=${token}`;
  const sent = await sendMail({
    to: email,
    subject: "Zij Academy — confirm your email / تأكيد البريد الإلكتروني",
    ...bilingualMail({
      ar: {
        title: "تأكيد البريد الإلكتروني",
        body: "اضغط الزر لربط هذا البريد بحسابك في أكاديمية زيج. ستصلك عليه الإشعارات وروابط استعادة كلمة المرور. الرابط صالح لمدة 24 ساعة.",
      },
      en: {
        title: "Confirm your email",
        body: "Press the button to link this email to your Zij Academy account. Notifications and password reset links will be sent here. The link works for 24 hours.",
      },
      link: { url, ar: "تأكيد البريد", en: "Confirm email" },
    }),
  });
  if (!sent) return { error: "mailFailed" };

  await audit(db, me.id, "user.email_change_request", "user", me.id, { email });
  revalidatePath("/account");
  return { ok: true, message: "verificationSent" };
}

const recentResets = new Map<string, number>();

/**
 * "Forgot password": finds the account by username or email and emails a
 * link only if it has a verified email. The reply is the same either way so
 * it cannot be used to discover accounts.
 */
export async function requestPasswordResetLink(_: ActionState, formData: FormData): Promise<ActionState> {
  const login = String(formData.get("login") ?? "").trim();
  if (!login) return { error: "checkFields", fieldErrors: { login: "required" } };

  const parsed = parseLogin(login);
  const [account] = await db
    .select({ id: user.id, email: user.email, emailVerified: user.emailVerified })
    .from(user)
    .where("username" in parsed ? eq(user.username, parsed.username) : eq(user.email, parsed.email));

  const lastSent = account ? recentResets.get(account.id) ?? 0 : 0;
  if (account && hasRealEmail(account) && Date.now() - lastSent > 5 * 60 * 1000) {
    recentResets.set(account.id, Date.now());
    await auth.api.requestPasswordReset({ body: { email: account.email, redirectTo: "/reset-password" } });
  }
  return { ok: true, message: "resetRequested" };
}
