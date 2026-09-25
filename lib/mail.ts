import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string; html?: string };

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter ??= nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

/** Sends a transactional email from the academy. Returns false when mail is not configured or fails. */
export async function sendMail(mail: Mail) {
  const transport = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!transport || !from) {
    console.warn(`Email not sent (SMTP not configured): ${mail.subject}`);
    return false;
  }
  try {
    await transport.sendMail({ from: `Zij Academy <${from}>`, ...mail });
    return true;
  } catch (error) {
    console.error("Email delivery failed:", (error as Error).message);
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => `&#${character.charCodeAt(0)};`);
}

/**
 * A simple bilingual email: Arabic first (right-to-left), then English, with
 * an optional button link.
 */
export function bilingualMail(parts: {
  ar: { title: string; body: string };
  en: { title: string; body: string };
  link?: { url: string; ar: string; en: string };
}) {
  const button = (label: string) =>
    parts.link
      ? `<p><a href="${escapeHtml(parts.link.url)}" style="display:inline-block;background:#0e444a;color:#fbf5e9;padding:10px 18px;border-radius:6px;text-decoration:none">${escapeHtml(label)}</a></p>`
      : "";
  const html = `
<div style="font-family:Tahoma,Arial,sans-serif;background:#fbf5e9;padding:24px;color:#0e444a">
  <div dir="rtl" style="text-align:right">
    <h2 style="color:#0e444a">${escapeHtml(parts.ar.title)}</h2>
    <p style="color:#5c6d6c;line-height:1.8">${escapeHtml(parts.ar.body)}</p>
    ${button(parts.link?.ar ?? "")}
  </div>
  <hr style="border:none;border-top:1px solid #e6d6b7;margin:24px 0" />
  <div dir="ltr">
    <h2 style="color:#0e444a">${escapeHtml(parts.en.title)}</h2>
    <p style="color:#5c6d6c;line-height:1.6">${escapeHtml(parts.en.body)}</p>
    ${button(parts.link?.en ?? "")}
  </div>
  <p style="color:#b08438;font-size:12px;margin-top:24px">ZIJ Academy</p>
</div>`;
  const text = [parts.ar.title, parts.ar.body, parts.link?.url, "", parts.en.title, parts.en.body, parts.link?.url]
    .filter((line) => line !== undefined)
    .join("\n");
  return { html, text };
}
