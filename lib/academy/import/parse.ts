import "server-only";
import ExcelJS from "exceljs";
import { cleanName, nameKey, normalizePhone, parseAmount } from "../normalize";

export const IMPORT_FIELDS = [
  "name",
  "age",
  "motherPhone",
  "fatherPhone",
  "price",
  "paid",
  "remaining",
  "paidOn",
  "notes",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Header spellings seen in the academy's sheets, compared after normalisation. */
const HEADER_ALIASES: Record<ImportField, string[]> = {
  name: ["اسم الطالب", "اسم الطالبه", "الاسم", "اسم", "الطالب", "name", "student", "student name"],
  age: ["السن", "العمر", "age"],
  motherPhone: ["رقم الام", "تليفون الام", "موبايل الام", "هاتف الام", "الام", "mother", "mother phone"],
  fatherPhone: ["رقم الاب", "تليفون الاب", "موبايل الاب", "هاتف الاب", "الاب", "father", "father phone"],
  price: ["الاشتراك", "قيمه الاشتراك", "السعر", "المطلوب", "price", "fee", "subscription"],
  paid: ["المدفوع", "مدفوع", "paid"],
  remaining: ["المتبقي", "الباقي", "المتبقى", "remaining", "balance"],
  paidOn: ["تاريخ الدفع", "تاريخ", "payment date", "date"],
  notes: ["ملاحظات", "ملاحظه", "notes", "note"],
};

const ALIAS_LOOKUP = new Map<string, ImportField>(
  Object.entries(HEADER_ALIASES).flatMap(([fieldName, aliases]) =>
    aliases.map((alias) => [nameKey(alias), fieldName as ImportField] as const),
  ),
);

export type RowIssue = { code: string; value?: string };

export type ParsedRow = {
  /** Spreadsheet row number, for pointing staff at the right line. */
  rowNumber: number;
  nameAr: string;
  age: number | null;
  birthYear: number | null;
  motherPhone: string | null;
  fatherPhone: string | null;
  price: number | null;
  paid: number | null;
  paidOn: string | null;
  notes: string | null;
  /** Problems that stop the row from importing. */
  errors: RowIssue[];
  /** Problems worth checking that do not stop the row. */
  warnings: RowIssue[];
};

export type ParsedSheet = {
  name: string;
  headerRow: number | null;
  columns: Partial<Record<ImportField, number>>;
  ignoredHeaders: string[];
  rows: ParsedRow[];
};

type CellValue = ExcelJS.CellValue;

/** Plain value of a cell, following merges, formulas, rich text and hyperlinks. */
function readCell(cell: ExcelJS.Cell): string | number | Date | null {
  const value: CellValue = cell.isMerged ? cell.master.value : cell.value;
  return unwrap(value);
}

function unwrap(value: CellValue): string | number | Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) return value;
  if (typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return unwrap(value.result as CellValue);
    if ("text" in value) return unwrap(value.text as CellValue);
    if ("error" in value) return null;
  }
  return null;
}

function asText(value: string | number | Date | null) {
  if (value === null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** Excel dates arrive as Date, serial numbers, or typed text such as 15/9/2026. */
function parseDate(value: string | number | Date | null): string | null | "invalid" {
  if (value === null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "invalid" : value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    if (value < 20000 || value > 80000) return "invalid";
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  const text = value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)).trim();
  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return toIsoDate(year, Number(match[2]), Number(match[1]));
  }
  return "invalid";
}

function toIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return "invalid" as const;
  }
  return date.toISOString().slice(0, 10);
}

function findHeader(sheet: ExcelJS.Worksheet) {
  const lastRow = Math.min(sheet.rowCount, 20);
  for (let rowNumber = 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const columns: Partial<Record<ImportField, number>> = {};
    const ignored: string[] = [];
    row.eachCell({ includeEmpty: false }, (cell, column) => {
      const text = asText(readCell(cell));
      if (!text) return;
      const fieldName = ALIAS_LOOKUP.get(nameKey(text));
      if (fieldName && columns[fieldName] === undefined) columns[fieldName] = column;
      else if (!["م", "#", "no", "ن"].includes(nameKey(text))) ignored.push(text);
    });
    if (columns.name !== undefined) return { rowNumber, columns, ignored };
  }
  return null;
}

export async function parseWorkbook(data: ArrayBuffer): Promise<ParsedSheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const currentYear = new Date().getUTCFullYear();

  return workbook.worksheets
    .filter((sheet) => sheet.state === "visible")
    .map((sheet) => {
      const header = findHeader(sheet);
      if (!header) {
        return { name: sheet.name, headerRow: null, columns: {}, ignoredHeaders: [], rows: [] };
      }

      const rows: ParsedRow[] = [];
      for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        const get = (fieldName: ImportField) => {
          const column = header.columns[fieldName];
          return column === undefined ? null : readCell(row.getCell(column));
        };

        const nameAr = cleanName(asText(get("name")));
        if (!nameAr) continue;

        const errors: RowIssue[] = [];
        const warnings: RowIssue[] = [];

        const phoneOf = (fieldName: "motherPhone" | "fatherPhone") => {
          const raw = asText(get(fieldName));
          if (!raw) return null;
          const phone = normalizePhone(raw);
          if (!phone) warnings.push({ code: "invalidPhone", value: raw });
          return phone;
        };
        const motherPhone = phoneOf("motherPhone");
        const fatherPhone = phoneOf("fatherPhone");
        if (!motherPhone && !fatherPhone) errors.push({ code: "noPhone" });

        const rawAge = asText(get("age"));
        const age = rawAge ? parseAmount(rawAge) : null;
        let birthYear: number | null = null;
        if (rawAge && (age === null || age < 3 || age > 25)) warnings.push({ code: "invalidAge", value: rawAge });
        else if (age !== null) birthYear = currentYear - Math.floor(age);

        const amountOf = (fieldName: "price" | "paid" | "remaining") => {
          const raw = get(fieldName);
          if (raw === null || asText(raw) === "") return null;
          const amount = parseAmount(raw);
          if (amount === null) warnings.push({ code: "invalidAmount", value: asText(raw) });
          return amount;
        };
        const price = amountOf("price");
        const paid = amountOf("paid");
        const remaining = amountOf("remaining");

        if (price !== null && paid !== null && paid > price) warnings.push({ code: "paidOverPrice" });
        if (price !== null && remaining !== null && Math.abs(price - (paid ?? 0) - remaining) > 0.009) {
          warnings.push({ code: "remainingMismatch", value: String(remaining) });
        }

        let paidOn = parseDate(get("paidOn"));
        if (paidOn === "invalid") {
          warnings.push({ code: "invalidDate", value: asText(get("paidOn")) });
          paidOn = null;
        }
        if (paid && !paidOn) warnings.push({ code: "noPaymentDate" });

        rows.push({
          rowNumber,
          nameAr,
          age,
          birthYear,
          motherPhone,
          fatherPhone,
          price,
          paid,
          paidOn,
          notes: asText(get("notes")) || null,
          errors,
          warnings,
        });
      }

      return {
        name: sheet.name,
        headerRow: header.rowNumber,
        columns: header.columns,
        ignoredHeaders: header.ignored,
        rows,
      };
    });
}
