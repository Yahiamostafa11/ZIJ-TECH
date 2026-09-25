const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g;

function toLatinDigits(value: string) {
  return value.replace(ARABIC_INDIC_DIGITS, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/**
 * Normalises an Egyptian mobile number to 11 digits (01XXXXXXXXX).
 * Accepts Arabic-Indic digits, spaces, dashes, +20/0020 prefixes, and numbers
 * whose leading zero was dropped by Excel. Returns null when invalid.
 */
export function normalizePhone(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let digits = toLatinDigits(String(raw)).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;

  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

/**
 * A comparison key for Arabic names: strips diacritics and tatweel, unifies
 * alef/yaa/taa-marbuta variants and whitespace. Used to recognise the same
 * student across Excel re-imports.
 */
export function nameKey(name: string) {
  return toLatinDigits(name)
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Collapses whitespace in a display name. */
export function cleanName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

/** Family display name from a child's full name: everything after the first name. */
export function familyNameFrom(studentName: string) {
  const parts = cleanName(studentName).split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : null;
}

/** Parses a money-like input ("3,100", "٣١٠٠", 3100) to a non-negative number. */
export function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? raw : null;
  const cleaned = toLatinDigits(String(raw)).replace(/[,\s٬]/g, "").replace("٫", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}
