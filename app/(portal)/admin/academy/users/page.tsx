import React from "react";
import { asc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { CreateUserForm, GrantRoleForm, ResetPasswordButton, RevokeRoleButton } from "@/components/portal/UserAdmin";
import { Badge, Card, PageHeader } from "@/components/portal/ui";
import { localized } from "@/lib/academy/format";
import { listBranches } from "@/lib/academy/queries";
import { grantRole } from "@/lib/auth/actions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLES, nameChangeRequest, user, userRole, type Role } from "@/lib/db/schema";
import { loginIdOf } from "@/lib/auth/accounts";
import { NameRequestActions } from "@/components/portal/NameRequestActions";
import type { Locale } from "@/lib/i18n/config";

export default async function UsersPage() {
  const actor = await requirePermission("users.manage");
  const [t, locale, users, grants, branches, nameRequests] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    db.select().from(user).orderBy(asc(user.name)),
    db.select().from(userRole),
    listBranches(true),
    db
      .select({ request: nameChangeRequest, currentAr: user.nameAr, currentName: user.name, currentEn: user.nameEn, username: user.username, email: user.email })
      .from(nameChangeRequest)
      .innerJoin(user, eq(user.id, nameChangeRequest.userId))
      .where(eq(nameChangeRequest.status, "pending"))
      .orderBy(asc(nameChangeRequest.createdAt)),
  ]);

  const isOwner = actor.grants.some((grant) => grant.role === "super_admin");
  // Student and parent accounts are created from the student's page, where they are linked to the record.
  const grantable: Role[] = (isOwner ? [...ROLES] : (["branch_admin", "moderator", "instructor"] as Role[])).filter(
    (role) => role !== "student" && role !== "parent",
  );
  const branchOptions = branches.map((item) => ({ id: item.id, name: localized(locale, item.nameAr, item.nameEn) }));
  const branchName = (id: number | null) => {
    const found = branches.find((item) => item.id === id);
    return found ? localized(locale, found.nameAr, found.nameEn) : "";
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("nav.users")} description={t("users.description")} />

      <div className="grid gap-6">
        {nameRequests.length > 0 && (
          <Card title={t("users.nameRequests", { count: nameRequests.length })}>
            <ul className="grid gap-4">
              {nameRequests.map(({ request, currentAr, currentName, currentEn, username, email }) => (
                <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 pb-4 last:border-0 last:pb-0">
                  <div className="text-sm">
                    <p className="text-xs text-text-secondary" dir="ltr">
                      {loginIdOf({ username, email })}
                    </p>
                    <p className="mt-1">
                      <span className="text-text-secondary line-through">
                        <bdi>{currentAr ?? currentName}</bdi>
                        {currentEn && <> · <bdi>{currentEn}</bdi></>}
                      </span>
                      {" → "}
                      <span className="font-semibold">
                        <bdi>{request.nameAr}</bdi>
                        {request.nameEn && <> · <bdi>{request.nameEn}</bdi></>}
                      </span>
                    </p>
                  </div>
                  <NameRequestActions requestId={request.id} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title={t("users.create")}>
          <CreateUserForm roles={grantable} branches={branchOptions} />
        </Card>

        {users.map((item) => {
          const roles = grants.filter((grant) => grant.userId === item.id);
          const manageable = roles.every((grant) => grantable.includes(grant.role));
          return (
            <Card
              key={item.id}
              title={
                <span className="flex flex-wrap items-baseline gap-2">
                  {item.name}
                  <span className="text-xs font-normal text-text-secondary" dir="ltr">
                    {loginIdOf(item)}
                  </span>
                </span>
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                {roles.length === 0 && <span className="text-sm text-text-secondary">{t("users.noRoles")}</span>}
                {roles.map((grant) => {
                  const label = `${t(`options.role.${grant.role}`)}${grant.branchId ? ` · ${branchName(grant.branchId)}` : ""}`;
                  return (
                    <Badge key={grant.id} tone={grant.role === "super_admin" ? "gold" : "neutral"}>
                      {label}
                      {manageable && !(grant.userId === actor.id && grant.role === "super_admin") && (
                        <RevokeRoleButton roleId={grant.id} label={label} />
                      )}
                    </Badge>
                  );
                })}
              </div>
              {manageable && item.id !== actor.id && (
                <div className="mt-4 grid gap-4 border-t border-border-subtle/60 pt-4 md:grid-cols-[1fr_auto]">
                  <GrantRoleForm action={grantRole.bind(null, item.id)} roles={grantable} branches={branchOptions} prefix={item.id} />
                  <ResetPasswordButton userId={item.id} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
