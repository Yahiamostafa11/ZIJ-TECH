import React from "react";
import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { Pill } from "./Glass";

type Row = {
  studentId: number;
  name: string;
  phones: { relation: string; whatsapp: string }[];
  links?: { parentUrl: string; studentUrl: string; parentDone: boolean; studentDone: boolean };
};

/**
 * After a session: one WhatsApp message per guardian with the parent's and
 * the student's feedback links, sent from the instructor's own phone.
 */
export async function FeedbackLinks({ rows, instructor, session }: { rows: Row[]; instructor: string; session: string }) {
  const t = await getTranslations("teaching.feedback");
  const withLinks = rows.filter((row) => row.links);
  if (withLinks.length === 0) return null;
  const answered = withLinks.filter((row) => row.links!.parentDone).length;

  return (
    <section className="glass grid gap-4 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-text-primary">{t("title")}</h2>
        <Pill tone="green">{t("answered", { done: answered, total: withLinks.length })}</Pill>
      </div>
      <p className="text-xs leading-6 text-text-secondary">{t("hint")}</p>
      <ul className="grid gap-2">
        {withLinks.map((row) => {
          const links = row.links!;
          const message = t("message", { instructor, name: row.name.split(" ")[0], session, parentUrl: links.parentUrl, studentUrl: links.studentUrl });
          return (
            <li key={row.studentId} className="glass-inset flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <bdi className="font-semibold">{row.name}</bdi>
                {links.parentDone && <Pill tone="green">{t("parentDone")}</Pill>}
                {links.studentDone && <Pill tone="online">{t("studentDone")}</Pill>}
              </span>
              <span className="flex flex-wrap gap-2">
                {row.phones.map((phone) => (
                  <a
                    key={phone.whatsapp}
                    href={`https://wa.me/${phone.whatsapp}?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success hover:bg-success/25"
                  >
                    <MessageCircle size={14} /> {t(`to.${phone.relation}`)}
                  </a>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
