import { Resend } from "resend";
const MAIL_FROM = "My Tutoring Hub <admin@mytutoringhub.com>";
const MAIL_REPLY_TO = "admin@mytutoringhub.com";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const brand = "My Tutoring Hub";

export function emailFromAddress() {
  return MAIL_FROM;
}

export function emailConfigured() {
  const key = process.env.RESEND_API_KEY || "";
  return Boolean(key && !key.includes("replace") && key.startsWith("re_"));
}

function emailLayout(opts: {
  preheader: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  footer?: string;
}) {
  const cta = opts.cta
    ? `<p style="margin:28px 0 0"><a href="${opts.cta.href}" style="display:inline-block;background:#0d5f52;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">${opts.cta.label}</a></p>`
    : "";
  const footer =
    opts.footer ||
    `If you did not request this, you can ignore this email or contact <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;background:#f6f1e8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f2933">
  <div style="display:none;max-height:0;overflow:hidden">${opts.preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e8;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e7dfd1;border-radius:14px;overflow:hidden">
          <tr>
            <td style="padding:28px 28px 8px">
              <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0d5f52">${brand}</div>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;color:#102a43">${opts.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-size:16px;line-height:1.6;color:#334e68">
              ${opts.body}
              ${cta}
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#829ab1">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!emailConfigured()) {
    const prod = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    console.error("[email] RESEND_API_KEY missing or invalid; not sending", {
      to: opts.to,
      from: MAIL_FROM,
      subject: opts.subject,
    });
    if (prod) {
      throw new Error(
        "Email is not configured on the server. Add a valid RESEND_API_KEY in Vercel, and verify mytutoringhub.com in Resend so mail can send from admin@mytutoringhub.com.",
      );
    }
    console.info("[email:dev]", MAIL_FROM, "→", opts.to, opts.subject);
    return { ok: true as const, skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: MAIL_FROM,
    replyTo: MAIL_REPLY_TO,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (result.error) {
    console.error("[email] Resend rejected", { to: opts.to, from: MAIL_FROM, error: result.error });
    throw new Error(
      result.error.message ||
        "Email provider rejected the message. Verify the mytutoringhub.com domain in Resend.",
    );
  }
  return { ok: true as const, skipped: false, id: result.data?.id };
}

export function welcomeEmailHtml(name: string, role: string) {
  const roleLabel = role === "TUTOR" ? "tutor" : "student";
  return emailLayout({
    preheader: "Your My Tutoring Hub account is ready.",
    title: "Welcome aboard",
    body: `<p>Hi ${name},</p>
<p>Thanks for joining <strong>${brand}</strong> as a ${roleLabel}. Your account is ready.</p>
<p>Next step: choose a subscription plan to unlock messaging and connect with tutors or students worldwide. Lesson fees always stay off-platform between you and the other party.</p>`,
    cta: { label: "View plans & pricing", href: `${appUrl}/pricing` },
  });
}

export function loginConfirmationEmailHtml(opts: {
  name: string;
  method: "password" | "google" | "microsoft";
  when: Date;
}) {
  const when = opts.when.toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  });
  const methodLabel =
    opts.method === "google"
      ? "Google"
      : opts.method === "microsoft"
        ? "Microsoft"
        : "email and password";
  return emailLayout({
    preheader: "New sign-in to your My Tutoring Hub account.",
    title: "Sign-in confirmation",
    body: `<p>Hi ${opts.name},</p>
<p>We recorded a new sign-in to your ${brand} account using <strong>${methodLabel}</strong>.</p>
<p><strong>When:</strong> ${when} UTC</p>
<p>If this was you, no action is needed. If you do not recognise this activity, change your password immediately and contact support.</p>`,
    cta: { label: "Open account settings", href: `${appUrl}/settings` },
  });
}

export function newMessageEmailHtml(fromName: string, preview: string) {
  return emailLayout({
    preheader: `New message from ${fromName}`,
    title: "New message",
    body: `<p>You have a new message from <strong>${fromName}</strong>.</p>
<p style="padding:12px 14px;background:#f6f1e8;border-radius:8px;color:#486581">“${preview.slice(0, 160)}”</p>`,
    cta: { label: "Open inbox", href: `${appUrl}/messages` },
  });
}

export function subscriptionEmailHtml(planName: string, active: boolean) {
  return emailLayout({
    preheader: active ? `${planName} is now active` : `${planName} status changed`,
    title: active ? "Subscription active" : "Subscription update",
    body: active
      ? `<p>Your <strong>${planName}</strong> subscription is now active. Thank you for supporting ${brand}.</p>`
      : `<p>Your <strong>${planName}</strong> subscription status changed. You can review billing from your dashboard.</p>`,
    cta: { label: "Open dashboard", href: `${appUrl}/dashboard` },
  });
}

export function paymentReceiptHtml(opts: {
  name: string;
  planName: string;
  amountLabel?: string | null;
  periodEnd?: Date | null;
  receiptId?: string;
}) {
  const amountLine = opts.amountLabel
    ? `<p><strong>Amount paid:</strong> ${opts.amountLabel}</p>`
    : "";
  const periodLine = opts.periodEnd
    ? `<p><strong>Access until:</strong> ${opts.periodEnd.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</p>`
    : "";
  const slipUrl = opts.receiptId ? `${appUrl}/receipt/${opts.receiptId}` : `${appUrl}/dashboard`;
  return emailLayout({
    preheader: `Receipt for ${opts.planName}`,
    title: "Payment receipt",
    body: `<p>Hi ${opts.name},</p>
<p>Thank you for your payment for <strong>${opts.planName}</strong>.</p>
${amountLine}${periodLine}
<p>Lesson fees stay off-platform between you and the other party. This charge is only for your platform subscription.</p>`,
    cta: { label: "View or print receipt", href: slipUrl },
  });
}

export function studentAdDigestHtml(opts: {
  name: string;
  listHtml: string;
  adsUrl: string;
}) {
  return emailLayout({
    preheader: "New student requests matching your subjects.",
    title: "New student requests",
    body: `<p>Hi ${opts.name},</p>
<p>New student requests matching your subjects:</p>
<ul>${opts.listHtml}</ul>`,
    cta: { label: "Browse student requests", href: opts.adsUrl },
  });
}

export function verifyEmailHtml(name: string, verifyUrl: string) {
  return emailLayout({
    preheader: "Confirm your email to unlock messaging and requests.",
    title: "Confirm your email",
    body: `<p>Hi ${name},</p>
<p>Please confirm your email address to unlock messaging, student requests, and the study assistant on ${brand}.</p>
<p>This link expires in 24 hours.</p>`,
    cta: { label: "Confirm email address", href: verifyUrl },
  });
}

export async function sendLoginConfirmationEmail(opts: {
  name: string;
  email: string;
  method: "password" | "google" | "microsoft";
}) {
  await sendEmail({
    to: opts.email,
    subject: "Sign-in confirmation · My Tutoring Hub",
    html: loginConfirmationEmailHtml({
      name: opts.name,
      method: opts.method,
      when: new Date(),
    }),
  });
}
