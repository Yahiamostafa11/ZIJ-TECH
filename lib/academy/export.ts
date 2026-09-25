import "server-only";
import ExcelJS from "exceljs";
import { ageOf, toMoney } from "./format";
import { sheetNameFor } from "./import/sheet-name";
import { getGroupDetail, getGroupRoster } from "./queries";

/** Same headers as the academy's own sheets, so exports re-import cleanly. */
const HEADERS = ["م", "اسم الطالب", "السن", "رقم الأم", "رقم الأب", "الاشتراك", "المدفوع", "المتبقي", "تاريخ الدفع", "ملاحظات"];
const WIDTHS = [6, 28, 7, 15, 15, 12, 12, 12, 14, 30];
const HEADER_ROW = 4;

const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ENROLLMENT_STATUS_AR: Record<string, string> = {
  completed: "أنهى المستوى",
  withdrawn: "انسحب",
  transferred: "انتقل",
};

const border: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" },
};

function uniqueName(name: string, used: Set<string>) {
  let candidate = name;
  for (let index = 2; used.has(candidate.toLowerCase()); index += 1) {
    const suffix = ` (${index})`;
    candidate = `${name.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function isoToDate(value: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : null;
}

/**
 * One tab per group in the academy's layout (group details in rows 1–3,
 * headers in row 4), plus a summary tab. Money columns are left out when the
 * viewer may not see payments.
 */
export async function buildGroupsWorkbook(groupIds: number[], { includeMoney }: { includeMoney: boolean }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ZIJ Academy";
  workbook.created = new Date();

  const usedNames = new Set<string>();
  const summary: (string | number)[][] = [];

  for (const groupId of groupIds) {
    const [detail, roster] = await Promise.all([getGroupDetail(groupId), getGroupRoster(groupId)]);
    if (!detail) continue;
    const { group } = detail;

    const sheet = workbook.addWorksheet(uniqueName(sheetNameFor(group.name), usedNames), {
      views: [{ rightToLeft: true, state: "frozen", ySplit: HEADER_ROW }],
    });
    sheet.columns = WIDTHS.map((width) => ({ width }));

    const place = group.mode === "online" ? "أونلاين" : `فرع ${detail.branchNameAr ?? ""}`;
    const schedule = detail.slots
      .map((slot) => `${WEEKDAYS_AR[slot.weekday]} ${slot.startTime.slice(0, 5)} (${slot.durationMinutes} د)`)
      .join("، ");

    sheet.getCell("B1").value = group.name;
    sheet.getCell("B1").font = { bold: true, size: 14 };
    sheet.getCell("B2").value = [
      `المستوى: ${detail.levelNameAr}`,
      place,
      `المدرّس: ${detail.instructorName ?? "—"}`,
      includeMoney ? `سعر المستوى: ${Number(group.price)}` : null,
    ]
      .filter(Boolean)
      .join("  ·  ");
    sheet.getCell("B3").value = schedule ? `المواعيد: ${schedule}` : "";
    for (const cell of ["B2", "B3"]) sheet.getCell(cell).font = { color: { argb: "FF555555" } };

    const header = sheet.getRow(HEADER_ROW);
    header.values = HEADERS;
    header.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA6A6A6" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = border;
    });

    let totalDue = 0;
    let totalPaid = 0;
    roster.forEach((row, index) => {
      const mothers = row.phones.filter((phone) => phone.relation === "mother");
      const fathers = row.phones.filter((phone) => phone.relation === "father");
      const extra = row.phones.filter(
        (phone) => phone !== mothers[0] && phone !== fathers[0],
      );
      const due = toMoney(Number(row.price) - Number(row.discount));
      const paid = toMoney(Number(row.paid ?? 0));
      totalDue += due;
      totalPaid += paid;

      const notes = [
        ENROLLMENT_STATUS_AR[row.status],
        extra.length ? `أرقام أخرى: ${extra.map((phone) => phone.phone).join("، ")}` : null,
        row.notes,
      ]
        .filter(Boolean)
        .join(" — ");

      const excelRow = sheet.getRow(HEADER_ROW + 1 + index);
      excelRow.values = [
        index + 1,
        row.nameAr,
        ageOf(row.birthDate, row.birthYear) ?? null,
        mothers[0]?.phone ?? null,
        fathers[0]?.phone ?? null,
        includeMoney ? due : null,
        includeMoney ? paid : null,
        includeMoney ? toMoney(due - paid) : null,
        includeMoney ? isoToDate(row.lastPaidOn) : null,
        notes || null,
      ];
      excelRow.eachCell({ includeEmpty: true }, (cell, column) => {
        if (column > HEADERS.length) return;
        cell.border = border;
        if (column === 4 || column === 5) cell.numFmt = "@"; // keep the leading zero
        if (column >= 6 && column <= 8) cell.numFmt = "#,##0";
        if (column === 9) cell.numFmt = "yyyy-mm-dd";
      });
    });

    if (includeMoney && roster.length) {
      // The name column stays empty so re-importing skips this row.
      const totals = sheet.getRow(HEADER_ROW + roster.length + 1);
      totals.getCell(1).value = "الإجمالي";
      totals.getCell(6).value = toMoney(totalDue);
      totals.getCell(7).value = toMoney(totalPaid);
      totals.getCell(8).value = toMoney(totalDue - totalPaid);
      totals.eachCell((cell) => {
        cell.font = { bold: true };
        cell.numFmt = "#,##0";
      });
    }

    summary.push([
      group.name,
      detail.levelNameAr,
      place,
      detail.instructorName ?? "—",
      roster.filter((row) => row.status === "active").length,
      ...(includeMoney ? [toMoney(totalDue), toMoney(totalPaid), toMoney(totalDue - totalPaid)] : []),
    ]);
  }

  const summarySheet = workbook.addWorksheet(uniqueName("ملخص المجموعات", usedNames), {
    views: [{ rightToLeft: true }],
  });
  const summaryHeaders = ["المجموعة", "المستوى", "المكان", "المدرّس", "عدد الطلاب", ...(includeMoney ? ["المطلوب", "المحصّل", "المتبقي"] : [])];
  summarySheet.columns = summaryHeaders.map((_, index) => ({ width: index === 0 ? 28 : 16 }));
  summarySheet.addRow(summaryHeaders).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA6A6A6" } };
    cell.border = border;
  });
  for (const row of summary) {
    summarySheet.addRow(row).eachCell((cell, column) => {
      cell.border = border;
      if (column >= 6) cell.numFmt = "#,##0";
    });
  }

  return workbook.xlsx.writeBuffer();
}
