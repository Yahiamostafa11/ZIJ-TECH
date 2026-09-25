import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Card, Field, inputClass } from "@/components/portal/ui";
import { saveGroup } from "@/lib/academy/actions/structure";
import { localized } from "@/lib/academy/format";
import { listBranches, listInstructors, listLevels } from "@/lib/academy/queries";
import { branchScope } from "@/lib/academy/scope";
import type { CurrentUser } from "@/lib/auth/session";
import type { classGroup, groupSlot } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";
import { GroupModeFields } from "./GroupModeFields";

const SLOT_ROWS = 3;
export const WEEKDAYS = [6, 0, 1, 2, 3, 4, 5]; // Saturday first, as the academy week runs.

type GroupFormProps = {
  viewer: CurrentUser;
  group?: typeof classGroup.$inferSelect;
  slots?: (typeof groupSlot.$inferSelect)[];
};

export async function GroupForm({ viewer, group, slots = [] }: GroupFormProps) {
  const [t, locale, branches, levels, instructors] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listBranches(true),
    listLevels(true),
    listInstructors(),
  ]);

  const scope = branchScope(viewer);
  const allowedBranches = branches.filter((item) => scope.all || scope.branchIds.includes(item.id));

  return (
    <ActionForm action={saveGroup} className="grid gap-6">
      {group && <input type="hidden" name="id" value={group.id} />}

      <Card title={t("groups.basics")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.name")} htmlFor="group-name" hint={t("groups.nameHint")}>
            <input id="group-name" name="name" defaultValue={group?.name} className={inputClass} />
            <FieldError name="name" />
          </Field>
          <Field label={t("fields.level")} htmlFor="group-level">
            <select id="group-level" name="levelId" defaultValue={group?.levelId ?? ""} className={inputClass}>
              <option value="" disabled>
                {t("common.choose")}
              </option>
              {levels.map((item) => (
                <option key={item.id} value={item.id}>
                  {localized(locale, item.programNameAr, item.programNameEn)} — {localized(locale, item.nameAr, item.nameEn)}
                </option>
              ))}
            </select>
            <FieldError name="levelId" />
          </Field>
          <GroupModeFields
            allowOnline={scope.all}
            branches={allowedBranches.map((item) => ({ id: item.id, name: localized(locale, item.nameAr, item.nameEn) }))}
            defaults={
              group && {
                mode: group.mode,
                branchId: group.branchId,
                capacityMin: group.capacityMin,
                capacityMax: group.capacityMax,
              }
            }
          />
          <Field label={t("fields.instructor")} htmlFor="group-instructor">
            <select id="group-instructor" name="instructorId" defaultValue={group?.instructorId ?? ""} className={inputClass}>
              <option value="">{t("groups.noInstructor")}</option>
              {instructors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <FieldError name="instructorId" />
          </Field>
          <Field label={t("groups.price")} htmlFor="group-price" hint={t("groups.priceHint")}>
            <input id="group-price" name="price" inputMode="decimal" defaultValue={group ? Number(group.price) : ""} dir="ltr" className={inputClass} />
            <FieldError name="price" />
          </Field>
          <Field label={t("fields.startDate")} htmlFor="group-startDate">
            <input id="group-startDate" name="startDate" type="date" defaultValue={group?.startDate ?? ""} className={inputClass} />
            <FieldError name="startDate" />
          </Field>
          <Field label={t("fields.status")} htmlFor="group-status">
            <select id="group-status" name="status" defaultValue={group?.status ?? "active"} className={inputClass}>
              {(["planned", "active", "completed", "cancelled"] as const).map((status) => (
                <option key={status} value={status}>
                  {t(`options.groupStatus.${status}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("groups.meetingUrl")} htmlFor="group-meetingUrl" hint={t("groups.meetingUrlHint")}>
            <input id="group-meetingUrl" name="meetingUrl" type="url" dir="ltr" defaultValue={group?.meetingUrl ?? ""} className={inputClass} />
            <FieldError name="meetingUrl" />
          </Field>
        </div>
      </Card>

      <Card title={t("groups.schedule")}>
        <div className="grid gap-3">
          {Array.from({ length: SLOT_ROWS }, (_, index) => {
            const slot = slots[index];
            return (
              <div key={index} className="grid gap-3 sm:grid-cols-3">
                <select name="slotWeekday[]" aria-label={t("groups.weekday")} defaultValue={slot?.weekday ?? ""} className={inputClass}>
                  <option value="">{index === 0 ? t("groups.pickDay") : t("groups.noSlot")}</option>
                  {WEEKDAYS.map((day) => (
                    <option key={day} value={day}>
                      {t(`options.weekday.${day}`)}
                    </option>
                  ))}
                </select>
                <input name="slotTime[]" type="time" aria-label={t("groups.startTime")} defaultValue={slot?.startTime.slice(0, 5) ?? ""} className={inputClass} />
                <select name="slotDuration[]" aria-label={t("groups.duration")} defaultValue={slot?.durationMinutes ?? 90} className={inputClass}>
                  {[60, 90, 120, 150, 180].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {t("groups.minutes", { minutes })}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <FieldError name="slots" />
        </div>
      </Card>

      <Card title={t("fields.notes")}>
        <textarea name="notes" rows={3} defaultValue={group?.notes ?? ""} className={inputClass} />
      </Card>

      <div className="flex items-center gap-4">
        <SubmitButton>{t("common.save")}</SubmitButton>
        <FormMessage />
      </div>
    </ActionForm>
  );
}
