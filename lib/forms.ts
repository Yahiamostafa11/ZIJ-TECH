import { z } from "zod";
import { normalizePhone, parseAmount } from "@/lib/academy/normalize";

/**
 * Result of a form server action. Messages are keys under the `errors` and
 * `messages` translation namespaces so the client shows them in its language.
 */
export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function formDataToObject(formData: FormData) {
  const object: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key);
    object[key] = key.endsWith("[]") ? values : values[0];
  }
  return object;
}

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { data: z.infer<T>; state?: undefined } | { data?: undefined; state: ActionState } {
  const result = schema.safeParse(formDataToObject(formData));
  if (result.success) return { data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message.includes(" ") ? "invalid" : issue.message;
  }
  return { state: { error: "checkFields", fieldErrors } };
}

const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const field = {
  text: (max: number) => z.string("required").trim().min(1, "required").max(max, "tooLong"),
  optionalText: (max: number) =>
    z.preprocess(blankToNull, z.string().trim().max(max, "tooLong").nullable().default(null)),
  id: () => z.coerce.number("required").int("required").positive("required"),
  optionalId: () =>
    z.preprocess(blankToNull, z.coerce.number().int().positive().nullable().default(null)),
  int: (min: number, max: number) =>
    z.coerce.number("invalid").int("invalid").min(min, "outOfRange").max(max, "outOfRange"),
  amount: () =>
    z.preprocess(
      (value) => parseAmount(value) ?? value,
      z.number("invalidAmount").min(0, "invalidAmount"),
    ),
  positiveAmount: () =>
    z.preprocess(
      (value) => parseAmount(value) ?? value,
      z.number("invalidAmount").positive("invalidAmount"),
    ),
  date: () => z.string("required").regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate"),
  optionalDate: () =>
    z.preprocess(
      blankToNull,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate").nullable().default(null),
    ),
  phone: () =>
    z.preprocess(
      (value) => normalizePhone(value) ?? (blankToNull(value) === null ? undefined : "invalid"),
      z.string("required").regex(/^01\d{9}$/, "invalidPhone"),
    ),
  optionalPhone: () =>
    z.preprocess(
      (value) => (blankToNull(value) === null ? null : (normalizePhone(value) ?? "invalid")),
      z.string().regex(/^01\d{9}$/, "invalidPhone").nullable(),
    ),
  checkbox: () => z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  optionalUrl: () =>
    z.preprocess(
      blankToNull,
      z.url("invalidUrl").max(500, "tooLong").nullable().default(null),
    ),
};
