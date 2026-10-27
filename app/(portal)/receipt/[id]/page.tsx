import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/teaching/PrintButton";
import { formatDate, formatMoney, formatMonth } from "@/lib/academy/format";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { payrollPayment } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export const metadata = { title: "ZIJ Receipt" };

/** A transfer receipt, laid out for A4 so the browser can save it as PDF. */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [payment] = await db.select().from(payrollPayment).where(eq(payrollPayment.id, id));
  if (!payment) notFound();
  const isAdmin = can(viewer.grants, "payroll.manage");
  if (!isAdmin && payment.instructorId !== viewer.id) redirect("/forbidden");

  const [[instructor], [issuer], t, tAll, locale] = await Promise.all([
    db.select({ name: user.name, nameAr: user.nameAr, nameEn: user.nameEn }).from(user).where(eq(user.id, payment.instructorId)),
    payment.createdBy ? db.select({ name: user.name }).from(user).where(eq(user.id, payment.createdBy)) : Promise.resolve([undefined]),
    getTranslations("payroll"),
    getTranslations(),
    getLocale() as Promise<Locale>,
  ]);
  const money = (value: number | string) => formatMoney(value, locale);
  const net = Number(payment.sessionsAmount) + Number(payment.bonuses) - Number(payment.deductions);
  const remainingAfter = net - Number(payment.paidBefore) - Number(payment.amount);
  const rows: [string, string][] = [
    [t("sessionsAmount"), money(payment.sessionsAmount)],
    [t("bonuses"), `+ ${money(payment.bonuses)}`],
    [t("deductions"), `− ${money(payment.deductions)}`],
    [t("net"), money(net)],
    [t("paidBefore"), money(payment.paidBefore)],
  ];

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={isAdmin ? `/admin/academy/payroll/${payment.instructorId}?month=${payment.month}` : `/instructor/payroll?month=${payment.month}`} className="text-sm text-text-secondary hover:text-gold-light">
          ← {t("back")}
        </Link>
        <PrintButton label={t("downloadPdf")} />
      </div>

      <article className="receipt mx-auto max-w-[210mm] rounded-2xl border border-border-subtle bg-white p-10 text-[#0e444a] shadow-card print:rounded-none print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[#c8923c] pb-6">
          <div>
            <p className="font-cinzel text-4xl font-bold text-[#b08438]" dir="ltr">
              ZIJ.
            </p>
            <p className="text-sm text-[#5c6d6c]">{t("academy")}</p>
          </div>
          <div className="text-end">
            <h1 className="text-2xl font-extrabold">{t("receiptTitle")}</h1>
            <p className="mt-1 font-dmsans text-sm" dir="ltr">
              No. ZIJ-PAY-{String(payment.id).padStart(5, "0")}
            </p>
            {payment.voidedAt && <p className="mt-2 rounded bg-red-100 px-2 py-1 text-sm font-bold text-red-700">{t("voided")}</p>}
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 py-6 text-sm">
          <div>
            <dt className="text-[#5c6d6c]">{t("paidTo")}</dt>
            <dd className="text-base font-bold">{(locale === "ar" ? instructor?.nameAr : instructor?.nameEn) || instructor?.name}</dd>
          </div>
          <div>
            <dt className="text-[#5c6d6c]">{t("forMonth")}</dt>
            <dd className="text-base font-bold">{formatMonth(payment.month, locale, "long")}</dd>
          </div>
          <div>
            <dt className="text-[#5c6d6c]">{t("paidOn")}</dt>
            <dd className="font-semibold">{formatDate(payment.paidOn, locale)}</dd>
          </div>
          <div>
            <dt className="text-[#5c6d6c]">{t("method")}</dt>
            <dd className="font-semibold">
              {tAll(`options.method.${payment.method}`)}
              {payment.reference && (
                <>
                  {" · "}
                  <bdi className="font-dmsans text-[#5c6d6c]">{payment.reference}</bdi>
                </>
              )}
            </dd>
          </div>
        </dl>

        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-[#e8dcc4]">
                <td className="py-2.5">{label}</td>
                <td className="py-2.5 text-end font-dmsans tabular-nums">{value}</td>
              </tr>
            ))}
            <tr className="bg-[#fbf5e9]">
              <td className="px-3 py-4 text-lg font-extrabold">{t("thisTransfer")}</td>
              <td className="px-3 py-4 text-end font-dmsans text-2xl font-extrabold tabular-nums text-[#b08438]">{money(payment.amount)}</td>
            </tr>
            <tr>
              <td className="py-2.5 text-[#5c6d6c]">{t("remainingAfter")}</td>
              <td className="py-2.5 text-end font-dmsans tabular-nums text-[#5c6d6c]">{money(Math.max(remainingAfter, 0))}</td>
            </tr>
          </tbody>
        </table>

        {payment.notes && <p className="mt-6 text-sm text-[#5c6d6c]">{payment.notes}</p>}

        <footer className="mt-12 flex items-end justify-between gap-6 text-xs text-[#5c6d6c]">
          <div>
            <p>{t("issuedBy", { name: issuer?.name ?? "—" })}</p>
            <p className="mt-1">zijtech.com</p>
          </div>
          <div className="w-48 border-t border-[#0e444a] pt-2 text-center">{t("signature")}</div>
        </footer>
      </article>
    </div>
  );
}
