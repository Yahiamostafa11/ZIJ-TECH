import React from "react";
import { desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/portal/ui";
import { formatDateTime } from "@/lib/academy/format";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLog, user } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

export default async function AuditPage() {
  await requirePermission("audit.read");
  const [t, locale, rows] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        details: auditLog.details,
        createdAt: auditLog.createdAt,
        actorName: user.name,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorId))
      .orderBy(desc(auditLog.id))
      .limit(300),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("nav.audit")} description={t("audit.description")} />
      {rows.length === 0 ? (
        <EmptyState>{t("audit.empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("audit.when")}</Th>
              <Th>{t("audit.who")}</Th>
              <Th>{t("audit.action")}</Th>
              <Th>{t("audit.details")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td className="whitespace-nowrap text-text-secondary">{formatDateTime(row.createdAt, locale)}</Td>
                <Td>{row.actorName ?? t("audit.system")}</Td>
                <Td>
                  <code className="text-xs text-gold-light" dir="ltr">
                    {row.action}
                  </code>
                  <span className="ms-2 text-xs text-text-secondary" dir="ltr">
                    {row.entity}#{row.entityId}
                  </span>
                </Td>
                <Td>
                  <code className="line-clamp-2 max-w-md break-all text-xs text-text-secondary" dir="ltr">
                    {row.details}
                  </code>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
