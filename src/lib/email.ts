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
  return active
    ? `<p>Your <strong>${planName}</strong> subscription is now active. Thanks for joining MyTutoringHub.</p>`
    : `<p>Your <strong>${planName}</strong> subscription status changed. Manage billing from your dashboard.</p>`;
}
