import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Trash2 } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Badge, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/portal/ui";
import { createAnnouncement, deleteAnnouncement } from "@/lib/academy/actions/content";
import { listAnnouncementsAdmin } from "@/lib/academy/content";
import { formatDateTime } from "@/lib/academy/format";
import { listInstructors } from "@/lib/academy/queries";
import { requirePermission } from "@/lib/auth/session";
import { ANNOUNCEMENT_KINDS } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export default async function AnnouncementsAdminPage() {
  await requirePermission("announcements.manage");
  const [t, locale, rows, instructors] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>, listAnnouncementsAdmin(), listInstructors()]);

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader title={t("nav.announcementsAdmin")} description={t("announcements.adminDescription")} />
      <Card title={t("announcements.newTitle")}>
        <ActionForm action={createAnnouncement} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
          <Field label={t("announcements.kind")} htmlFor="an-kind">
            <select id="an-kind" name="kind" defaultValue="notice" className={inputClass}>
              {ANNOUNCEMENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`announcements.kinds.${kind}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("announcements.titleField")} htmlFor="an-title">
            <input id="an-title" name="title" className={inputClass} />
            <FieldError name="title" />
          </Field>
          <Field label={t("announcements.body")} htmlFor="an-body" className="sm:col-span-2">
            <textarea id="an-body" name="body" rows={4} className={`${inputClass} resize-y`} />
          </Field>
          <Field label={t("announcements.link")} htmlFor="an-link" hint={t("announcements.linkHint")} className="sm:col-span-2">
            <input id="an-link" name="link" dir="ltr" placeholder="https://www.facebook.com/…" className={inputClass} />
            <FieldError name="link" />
          </Field>
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="mb-1 text-sm text-text-secondary">{t("announcements.audience")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="audience" value="all" defaultChecked className="accent-[rgb(var(--gold-primary))]" /> {t("announcements.toAll")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="audience" value="selected" className="accent-[rgb(var(--gold-primary))]" /> {t("announcements.toSelected")}
            </label>
            <div className="ms-6 flex flex-wrap gap-3">
              {instructors.map((item) => (
                <label key={item.id} className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <input type="checkbox" name="targets[]" value={item.id} className="accent-[rgb(var(--gold-primary))]" /> {item.name}
                </label>
              ))}
            </div>
            <FieldError name="targets" />
          </fieldset>
          <div className="flex items-center gap-4 sm:col-span-2">
            <SubmitButton>{t("announcements.send")}</SubmitButton>
            <FormMessage />
          </div>
        </ActionForm>
      </Card>

      {rows.length === 0 ? (
        <EmptyState>{t("announcements.none")}</EmptyState>
      ) : (
        <Card title={t("announcements.sent")}>
          <ul className="grid gap-3">
            {rows.map(({ announcement: item, reads, targets }) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle/50 pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{item.title}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDateTime(item.createdAt, locale)} · {item.toAll ? t("announcements.toAll") : t("announcements.toCount", { count: Number(targets) })}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <Badge tone="blue">{t(`announcements.kinds.${item.kind}`)}</Badge>
                  <Badge tone="green">{t("announcements.reads", { count: Number(reads) })}</Badge>
                  <form action={deleteAnnouncement.bind(null, item.id)}>
                    <button type="submit" aria-label={t("announcements.delete")} className="rounded p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger">
                      <Trash2 size={15} />
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
