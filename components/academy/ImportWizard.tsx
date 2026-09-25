"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, XCircle } from "lucide-react";
import { analyzeImport, type ImportResponse } from "@/lib/academy/actions/import";
import type { SheetResult } from "@/lib/academy/import/run";
import { Badge, Card, Table, Td, Th, buttonClass, inputClass } from "@/components/portal/ui";

type GroupOption = { id: number; label: string };

export function ImportWizard({ groups, preselectedGroup }: { groups: GroupOption[]; preselectedGroup: number | null }) {
  const t = useTranslations("importer");
  const tOptions = useTranslations("options");
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [sheets, setSheets] = useState<Extract<ImportResponse, { stage: "sheets" }> | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [isPending, startTransition] = useTransition();

  const send = (options: { withMapping: boolean; commit?: boolean }, target: File | null = file) => {
    if (!target) return;
    const data = new FormData();
    data.set("file", target);
    if (preselectedGroup) data.set("group", String(preselectedGroup));
    if (options.withMapping) data.set("mapping", JSON.stringify(mapping));
    if (options.commit) data.set("commit", "1");

    startTransition(async () => {
      try {
        const result = await analyzeImport(data);
        setResponse(result);
        if ("stage" in result && result.stage === "sheets") {
          setSheets(result);
          setMapping(result.suggested);
        }
      } catch {
        setResponse({ error: "failed" });
      }
    });
  };

  const error = response && "error" in response ? response.error : null;
  const results = response && "stage" in response && response.stage !== "sheets" ? response : null;
  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="grid gap-6">
      <Card title={t("step1")}>
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed border-border-subtle px-6 py-8 text-center transition hover:border-gold-primary/60">
          <FileSpreadsheet className="text-gold-primary" size={32} strokeWidth={1.4} />
          <span className="text-sm text-text-primary">{file ? file.name : t("chooseFile")}</span>
          <span className="text-xs text-text-secondary">{t("fileHint")}</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              setSheets(null);
              setResponse(null);
              if (next) send({ withMapping: false }, next);
            }}
          />
        </label>
        {isPending && <p className="mt-3 text-sm text-text-secondary">{t("working")}</p>}
        {error && <p className="mt-3 text-sm text-red-300">{t(`errors.${error}`)}</p>}
      </Card>

      {sheets && results?.stage !== "done" && (
        <Card title={t("step2")}>
          <p className="mb-4 text-sm text-text-secondary">{t("mappingHint")}</p>
          <div className="grid gap-3">
            {sheets.sheets.map((sheet) => (
              <div key={sheet.name} className="grid gap-2 rounded-md border border-border-subtle/70 p-3 sm:grid-cols-[1fr_280px] sm:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{sheet.name}</p>
                  {sheet.headerFound ? (
                    <p className="text-xs text-text-secondary">
                      {t("sheetStats", { rows: sheet.rowCount, errors: sheet.errorCount, warnings: sheet.warningCount })}
                      {sheet.ignoredHeaders.length > 0 && ` · ${t("ignoredColumns", { columns: sheet.ignoredHeaders.join("، ") })}`}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-300">{t("noHeader")}</p>
                  )}
                </div>
                <select
                  value={mapping[sheet.name] ?? ""}
                  disabled={!sheet.headerFound || isPending}
                  onChange={(event) => {
                    // A changed mapping invalidates the previous preview.
                    setResponse(null);
                    setMapping((current) => ({ ...current, [sheet.name]: Number(event.target.value) || null }));
                  }}
                  aria-label={t("groupFor", { sheet: sheet.name })}
                  className={inputClass}
                >
                  <option value="">{t("skipSheet")}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isPending || mappedCount === 0}
              onClick={() => send({ withMapping: true })}
              className={buttonClass("secondary")}
            >
              {t("check")}
            </button>
            {groups.length === 0 && (
              <Link href="/admin/academy/groups/new" className="text-sm text-gold-light hover:underline">
                {t("createGroupFirst")}
              </Link>
            )}
          </div>
        </Card>
      )}

      {results && (
        <Card title={results.stage === "done" ? t("doneTitle") : t("step3")}>
          {results.stage === "preview" && <p className="mb-4 text-sm text-text-secondary">{t("previewHint")}</p>}
          <div className="grid gap-6">
            {results.results.map((sheet) => (
              <SheetReport key={sheet.sheet} sheet={sheet} t={t} tOptions={tOptions} />
            ))}
          </div>
          {results.stage === "preview" ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={isPending} onClick={() => send({ withMapping: true, commit: true })} className={buttonClass("primary")}>
                {t("commit")}
              </button>
              <button type="button" disabled={isPending} onClick={() => send({ withMapping: true })} className={buttonClass("ghost")}>
                {t("recheck")}
              </button>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              {results.results.map((sheet) => (
                <Link key={sheet.groupId} href={`/admin/academy/groups/${sheet.groupId}`} className={buttonClass("secondary")}>
                  {t("openGroup", { group: sheet.groupName })}
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SheetReport({
  sheet,
  t,
  tOptions,
}: {
  sheet: SheetResult;
  t: ReturnType<typeof useTranslations<"importer">>;
  tOptions: ReturnType<typeof useTranslations<"options">>;
}) {
  const totals = sheet.totals;
  return (
    <div>
      <p className="mb-2 font-semibold text-text-primary">
        <bdi>{sheet.sheet}</bdi> → <bdi className="text-gold-light">{sheet.groupName}</bdi>
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone="green">{t("totals.students", { count: totals.studentsCreated })}</Badge>
        <Badge tone="green">{t("totals.families", { count: totals.familiesCreated })}</Badge>
        <Badge tone="gold">{t("totals.enrollments", { count: totals.enrollmentsCreated })}</Badge>
        <Badge tone="gold">{t("totals.payments", { count: totals.paymentsCreated, amount: totals.paymentsAmount })}</Badge>
        {totals.skipped > 0 && <Badge tone="red">{t("totals.skipped", { count: totals.skipped })}</Badge>}
      </div>
      <Table>
        <thead>
          <tr>
            <Th>{t("row")}</Th>
            <Th>{t("student")}</Th>
            <Th>{t("result")}</Th>
            <Th>{t("notes")}</Th>
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row) => (
            <tr key={row.rowNumber}>
              <Td className="text-text-secondary">{row.rowNumber}</Td>
              <Td>{row.nameAr}</Td>
              <Td>
                <span className="inline-flex items-center gap-1.5">
                  {row.status === "skipped" ? (
                    <XCircle size={15} className="text-red-300" />
                  ) : row.warnings.length ? (
                    <AlertTriangle size={15} className="text-amber-300" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-300" />
                  )}
                  {tOptions(`importStatus.${row.status}`)}
                  {row.paymentAdded ? ` · ${t("paymentAdded", { amount: row.paymentAdded })}` : ""}
                </span>
              </Td>
              <Td>
                <ul className="grid gap-0.5 text-xs">
                  {row.errors.map((issue, index) => (
                    <li key={`e${index}`} className="text-red-300">
                      {t(`issues.${issue.code}`, { value: issue.value ?? "" })}
                    </li>
                  ))}
                  {row.warnings.map((issue, index) => (
                    <li key={`w${index}`} className="text-amber-300">
                      {t(`issues.${issue.code}`, { value: issue.value ?? "" })}
                    </li>
                  ))}
                </ul>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
