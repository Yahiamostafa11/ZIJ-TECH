import React from "react";
import { getTranslations } from "next-intl/server";
import { ExternalLink, FileAudio, FileImage, FileText, FolderOpen, Link2, PlayCircle, Trash2 } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { inputClass } from "@/components/portal/ui";
import { addResource, removeResource, saveLesson } from "@/lib/academy/actions/content";
import type { getLevelLessons } from "@/lib/academy/content";
import { RESOURCE_KINDS } from "@/lib/db/teaching";
import { Pill } from "./Glass";

type Lessons = Awaited<ReturnType<typeof getLevelLessons>>;

export const RESOURCE_ICONS = {
  drive: FolderOpen,
  youtube: PlayCircle,
  file: FileText,
  image: FileImage,
  audio: FileAudio,
  link: Link2,
} as const;

/** The plan for every session of a level: title, notes and linked resources. */
export async function LessonsEditor({ levelId, sessionCount, lessons }: { levelId: number; sessionCount: number; lessons: Lessons }) {
  const t = await getTranslations("content");
  return (
    <ol className="grid gap-3">
      {Array.from({ length: sessionCount }, (_, index) => index + 1).map((number) => {
        const item = lessons.find((row) => row.number === number);
        const prefix = `l${number}`;
        return (
          <li key={number}>
            <details className="glass group overflow-hidden">
              <summary className="flex cursor-pointer items-center gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-primary/12 font-dmsans font-bold text-gold-light">{number}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{item?.title && item.title !== `#${number}` ? item.title : t("untitled")}</span>
                <Pill tone={item?.resources.length ? "green" : "neutral"}>{t("resourceCount", { count: item?.resources.length ?? 0 })}</Pill>
              </summary>
              <div className="grid gap-5 border-t border-border-subtle/60 p-4 md:grid-cols-2">
                <ActionForm action={saveLesson.bind(null, levelId, number)} className="grid content-start gap-3">
                  <label className="grid gap-1.5 text-sm text-text-secondary" htmlFor={`${prefix}-title`}>
                    {t("title")}
                    <input id={`${prefix}-title`} name="title" defaultValue={item && item.title !== `#${number}` ? item.title : ""} className={inputClass} />
                  </label>
                  <FieldError name="title" />
                  <label className="grid gap-1.5 text-sm text-text-secondary" htmlFor={`${prefix}-summary`}>
                    {t("summary")}
                    <textarea id={`${prefix}-summary`} name="summary" rows={4} defaultValue={item?.summary ?? ""} placeholder={t("summaryPlaceholder")} className={`${inputClass} resize-y`} />
                  </label>
                  <div className="flex items-center gap-3">
                    <SubmitButton variant="secondary">{t("save")}</SubmitButton>
                    <FormMessage />
                  </div>
                </ActionForm>

                <div className="grid content-start gap-3">
                  {item?.resources.length ? (
                    <ul className="grid gap-2">
                      {item.resources.map((resource) => {
                        const Icon = RESOURCE_ICONS[resource.kind];
                        return (
                          <li key={resource.id} className="glass-inset flex items-center gap-2 px-3 py-2 text-sm">
                            <Icon size={16} className="shrink-0 text-gold-light" />
                            <a href={resource.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-gold-light">
                              {resource.title}
                            </a>
                            {resource.teacherOnly && <Pill tone="amber">{t("teacherOnly")}</Pill>}
                            <ExternalLink size={14} className="shrink-0 text-text-secondary" />
                            <form action={removeResource.bind(null, resource.id)}>
                              <button type="submit" aria-label={t("remove")} className="rounded p-1 text-text-secondary hover:bg-danger/10 hover:text-danger">
                                <Trash2 size={14} />
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-secondary">{t("noResources")}</p>
                  )}
                  <ActionForm action={addResource.bind(null, levelId, number)} resetOnSuccess className="grid gap-2 sm:grid-cols-[auto_1fr]">
                    <select name="kind" aria-label={t("kind")} defaultValue="drive" className={inputClass}>
                      {RESOURCE_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {t(`kinds.${kind}`)}
                        </option>
                      ))}
                    </select>
                    <input name="title" aria-label={t("resourceTitle")} placeholder={t("resourceTitle")} className={inputClass} />
                    <input name="url" aria-label={t("url")} placeholder="https://drive.google.com/…" dir="ltr" className={`${inputClass} sm:col-span-2`} />
                    <div className="sm:col-span-2">
                      <FieldError name="title" />
                      <FieldError name="url" />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-text-secondary sm:col-span-2">
                      <input type="checkbox" name="teacherOnly" className="accent-[rgb(var(--gold-primary))]" /> {t("teacherOnlyHint")}
                    </label>
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <SubmitButton variant="secondary">{t("addResource")}</SubmitButton>
                      <FormMessage />
                    </div>
                  </ActionForm>
                </div>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
