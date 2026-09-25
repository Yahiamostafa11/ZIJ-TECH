"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, XCircle } from "lucide-react";
import { analyzeImport, type ImportResponse, type SheetSummary } from "@/lib/academy/actions/import";
import type { NewGroupSpec, SheetResult } from "@/lib/academy/import/run";
import { Badge, Card, Field, Table, Td, Th, buttonClass, inputClass } from "@/components/portal/ui";

type Option = { id: number; label: string };
type Target = { kind: "skip" } | { kind: "existing"; groupId: number } | { kind: "create"; spec: NewGroupSpec };

type ImportWizardProps = {
  groups: Option[];
  levels: Option[];
  branches: Option[];
  instructors: { id: string; label: string }[];
  preselectedGroup: number | null;
  /** The user may create groups; online only when not limited to a branch. */
  canCreateGroups: boolean;
  allowOnline: boolean;
};

export function ImportWizard(props: ImportWizardProps) {
  const { groups, preselectedGroup, canCreateGroups } = props;
  const t = useTranslations("importer");
  const tOptions = useTranslations("options");
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [sheets, setSheets] = useState<SheetSummary[] | null>(null);
  const [targets, setTargets] = useState<Record<string, Target>>({});
  const [isPending, startTransition] = useTransition();

  const newGroupFor = (sheet: SheetSummary): NewGroupSpec => {
    const mode = sheet.looksOnline && props.allowOnline ? "online" : "offline";
    return {
      name: sheet.name.slice(0, 120),
      levelId: guessLevel(sheet.name, props.levels),
      mode,
      branchId: mode === "online" ? null : (props.branches[0]?.id ?? null),
      instructorId: null,
      price: sheet.suggestedPrice ?? 0,
    };
  };

  const send = (options: { withMapping: boolean; commit?: boolean }, target: File | null = file) => {
    if (!target) return;
    const data = new FormData();
    data.set("file", target);
    if (preselectedGroup) data.set("group", String(preselectedGroup));
    if (options.withMapping) {
      const mapping: Record<string, { groupId: number } | { create: NewGroupSpec }> = {};
      for (const [sheet, value] of Object.entries(targets)) {
        if (value.kind === "existing") mapping[sheet] = { groupId: value.groupId };
        else if (value.kind === "create") mapping[sheet] = { create: value.spec };
      }
      data.set("mapping", JSON.stringify(mapping));
    }
    if (options.commit) data.set("commit", "1");

    startTransition(async () => {
      try {
        const result = await analyzeImport(data);
        setResponse(result);
        if ("stage" in result && result.stage === "sheets") {
          setSheets(result.sheets);
          setTargets(
            Object.fromEntries(
              result.sheets.map((sheet) => {
                const groupId = result.suggested[sheet.name];
                return [sheet.name, groupId ? { kind: "existing", groupId } : { kind: "skip" }];
              }),
            ),
          );
        }
      } catch {
        setResponse({ error: "failed" });
      }
    });
  };

  const updateTarget = (sheet: string, next: Target) => {
    // A changed mapping invalidates the previous preview.
    setResponse(null);
    setTargets((current) => ({ ...current, [sheet]: next }));
  };

  const error = response && "error" in response ? response.error : null;
  const results = response && "stage" in response && response.stage !== "sheets" ? response : null;
  const mappedCount = Object.values(targets).filter((target) => target.kind !== "skip").length;
  const incomplete = Object.values(targets).some(
    (target) => target.kind === "create" && (!target.spec.levelId || !target.spec.name.trim() || (target.spec.mode === "offline" && !target.spec.branchId)),
  );

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
        {error && <p className="mt-3 text-sm text-danger">{t(`errors.${error}`)}</p>}
      </Card>

      {sheets && results?.stage !== "done" && (
        <Card title={t("step2")}>
          <p className="mb-4 text-sm text-text-secondary">{t("mappingHint")}</p>
          <div className="grid gap-3">
            {sheets.map((sheet) => {
              const target = targets[sheet.name] ?? { kind: "skip" };
              const selectValue =
                target.kind === "existing" ? String(target.groupId) : target.kind === "create" ? "new" : "";
              return (
                <div key={sheet.name} className="rounded-md border border-border-subtle/70 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_300px] sm:items-center">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary">
                        <bdi>{sheet.name}</bdi>
                      </p>
                      {sheet.headerFound ? (
                        <p className="text-xs text-text-secondary">
                          {t("sheetStats", { rows: sheet.rowCount, errors: sheet.errorCount, warnings: sheet.warningCount })}
                          {sheet.ignoredHeaders.length > 0 &&
                            ` · ${t("ignoredColumns", { columns: sheet.ignoredHeaders.join("، ") })}`}
                        </p>
                      ) : (
                        <p className="text-xs text-warning">{t("noHeader")}</p>
                      )}
                    </div>
                    <select
                      value={selectValue}
                      disabled={!sheet.headerFound || isPending}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateTarget(
                          sheet.name,
                          value === ""
                            ? { kind: "skip" }
                            : value === "new"
                              ? { kind: "create", spec: newGroupFor(sheet) }
                              : { kind: "existing", groupId: Number(value) },
                        );
                      }}
                      aria-label={t("groupFor", { sheet: sheet.name })}
                      className={inputClass}
                    >
                      <option value="">{t("skipSheet")}</option>
                      {canCreateGroups && props.levels.length > 0 && <option value="new">{t("createGroup")}</option>}
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {target.kind === "create" && (
                    <NewGroupFields
                      sheet={sheet.name}
                      spec={target.spec}
                      onChange={(spec) => updateTarget(sheet.name, { kind: "create", spec })}
                      {...props}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isPending || mappedCount === 0 || incomplete}
              onClick={() => send({ withMapping: true })}
              className={buttonClass("secondary")}
            >
              {t("check")}
            </button>
            {canCreateGroups && props.levels.length === 0 && (
              <Link href="/admin/academy/levels" className="text-sm text-gold-light hover:underline">
                {t("createLevelFirst")}
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

const simplify = (text: string) =>
  text.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").trim();

/**
 * Pre-selects a level only when the tab name mentions exactly one program and
 * that program has a single level; otherwise staff must choose (0 = unset).
 */
function guessLevel(sheetName: string, levels: Option[]) {
  const name = simplify(sheetName);
  const matches = levels.filter((item) => {
    const program = simplify(item.label.split(" — ")[0] ?? "");
    return program.length > 1 && name.includes(program);
  });
  return matches.length === 1 ? matches[0].id : 0;
}

function NewGroupFields({
  sheet,
  spec,
  onChange,
  levels,
  branches,
  instructors,
  allowOnline,
}: {
  sheet: string;
  spec: NewGroupSpec;
  onChange: (spec: NewGroupSpec) => void;
} & ImportWizardProps) {
  const t = useTranslations();
  const id = (field: string) => `new-${field}-${sheet}`;

  return (
    <div className="mt-3 grid gap-3 border-t border-border-subtle/60 pt-3 sm:grid-cols-3">
      <Field label={t("fields.name")} htmlFor={id("name")}>
        <input
          id={id("name")}
          value={spec.name}
          maxLength={120}
          onChange={(event) => onChange({ ...spec, name: event.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label={t("fields.level")} htmlFor={id("level")}>
        <select id={id("level")} value={spec.levelId || ""} onChange={(event) => onChange({ ...spec, levelId: Number(event.target.value) })} className={inputClass}>
          <option value="" disabled>
            {t("common.choose")}
          </option>
          {levels.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("fields.mode")} htmlFor={id("mode")}>
        <select
          id={id("mode")}
          value={spec.mode}
          onChange={(event) => {
            const mode = event.target.value as NewGroupSpec["mode"];
            onChange({ ...spec, mode, branchId: mode === "online" ? null : (spec.branchId ?? branches[0]?.id ?? null) });
          }}
          className={inputClass}
        >
          <option value="offline">{t("options.mode.offline")}</option>
          {allowOnline && <option value="online">{t("options.mode.online")}</option>}
        </select>
      </Field>
      {spec.mode === "offline" && (
        <Field label={t("fields.branch")} htmlFor={id("branch")}>
          <select id={id("branch")} value={spec.branchId ?? ""} onChange={(event) => onChange({ ...spec, branchId: Number(event.target.value) || null })} className={inputClass}>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={t("fields.instructor")} htmlFor={id("instructor")}>
        <select id={id("instructor")} value={spec.instructorId ?? ""} onChange={(event) => onChange({ ...spec, instructorId: event.target.value || null })} className={inputClass}>
          <option value="">{t("groups.noInstructor")}</option>
          {instructors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("groups.price")} htmlFor={id("price")} hint={t("importer.priceFromSheet")}>
        <input
          id={id("price")}
          inputMode="decimal"
          dir="ltr"
          value={spec.price || ""}
          onChange={(event) => onChange({ ...spec, price: Number(event.target.value.replace(/[^\d.]/g, "")) || 0 })}
          className={inputClass}
        />
      </Field>
      <p className="text-xs text-text-secondary sm:col-span-3">{t("importer.newGroupHint")}</p>
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
        {sheet.groupCreated && (
          <span className="ms-2">
            <Badge tone="blue">{t("groupCreated")}</Badge>
          </span>
        )}
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
                    <XCircle size={15} className="text-danger" />
                  ) : row.warnings.length ? (
                    <AlertTriangle size={15} className="text-warning" />
                  ) : (
                    <CheckCircle2 size={15} className="text-success" />
                  )}
                  {tOptions(`importStatus.${row.status}`)}
                  {row.paymentAdded ? ` · ${t("paymentAdded", { amount: row.paymentAdded })}` : ""}
                </span>
              </Td>
              <Td>
                <ul className="grid gap-0.5 text-xs">
                  {row.errors.map((issue, index) => (
                    <li key={`e${index}`} className="text-danger">
                      {t(`issues.${issue.code}`, { value: issue.value ?? "" })}
                    </li>
                  ))}
                  {row.warnings.map((issue, index) => (
                    <li key={`w${index}`} className="text-warning">
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
