import React from "react";
import { getTranslations } from "next-intl/server";
import { AnnouncementCard } from "@/components/teaching/AnnouncementCard";
import { GlassCard } from "@/components/teaching/Glass";
import { listAnnouncementsFor, markAnnouncementsRead } from "@/lib/academy/content";
import { requirePermission } from "@/lib/auth/session";

export default async function InstructorAnnouncementsPage() {
  const user = await requirePermission("portal.instructor");
  const [t, rows] = await Promise.all([getTranslations("announcements"), listAnnouncementsFor(user.id)]);
  // Opening the page marks everything shown as read; this view still highlights what was new.
  await markAnnouncementsRead(user.id, rows.filter((row) => !row.readAt).map((row) => row.announcement.id));

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("description")}</p>
      </div>
      {rows.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-text-secondary">{t("none")}</p>
        </GlassCard>
      ) : (
        rows.map((row) => <AnnouncementCard key={row.announcement.id} item={row.announcement} unread={!row.readAt} />)
      )}
    </div>
  );
}
