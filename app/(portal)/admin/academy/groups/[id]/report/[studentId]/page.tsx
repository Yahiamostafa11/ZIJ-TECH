import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { PrintButton } from "@/components/teaching/PrintButton";
import { StudentReport } from "@/components/teaching/StudentReport";
import { getStudentReport } from "@/lib/academy/feedback";
import { requireGroup, requireStudentAccess } from "@/lib/academy/scope";
import { requirePermission } from "@/lib/auth/session";

export default async function AdminStudentReportPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const user = await requirePermission("groups.read");
  const { id, studentId } = await params;
  const groupId = Number(id);
  const sid = Number(studentId);
  if (!Number.isInteger(groupId) || !Number.isInteger(sid)) notFound();
  const group = await requireGroup(user, groupId, "groups.read");
  await requireStudentAccess(user, sid);
  const [t, report] = await Promise.all([getTranslations("report"), getStudentReport(group.id, sid)]);
  if (!report) notFound();

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/academy/groups/${group.id}`} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-gold-light">
          <ArrowRight size={16} className="ltr:rotate-180" /> <bdi>{group.name}</bdi>
        </Link>
        <PrintButton label={t("print")} />
      </div>
      <StudentReport report={report} groupName={group.name} />
    </div>
  );
}
