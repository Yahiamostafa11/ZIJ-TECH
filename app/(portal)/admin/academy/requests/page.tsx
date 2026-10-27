import React from "react";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/portal/ui";
import { reviewStudentRequest } from "@/lib/academy/actions/teaching";
import { formatDate, formatDateTime } from "@/lib/academy/format";
import { groupScopeCondition } from "@/lib/academy/scope";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { classGroup } from "@/lib/db/academy";
import { user } from "@/lib/db/schema";
import { studentRequest } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export default async function StudentRequestsPage() {
  const viewer = await requirePermission("students.write");
  const scope = groupScopeCondition(viewer);
  const select = () =>
    db
      .select({ request: studentRequest, groupName: classGroup.name, groupId: classGroup.id, instructorName: user.name })
      .from(studentRequest)
      .innerJoin(classGroup, eq(classGroup.id, studentRequest.groupId))
      .leftJoin(user, eq(user.id, studentRequest.requestedBy));

  const [t, locale, pending, reviewed] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    select().where(and(eq(studentRequest.status, "pending"), scope)).orderBy(desc(studentRequest.createdAt)),
    select()
      .where(and(inArray(studentRequest.status, ["approved", "rejected"]), scope))
      .orderBy(desc(studentRequest.reviewedAt))
      .limit(20),
  ]);

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader title={t("nav.studentRequests")} description={t("teaching.requests.description")} />

      {pending.length === 0 ? (
        <EmptyState>{t("teaching.requests.none")}</EmptyState>
      ) : (
        pending.map(({ request, groupName, groupId, instructorName }) => (
          <Card
            key={request.id}
            title={<bdi>{request.nameAr}</bdi>}
            actions={
              <Link href={`/admin/academy/groups/${groupId}`}>
                <Badge tone="gold">{groupName}</Badge>
              </Link>
            }
          >
            <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-text-secondary">{t("teaching.requests.requestedBy")}</dt>
                <dd>{instructorName ?? "—"} · {formatDateTime(request.createdAt, locale)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">{t("fields.birthDate")}</dt>
                <dd>{formatDate(request.birthDate, locale)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">{t("fields.phones")}</dt>
                <dd dir="ltr" className="text-start">
                  {[request.motherPhone, request.fatherPhone].filter(Boolean).join(" · ")}
                </dd>
              </div>
              {request.nameEn && (
                <div>
                  <dt className="text-xs text-text-secondary">{t("fields.nameEn")}</dt>
                  <dd>{request.nameEn}</dd>
                </div>
              )}
              {request.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-text-secondary">{t("fields.notes")}</dt>
                  <dd>{request.notes}</dd>
                </div>
              )}
            </dl>
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionForm action={reviewStudentRequest.bind(null, request.id, "approved")} className="grid gap-2">
                <input name="note" type="hidden" value="" />
                <SubmitButton>{t("teaching.requests.approve")}</SubmitButton>
                <FormMessage />
              </ActionForm>
              <ActionForm action={reviewStudentRequest.bind(null, request.id, "rejected")} className="grid gap-2">
                <input name="note" aria-label={t("teaching.requests.rejectReason")} placeholder={t("teaching.requests.rejectReason")} className={inputClass} />
                <FieldError name="note" />
                <SubmitButton variant="danger">{t("teaching.requests.reject")}</SubmitButton>
                <FormMessage />
              </ActionForm>
            </div>
          </Card>
        ))
      )}

      {reviewed.length > 0 && (
        <Card title={t("teaching.requests.recent")}>
          <ul className="grid gap-2 text-sm">
            {reviewed.map(({ request, groupName, instructorName }) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <bdi className="font-semibold">{request.nameAr}</bdi> · {groupName} · {instructorName ?? "—"}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-secondary">
                  {formatDateTime(request.reviewedAt, locale)}
                  <Badge tone={request.status === "approved" ? "green" : "red"}>{t(`teaching.request.status.${request.status}`)}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
