import type { Locale } from "@/lib/i18n/config";

/** Arabic UI still uses Latin digits: staff read phone numbers and amounts that way. */
function numberLocale(locale: Locale) {
  return locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG";
}

export function formatMoney(value: number | string | null | undefined, locale: Locale) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(numberLocale(locale), {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDate(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  return new Intl.DateTimeFormat(numberLocale(locale), {
    dateStyle: "medium",
    timeZone: typeof value === "string" ? "UTC" : "Africa/Cairo",
  }).format(date);
}

export function formatDateTime(value: Date | null | undefined, locale: Locale) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(numberLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(value);
}

/** Today's date in Cairo as YYYY-MM-DD. */
export function todayInCairo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
}

/** Age in whole years from a birth date, or approximately from a birth year. */
export function ageOf(birthDate: string | null, birthYear: number | null) {
  const now = new Date();
  if (birthDate) {
    const born = new Date(`${birthDate}T00:00:00Z`);
    let age = now.getUTCFullYear() - born.getUTCFullYear();
    const hadBirthday =
      now.getUTCMonth() > born.getUTCMonth() ||
      (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() >= born.getUTCDate());
    if (!hadBirthday) age -= 1;
    return age;
  }
  return birthYear ? now.getUTCFullYear() - birthYear : null;
}

/** Rounds to piasters to avoid floating-point drift when summing money. */
export function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Picks the Arabic or English variant of a bilingual name. */
export function localized(locale: Locale, ar: string | null | undefined, en: string | null | undefined) {
  return (locale === "ar" ? ar || en : en || ar) ?? "";
}
