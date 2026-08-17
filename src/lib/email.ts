import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.EMAIL_FROM || "MyTutoringHub <onboarding@resend.dev>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.info("[email:dev]", opts.to, opts.subject);
    return { ok: true as const, skipped: true };
  }
  await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { ok: true as const, skipped: false };
}

export function welcomeEmailHtml(name: string, role: string) {
  return `<p>Hi ${name},</p><p>Welcome to <strong>MyTutoringHub</strong>. Your ${role.toLowerCase()} account is ready.</p><p>Subscribe to start connecting — lesson payments stay between you and the other party.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing">View plans</a></p>`;
}

export function newMessageEmailHtml(fromName: string, preview: string) {
  return `<p>You have a new message from <strong>${fromName}</strong> on MyTutoringHub.</p><p>“${preview.slice(0, 160)}”</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/messages">Open inbox</a></p>`;
}

export function subscriptionEmailHtml(planName: string, active: boolean) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return active
    ? `<p>Your <strong>${planName}</strong> subscription is now active. Thanks for joining MyTutoringHub.</p><p><a href="${appUrl}/dashboard">Open dashboard</a></p>`
    : `<p>Your <strong>${planName}</strong> subscription status changed. Manage billing from your dashboard.</p>`;
}

export function paymentReceiptHtml(opts: {
  name: string;
  planName: string;
  amountLabel?: string | null;
  periodEnd?: Date | null;
  receiptId?: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const amountLine = opts.amountLabel
    ? `<p>Amount: <strong>${opts.amountLabel}</strong></p>`
    : "";
  const periodLine = opts.periodEnd
    ? `<p>Access until: <strong>${opts.periodEnd.toLocaleDateString("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</strong></p>`
    : "";
  const slipUrl = opts.receiptId ? `${appUrl}/receipt/${opts.receiptId}` : `${appUrl}/dashboard`;
  return `<p>Hi ${opts.name},</p>
<p>This is your receipt for <strong>${opts.planName}</strong> on MyTutoringHub.</p>
${amountLine}${periodLine}
<p>Lesson fees stay off-platform between you and the other party. This charge is only for your platform subscription.</p>
<p><a href="${slipUrl}">View or print your payment slip</a></p>
<p>Questions? Email <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>.</p>`;
}

export function verifyEmailHtml(name: string, verifyUrl: string) {
  return `<p>Hi ${name},</p>
<p>Welcome to <strong>MyTutoringHub</strong>. Please verify this email to message, post ads, and use the study assistant.</p>
<p><a href="${verifyUrl}">Verify email address</a></p>
<p>This link expires in 24 hours. If you did not create an account, you can ignore this message.</p>`;
}
