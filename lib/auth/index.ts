import "server-only";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { bilingualMail, sendMail } from "@/lib/mail";
import { USERNAME_PATTERN, hasRealEmail } from "./accounts";

export const auth = betterAuth({
  appName: "ZIJ Technologies",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "mysql", schema }),
  emailAndPassword: {
    enabled: true,
    // Accounts are created by an administrator, never through public sign-up.
    disableSignUp: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    // Reset links only go to an email the person verified themselves.
    sendResetPassword: async ({ user, url }) => {
      if (!hasRealEmail(user)) return;
      await sendMail({
        to: user.email,
        subject: "Zij Academy — reset your password / إعادة تعيين كلمة المرور",
        ...bilingualMail({
          ar: {
            title: "إعادة تعيين كلمة المرور",
            body: "طلبت إعادة تعيين كلمة المرور لحسابك في أكاديمية زيج. الرابط صالح لمدة ساعة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.",
          },
          en: {
            title: "Reset your password",
            body: "You asked to reset your Zij Academy password. The link works for one hour. If you did not ask, ignore this email.",
          },
          link: { url, ar: "تعيين كلمة مرور جديدة", en: "Set a new password" },
        }),
      });
    },
    onPasswordReset: async ({ user }) => {
      await db.update(schema.user).set({ mustChangePassword: false }).where(eq(schema.user.id, user.id));
      await audit(db, user.id, "user.password_reset_by_email", "user", user.id);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 40,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
      displayUsername: false,
    }),
    nextCookies(),
  ],
});
