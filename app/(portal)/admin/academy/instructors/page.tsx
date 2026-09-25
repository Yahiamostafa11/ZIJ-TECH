import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge, ButtonLink, EmptyState, PageHeader, Table, Td, Th } from "@/components/portal/ui";
import { listGroups, listInstructors } from "@/lib/academy/queries";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function InstructorsPage() {
  const user = await requirePermission("instructors.manage");
  const [t, instructors, groups] = await Promise.all([
    getTranslations(),
    listInstructors(),
    listGroups(user),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("nav.instructors")}
        description={t("instructors.description")}
        actions={can(user.grants, "users.manage") && <ButtonLink href="/admin/academy/users" variant="secondary">{t("instructors.addAccount")}</ButtonLink>}
      />
      {instructors.length === 0 ? (
        <EmptyState>{t("instructors.empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("fields.name")}</Th>
              <Th>{t("fields.email")}</Th>
              <Th>{t("instructors.currentGroups")}</Th>
            </tr>
          </thead>
          <tbody>
            {instructors.map((item) => {
              const own = groups.filter((group) => group.instructorId === item.id);
              return (
                <tr key={item.id}>
                  <Td>{item.name}</Td>
                  <Td>
                    <span dir="ltr" className="text-text-secondary">
                      {item.email}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {own.length === 0 ? (
                        <span className="text-text-secondary">—</span>
                      ) : (
                        own.map((group) => (
                          <Link key={group.id} href={`/admin/academy/groups/${group.id}`}>
                            <Badge tone="gold">{group.name}</Badge>
                          </Link>
                        ))
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
