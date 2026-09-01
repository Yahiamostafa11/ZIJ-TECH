import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_BODY_BYTES = 12_000;
const requestsByClient = new Map<string, { count: number; resetAt: number }>();

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[\r\n]/.test(email);
}

function getClientId(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.headers.get("x-real-ip") || "unknown-client";
}

function isRateLimited(clientId: string) {
  const now = Date.now();

  if (requestsByClient.size > 1_000) {
    requestsByClient.forEach((value, key) => {
      if (value.resetAt <= now) requestsByClient.delete(key);
    });
  }

  const current = requestsByClient.get(clientId);

  if (!current || current.resetAt <= now) {
    requestsByClient.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }

    const clientId = getClientId(req);
    if (isRateLimited(clientId)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const name = normalizeText(body.name, 100);
    const email = normalizeText(body.email, 254);
    const message = normalizeText(body.message, 5_000);

    // A filled honeypot is treated as success so bots do not learn how to bypass it.
    if (typeof body.company === "string" && body.company.trim()) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!name || !email || !message || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid contact details" }, { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const recipient = process.env.CONTACT_EMAIL;
    const sender = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !recipient || !sender) {
      console.error("Contact form SMTP configuration is incomplete.");
      return NextResponse.json({ error: "Contact service is unavailable" }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br />");
    const safeHeaderName = name.replace(/[\r\n]+/g, " ");

    const mailOptions = {
      from: `ZIJ Technologies <${sender}>`,
      replyTo: { name: safeHeaderName, address: email },
      to: recipient,
      subject: `New Contact Form Submission from ${safeHeaderName}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #8B6914;">New Contact Submission</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Message:</strong></p>
          <p style="background: #f4f4f4; padding: 12px; border-radius: 4px;">${safeMessage}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    console.error("Contact form request failed.");
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
