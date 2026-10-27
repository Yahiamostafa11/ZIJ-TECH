/**
 * Questions sent after a session. Short forms go out after every session;
 * the longer ones after the middle and last sessions of a level, so parents
 * are not asked the same long survey every week.
 */

export type QuestionType = "scale5" | "yesno" | "emoji3" | "difficulty" | "nps" | "text";
export type Question = { key: string; type: QuestionType; optional?: boolean };

const parentShort: Question[] = [
  { key: "enthusiasm", type: "scale5" },
  { key: "showed", type: "yesno" },
  { key: "comment", type: "text", optional: true },
];

const parentLong: Question[] = [
  { key: "enthusiasm", type: "scale5" },
  { key: "thinking", type: "scale5" },
  { key: "confidence", type: "scale5" },
  { key: "communication", type: "scale5" },
  { key: "value", type: "scale5" },
  { key: "recommend", type: "nps" },
  { key: "comment", type: "text", optional: true },
];

const studentShort: Question[] = [
  { key: "enjoyed", type: "emoji3" },
  { key: "understood", type: "emoji3" },
  { key: "difficulty", type: "difficulty" },
];

const studentLong: Question[] = [
  ...studentShort,
  { key: "likedMost", type: "text", optional: true },
  { key: "hardest", type: "text", optional: true },
  { key: "nextTopic", type: "text", optional: true },
];

export const QUESTIONS = {
  parent: { short: parentShort, long: parentLong },
  student: { short: studentShort, long: studentLong },
} as const;

export function questionRange(type: QuestionType): [number, number] | null {
  switch (type) {
    case "scale5":
      return [1, 5];
    case "yesno":
      return [0, 1];
    case "emoji3":
    case "difficulty":
      return [1, 3];
    case "nps":
      return [0, 10];
    default:
      return null;
  }
}

/** The middle and last regular sessions of a level get the long form. */
export function formFor(kind: "regular" | "remedial", number: number, sessionCount: number) {
  if (kind !== "regular") return "short" as const;
  return number === Math.ceil(sessionCount / 2) || number === sessionCount ? ("long" as const) : ("short" as const);
}
