import "server-only";
import nodemailer from "nodemailer";
import type { EmailContent } from "./templates";

/** The public address for links in emails. A request's own headers can be forged, so they aren't used. */
export function getSiteUrl() {
  const isLive = process.env.NODE_ENV === "production";
  const configured = [process.env.SITE_URL, process.env.NEXT_PUBLIC_SITE_URL].find(
    (url) => url && (!isLive || !url.includes("localhost")),
  );
  if (configured) return configured.replace(/\/$/, "").replace(/^https:\/\/localhost/, "http://localhost");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://almera.lk";
}

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT || "465");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    // Google displays app passwords in groups with spaces.
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD?.replace(/\s/g, "") },
    connectionTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

/** Never throws, so a mail problem can't undo an order or a sign-up that already went through. */
export async function sendEmail(to: string, content: EmailContent): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("[email] Not sent because SMTP settings are missing:", content.subject);
    return false;
  }
  try {
    const fromName = process.env.MAIL_FROM_NAME || "almera";
    // Gmail only sends as the signed-in account, or an alias added in its settings.
    const fromEmail = process.env.MAIL_FROM || process.env.SMTP_USER;
    await createTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      replyTo: process.env.MAIL_REPLY_TO || fromEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    return true;
  } catch (err) {
    const code = err instanceof Error && "code" in err ? String(err.code) : "unknown";
    console.error(`[email] Failed to send "${content.subject}":`, code);
    return false;
  }
}
