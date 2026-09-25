"use client";

import React, { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { createUser, resetPassword, revokeRole, type CreateUserState } from "@/lib/auth/actions";
import type { Role } from "@/lib/db/schema";
import { Field, buttonClass, inputClass } from "./ui";

type BranchOption = { id: number; name: string };

function RoleFields({ roles, branches, prefix }: { roles: Role[]; branches: BranchOption[]; prefix: string }) {
  const t = useTranslations();
  const [role, setRole] = useState<Role>(roles.includes("instructor") ? "instructor" : roles[0]);
  return (
    <>
      <Field label={t("users.role")} htmlFor={`${prefix}-role`}>
        <select id={`${prefix}-role`} name="role" value={role} onChange={(event) => setRole(event.target.value as Role)} className={inputClass}>
          {roles.map((item) => (
            <option key={item} value={item}>
              {t(`options.role.${item}`)}
            </option>
          ))}
        </select>
      </Field>
      {role === "branch_admin" && (
        <Field label={t("fields.branch")} htmlFor={`${prefix}-branch`}>
          <select id={`${prefix}-branch`} name="branchId" defaultValue={branches[0]?.id ?? ""} className={inputClass}>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      )}
    </>
  );
}

/** Shows a generated password once, for the admin to pass on privately. */
function PasswordNotice({ password, email }: { password: string; email?: string }) {
  const t = useTranslations("users");
  return (
    <div className="rounded-md border border-gold-primary/50 bg-gold-primary/10 p-4 text-sm">
      <p className="text-gold-light">{t("passwordOnce")}</p>
      {email && (
        <p className="mt-2" dir="ltr">
          {email}
        </p>
      )}
      <p className="mt-1 select-all font-mono text-lg text-text-primary" dir="ltr">
        {password}
      </p>
    </div>
  );
}

export function CreateUserForm({ roles, branches }: { roles: Role[]; branches: BranchOption[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<CreateUserState, FormData>(createUser, {});

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label={t("fields.name")} htmlFor="user-name">
        <input id="user-name" name="name" className={inputClass} />
        {state.fieldErrors?.name && <p className="text-xs text-danger">{t(`errors.${state.fieldErrors.name}`)}</p>}
      </Field>
      <Field label={t("fields.email")} htmlFor="user-email">
        <input id="user-email" name="email" type="email" dir="ltr" className={inputClass} />
        {state.fieldErrors?.email && <p className="text-xs text-danger">{t(`errors.${state.fieldErrors.email}`)}</p>}
      </Field>
      <RoleFields roles={roles} branches={branches} prefix="new" />
      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {t("users.create")}
        </button>
        {state.error && <p className="text-sm text-danger">{t(`errors.${state.error}`)}</p>}
      </div>
      {state.password && (
        <div className="sm:col-span-2">
          <PasswordNotice password={state.password} email={state.email} />
        </div>
      )}
    </form>
  );
}

export function GrantRoleForm({
  action,
  roles,
  branches,
  prefix,
}: {
  action: (state: CreateUserState, formData: FormData) => Promise<CreateUserState>;
  roles: Role[];
  branches: BranchOption[];
  prefix: string;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <RoleFields roles={roles} branches={branches} prefix={prefix} />
      <button type="submit" disabled={pending} className={buttonClass("secondary")}>
        {t("users.grant")}
      </button>
      {state.error && <p className="text-sm text-danger sm:col-span-3">{t(`errors.${state.error}`)}</p>}
    </form>
  );
}

export function RevokeRoleButton({ roleId, label }: { roleId: number; label: string }) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={isPending}
        aria-label={t("users.revoke", { role: label })}
        title={t("users.revoke", { role: label })}
        onClick={() =>
          startTransition(async () => {
            const result = await revokeRole(roleId);
            setError(result.error ?? null);
          })
        }
        className="ms-1 rounded-full p-0.5 text-text-secondary hover:bg-danger/20 hover:text-danger"
      >
        <X size={12} />
      </button>
      {error && <span className="text-xs text-danger">{t(`errors.${error}`)}</span>}
    </>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const t = useTranslations();
  const [result, setResult] = useState<{ password?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(t("users.confirmReset"))) return;
          startTransition(async () => setResult(await resetPassword(userId)));
        }}
        className={buttonClass("ghost")}
      >
        {t("users.resetPassword")}
      </button>
      {result?.password && <PasswordNotice password={result.password} />}
      {result?.error && <p className="text-xs text-danger">{t(`errors.${result.error}`)}</p>}
    </div>
  );
}
