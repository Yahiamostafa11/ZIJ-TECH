import React from "react";
import { and, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, KeyRound, Mail, ShieldAlert, UserRound } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { PasswordInput } from "@/components/portal/PasswordInput";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge, Card, DetailList, Field, PageHeader, inputClass } from "@/components/portal/ui";
import { changeOwnPassword, requestEmailChange, updateOwnName } from "@/lib/auth/account-actions";
import { hasRealEmail, loginIdOf } from "@/lib/auth/accounts";
import { homePathFor } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { emailChange, nameChangeRequest } from "@/lib/db/schema";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const user = await requireUser({ allowTemporaryPassword: true });
  const [t, params, [pendingName], [pendingEmail]] = await Promise.all([
    getTranslations(),
    searchParams,
    db
      .select()
      .from(nameChangeRequest)
      .where(and(eq(nameChangeRequest.userId, user.id), eq(nameChangeRequest.status, "pending"))),
    db.select().from(emailChange).where(eq(emailChange.userId, user.id)).orderBy(desc(emailChange.id)).limit(1),
  ]);

  const realEmail = hasRealEmail(user);
  const freeEdit = user.nameEditsUsed < 1;
  const passwordFields = (
    <>
      {(["currentPassword", "newPassword", "confirmPassword"] as const).map((name) => (
        <Field key={name} label={t(`account.${name}`)} htmlFor={name}>
          <PasswordInput
            id={name}
            name={name}
            autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
          />
          <FieldError name={name} />
        </Field>
      ))}
    </>
  );

  return (
    <PortalShell user={user} title="account" basePath={homePathFor(user.grants) ?? "/account"}>
      <div className="mx-auto grid max-w-3xl gap-6">
        <PageHeader title={t("account.title")} description={<bdi>{user.nameAr ?? user.name}</bdi>} />

        {user.mustChangePassword && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
            <ShieldAlert size={20} className="mt-0.5 shrink-0" />
            <p>{t("account.mustChange")}</p>
          </div>
        )}
        {params.email === "verified" && (
          <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success">
            <CheckCircle2 size={20} /> {t("account.emailVerified")}
          </div>
        )}
        {params.email === "invalid" && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">{t("account.emailLinkInvalid")}</div>
        )}

        <Card title={<span className="flex items-center gap-2"><KeyRound size={18} /> {t("account.changePassword")}</span>}>
          <ActionForm action={changeOwnPassword} resetOnSuccess className="grid max-w-md gap-4">
            {passwordFields}
            <div className="flex items-center gap-4">
              <SubmitButton>{t("account.submit")}</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </Card>

        <Card title={<span className="flex items-center gap-2"><UserRound size={18} /> {t("account.names")}</span>}>
          <DetailList
            items={[
              { label: t("account.loginId"), value: <span dir="ltr">{loginIdOf(user)}</span> },
              { label: t("fields.nameAr"), value: user.nameAr ?? "—" },
              { label: t("fields.nameEn"), value: <span dir="ltr">{user.nameEn ?? "—"}</span> },
            ]}
          />
          <p className="mt-5 text-sm text-text-secondary">
            {freeEdit ? t("account.nameFreeEdit") : pendingName ? t("account.namePending") : t("account.nameNeedsApproval")}
          </p>
          {pendingName && (
            <p className="mt-2 text-sm">
              <Badge tone="gold">{t("account.requested")}</Badge>{" "}
              <bdi>{pendingName.nameAr}</bdi>
              {pendingName.nameEn && <> · <bdi>{pendingName.nameEn}</bdi></>}
            </p>
          )}
          <ActionForm action={updateOwnName} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t("fields.nameAr")} htmlFor="nameAr">
              <input id="nameAr" name="nameAr" dir="rtl" defaultValue={pendingName?.nameAr ?? user.nameAr ?? user.name} className={inputClass} />
              <FieldError name="nameAr" />
            </Field>
            <Field label={t("fields.nameEn")} htmlFor="nameEn" hint={t("students.nameEnHint")}>
              <input id="nameEn" name="nameEn" dir="ltr" defaultValue={pendingName?.nameEn ?? user.nameEn ?? ""} className={inputClass} />
              <FieldError name="nameEn" />
            </Field>
            <div className="flex items-center gap-4 sm:col-span-2">
              <SubmitButton variant="secondary">{freeEdit ? t("account.saveName") : t("account.requestName")}</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Mail size={18} /> {t("account.email")}</span>}>
          {realEmail ? (
            <p className="text-sm">
              <span dir="ltr">{user.email}</span> <Badge tone="green">{t("account.verified")}</Badge>
            </p>
          ) : (
            <p className="text-sm text-text-secondary">{t("account.emailWhy")}</p>
          )}
          {pendingEmail && pendingEmail.expiresAt > new Date() && (
            <p className="mt-3 text-sm text-gold-light">
              {t("account.emailPendingPrefix")} <span dir="ltr">{pendingEmail.email}</span>. {t("account.emailPendingSuffix")}
            </p>
          )}
          <ActionForm action={requestEmailChange} className="mt-4 grid max-w-md gap-3">
            <Field label={realEmail ? t("account.changeEmail") : t("account.addEmail")} htmlFor="email">
              <input id="email" name="email" type="email" dir="ltr" autoComplete="email" placeholder="name@gmail.com" className={inputClass} />
              <FieldError name="email" />
            </Field>
            <div className="flex items-center gap-4">
              <SubmitButton variant="secondary">{t("account.sendConfirmation")}</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </Card>
      </div>
    </PortalShell>
  );
}
