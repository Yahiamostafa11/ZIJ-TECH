/** Accounts without their own email log in as <username>@zij-academy. */
export const LOGIN_DOMAIN = "zij-academy";

/**
 * Placeholder stored in user.email for username-only accounts. The reserved
 * .invalid top-level domain (RFC 2606) can never receive mail, so nothing is
 * ever sent to an address the person does not own.
 */
const PLACEHOLDER_SUFFIX = "@accounts.zij-academy.invalid";

export function placeholderEmail(username: string) {
  return `${username}${PLACEHOLDER_SUFFIX}`;
}

/** Whether the account has a real, verified email we may write to. */
export function hasRealEmail(account: { email: string; emailVerified: boolean }) {
  return account.emailVerified && !account.email.endsWith(PLACEHOLDER_SUFFIX);
}

export function loginIdOf(account: { username: string | null; email: string }) {
  return account.username ? `${account.username}@${LOGIN_DOMAIN}` : account.email;
}

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,38}[a-z0-9])?$/;

/**
 * How a typed login maps to an account: "ahmed.sameh@zij-academy" and
 * "ahmed.sameh" are usernames; anything else with "@" is an email.
 */
export function parseLogin(input: string): { username: string } | { email: string } {
  const value = input.trim().toLowerCase();
  const suffix = `@${LOGIN_DOMAIN}`;
  if (value.endsWith(suffix)) return { username: value.slice(0, -suffix.length) };
  if (value.includes("@")) return { email: value };
  return { username: value };
}

/** Suggests a username from an English name, falling back to a prefix and number. */
export function suggestUsername(nameEn: string | null | undefined, fallback: string) {
  const slug = (nameEn ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s.-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(".");
  return USERNAME_PATTERN.test(slug) ? slug : fallback;
}
