import { Resend } from "resend";
import { BUSINESS } from "@/lib/business-rules";
import { getPublicAppUrl } from "@/lib/payments-status";

const MAIL_FROM = "My Tutoring Hub <admin@mytutoringhub.com>";
const MAIL_REPLY_TO = "admin@mytutoringhub.com";
const appUrl = getPublicAppUrl() || "https://www.mytutoringhub.com";
const brand = "My Tutoring Hub";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  const earnLine =
    role === "TUTOR"
      ? `<p>Complete your profile to earn <strong>200 Hub Points</strong> toward plans and tutor ads. Invite others to earn <strong>50 points</strong> per successful referral.</p>`
      : `<p>Invite friends to earn <strong>50 Hub Points</strong> when they join and message a tutor.</p>`;
  return emailLayout({
    preheader: "Your My Tutoring Hub account is ready — confirm your email to get started.",
    title: "Welcome aboard",
    body: `<p>Hi ${name},</p>
<p>Thanks for joining <strong>${brand}</strong> as a ${roleLabel}. Your account is ready.</p>
<p><strong>Next step:</strong> confirm your email (we sent a separate message). Then you can search tutors, message, and earn Hub Points.</p>
${earnLine}
<p>Lesson fees always stay off-platform between you and the other party.</p>`,
    cta: { label: "Open dashboard", href: `${appUrl}/dashboard` },
  });
}

export function hubPointsEarnedEmailHtml(opts: {
  name: string;
  points: number;
  reason: string;
  balance: number;
  dashboardUrl: string;
}) {
  return emailLayout({
    preheader: `You earned ${opts.points} Hub Points.`,
    title: "Hub Points earned",
    body: `<p>Hi ${opts.name},</p>
<p><strong>+${opts.points} Hub Points</strong> — ${escapeHtml(opts.reason)}</p>
<p>Your balance is now <strong>${opts.balance.toLocaleString()} points</strong> (shown in your local currency on the dashboard).</p>
<p>Redeem on Student Pass, Student Pro, or tutor ads and subscriptions — up to 50% off each purchase.</p>`,
    cta: { label: "View your wallet", href: opts.dashboardUrl },
  });
}

export function hubPointsRedeemedEmailHtml(opts: {
  name: string;
  points: number;
  planName: string;
  balance: number;
  dashboardUrl: string;
}) {
  return emailLayout({
    preheader: `You used ${opts.points} Hub Points on ${opts.planName}.`,
    title: "Hub Points applied",
    body: `<p>Hi ${opts.name},</p>
<p><strong>−${opts.points} Hub Points</strong> applied to <strong>${escapeHtml(opts.planName)}</strong>.</p>
<p>Remaining balance: <strong>${opts.balance.toLocaleString()} points</strong>.</p>`,
    cta: { label: "Open dashboard", href: opts.dashboardUrl },
  });
}

export function hubPointsReferralPendingEmailHtml(opts: {
  name: string;
  points: number;
  dashboardUrl: string;
}) {
  return emailLayout({
    preheader: `Earn ${opts.points} Hub Points when they complete the next step.`,
    title: "Your referral signed up",
    body: `<p>Hi ${opts.name},</p>
<p>Someone joined My Tutoring Hub using your link.</p>
<p>You will receive <strong>${opts.points} Hub Points</strong> when they verify their email and complete the referral milestone (first tutor message for students, or a complete tutor profile for tutors).</p>`,
    cta: { label: "Track Hub Points", href: opts.dashboardUrl },
  });
}

export function hubPointsExpiringEmailHtml(opts: {
  name: string;
  points: number;
  expiresAt: Date;
  pricingUrl: string;
}) {
  const when = opts.expiresAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return emailLayout({
    preheader: `${opts.points} Hub Points expire on ${when}.`,
    title: "Hub Points expiring soon",
    body: `<p>Hi ${opts.name},</p>
<p>You have <strong>${opts.points.toLocaleString()} Hub Points</strong> that will expire on <strong>${when}</strong> after 12 months of inactivity.</p>
<p>Use them on a subscription or tutor ad — up to 50% off your next purchase.</p>`,
    cta: { label: "Use points on pricing", href: opts.pricingUrl },
  });
}

export function verificationReminderEmailHtml(opts: { name: string; verifyUrl: string }) {
  return emailLayout({
    preheader: "Confirm your email to unlock messaging and Hub Points.",
    title: "Reminder: confirm your email",
    body: `<p>Hi ${opts.name},</p>
<p>Please confirm your email to unlock messaging, referrals, and Hub Points on My Tutoring Hub.</p>
<p>Mail is sent from <strong>admin@mytutoringhub.com</strong> — check inbox, junk, and promotions.</p>`,
    cta: { label: "Confirm email", href: opts.verifyUrl },
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

export function newMessageEmailHtml(fromName: string, preview: string, conversationId?: string) {
  const inboxHref = conversationId
    ? `${appUrl}/messages/${conversationId}`
    : `${appUrl}/messages`;
  const safeName = escapeHtml(fromName);
  const safePreview = escapeHtml(preview.slice(0, 160));
  return emailLayout({
    preheader: `New message from ${fromName}`,
    title: "New message",
    body: `<p>You have a new message from <strong>${safeName}</strong>.</p>
<p style="padding:12px 14px;background:#f6f1e8;border-radius:8px;color:#486581">“${safePreview}”</p>`,
    cta: { label: "Reply in inbox", href: inboxHref },
  });
}

export function messageWarningEmailHtml(opts: {
  name: string;
  preview: string;
  adminNote?: string;
}) {
  const safeName = escapeHtml(opts.name);
  const safePreview = escapeHtml(opts.preview.slice(0, 200));
  const extra = opts.adminNote?.trim()
    ? `<p><strong>Note from our team:</strong> ${escapeHtml(opts.adminNote.trim())}</p>`
    : "";
  return emailLayout({
    preheader: "A message in your account was flagged for review",
    title: "Community guidelines reminder",
    body: `<p>Hi ${safeName},</p>
<p>Our moderation system flagged a recent message in your My Tutoring Hub inbox. Please keep conversations respectful and safe for students and tutors.</p>
<p style="padding:12px 14px;background:#fff4e6;border-left:4px solid #d97706;border-radius:8px;color:#92400e">“${safePreview}”</p>
${extra}
<p><strong>Please remember:</strong></p>
<ul style="margin:0;padding-left:1.2rem">
  <li>Keep all payments on the platform — never ask for or send money off-site.</li>
  <li>Do not share passwords, OTP codes, or suspicious links.</li>
  <li>Harassment, scams, and spam are not allowed and may lead to suspension.</li>
</ul>
<p>Repeated violations can result in account suspension. If you believe this was a mistake, reply to this email.</p>`,
    cta: { label: "Open messages", href: `${appUrl}/messages` },
    footer: `Questions? Contact <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>.`,
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

export function guestPaperDownloadHtml(opts: {
  email: string;
  paperTitle: string;
  downloadUrl: string;
}) {
  return emailLayout({
    preheader: "Your past paper is ready to download.",
    title: "Past paper download",
    body: `<p>Thank you for your purchase on ${brand}.</p>
<p><strong>${escapeHtml(opts.paperTitle)}</strong></p>
<p>Use the button below to download your watermarked PDF. The link works for 90 days — save a copy for offline study.</p>
<p class="muted" style="color:#52606d;font-size:14px">Sent to ${escapeHtml(opts.email)}. Create a free account anytime to unlock Student Pass paper bundles.</p>`,
    cta: { label: "Download past paper", href: opts.downloadUrl },
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
    preheader: "Confirm your email to finish signing up.",
    title: "Confirm your email",
    body: `<p>Hi ${name},</p>
<p>Thanks for joining <strong>${brand}</strong>. Confirm your email to finish signing up.</p>
<p>Open the button below, then click <strong>Confirm email address</strong> on the next page. This link expires in 24 hours.</p>
<p>After you confirm, you can log in — we will send a short welcome message with next steps.</p>`,
    cta: { label: "Confirm email address", href: verifyUrl },
  });
}

export function postVerifyStudentEmailHtml(opts: {
  name: string;
  searchUrl: string;
}) {
  return emailLayout({
    preheader: "Welcome — you're verified. Start browsing tutors.",
    title: "Welcome to My Tutoring Hub",
    body: `<p>Hi ${opts.name},</p>
<p>Your email is confirmed — welcome aboard. You can now message tutors, post student requests, and use the study tools on ${brand}.</p>
<p>Your free account includes <strong>${BUSINESS.studentFreeContactsPerMonth} new tutor contacts per month</strong>. Lesson fees always stay between you and the tutor — we never take a cut.</p>`,
    cta: { label: "Find tutors", href: opts.searchUrl },
  });
}

export function postVerifyTutorEmailHtml(opts: {
  name: string;
  dashboardUrl: string;
}) {
  return emailLayout({
    preheader: "Welcome — complete your tutor profile to appear in search.",
    title: "Welcome to My Tutoring Hub",
    body: `<p>Hi ${opts.name},</p>
<p>Your email is confirmed — welcome aboard. Complete your tutor profile (photo, about you, location, and subjects) to appear in search.</p>
<p>When you're ready to grow, Tutor Pro adds priority placement. Profile Boost lifts one subject listing to the top of search for 30 days.</p>`,
    cta: { label: "Open tutor dashboard", href: opts.dashboardUrl },
  });
}

export function tutorPicksEmailHtml(opts: {
  name: string;
  tutorsHtml: string;
  searchUrl: string;
}) {
  return emailLayout({
    preheader: "Hand-picked tutors to get you started.",
    title: "Tutors we think you'll like",
    body: `<p>Hi ${opts.name},</p>
<p>Here are active tutors on ${brand} — browse profiles and send your first message free (within your monthly contact limit).</p>
<ul style="padding-left:0;list-style:none;margin:16px 0">${opts.tutorsHtml}</ul>`,
    cta: { label: "Browse all tutors", href: opts.searchUrl },
  });
}

export function studentUpgradeNudgeEmailHtml(opts: {
  name: string;
  pricingUrl: string;
  contactsRemaining?: number;
}) {
  const contactsLine =
    opts.contactsRemaining != null
      ? `<p>You have <strong>${opts.contactsRemaining} free contact${opts.contactsRemaining === 1 ? "" : "s"}</strong> left this month.</p>`
      : "";
  return emailLayout({
    preheader: "Unlock unlimited tutor messaging with Student Pass.",
    title: "Need more tutor contacts?",
    body: `<p>Hi ${opts.name},</p>
<p>Exams coming up? <strong>Student Pass</strong> unlocks unlimited tutor messaging, 10 past paper downloads per month, and faster replies from tutors.</p>
${contactsLine}
<p>Lesson fees stay off-platform — Student Pass is only for platform access.</p>`,
    cta: { label: "View Student Pass", href: opts.pricingUrl },
  });
}

function missingFieldsList(missing: string[]) {
  if (!missing.length) return "";
  return `<ul style="margin:12px 0;padding-left:1.2rem">${missing
    .map((item) => `<li><strong>${escapeHtml(item)}</strong></li>`)
    .join("")}</ul>`;
}

export function tutorProfileIncompleteEmailHtml(opts: {
  name: string;
  missing: string[];
  requiredDone: number;
  requiredTotal: number;
  step: number;
  dashboardUrl: string;
}) {
  const missingSubjects = opts.missing.some((m) => /subject/i.test(m));
  const missingPreview = opts.missing.slice(0, 4);
  const more =
    opts.missing.length > missingPreview.length
      ? ` and ${opts.missing.length - missingPreview.length} more`
      : "";

  if (opts.step === 1) {
    const subjectLead = missingSubjects
      ? `<p>Start by adding <strong>the subjects you teach</strong>, then finish any other remaining listing details so your profile can become eligible for tutor search.</p>`
      : `<p>Finish the remaining listing details so your profile can become eligible for tutor search.</p>`;
    return emailLayout({
      preheader: "Your tutor account is ready — your profile is not visible to students yet",
      title: "Complete your tutor profile",
      body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Your tutor account on ${brand} exists, but your profile is <strong>not currently visible</strong> to students in search.</p>
${subjectLead}
<p><strong>Still needed:</strong> ${escapeHtml(missingPreview.join(", "))}${more}.</p>
<p>Completing these details can make your profile eligible for search when all requirements are met. This is not a rejection — save when you are ready.</p>`,
      cta: { label: "Complete my profile", href: opts.dashboardUrl },
    });
  }

  if (opts.step === 2) {
    return emailLayout({
      preheader: "Your tutor profile is still hidden from students",
      title: "Finish your tutor profile",
      body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>A quick reminder: your tutor profile is still not visible to students.</p>
<p>Completing the remaining details can make it eligible to appear in tutor search.</p>
<p><strong>Still needed:</strong> ${escapeHtml(missingPreview.join(", "))}${more}.</p>`,
      cta: { label: "Finish my tutor profile", href: opts.dashboardUrl },
    });
  }

  // Step 3 = final reminder (~5 days after first); step 4 kept as quiet follow-up for existing cron
  if (opts.step === 3) {
    return emailLayout({
      preheader: "Complete your tutor profile when you are ready",
      title: "Complete your tutor profile",
      body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>This is a final, respectful reminder: your listing is still not visible to students.</p>
<p>When you are ready, complete your profile from the dashboard. Your account stays safe — we will not delete it for being incomplete.</p>
<p><strong>Still needed:</strong> ${escapeHtml(missingPreview.join(", "))}${more}.</p>`,
      cta: { label: "Complete my profile", href: opts.dashboardUrl },
    });
  }

  return emailLayout({
    preheader: `${opts.requiredDone}/${opts.requiredTotal} required fields complete — your profile is not visible to students yet`,
    title: "Complete your tutor profile",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Your tutor profile on ${brand} is still hidden from students until the remaining listing details are saved.</p>
<p><strong>Still needed:</strong> ${escapeHtml(missingPreview.join(", "))}${more}.</p>`,
    cta: { label: "Complete my profile", href: opts.dashboardUrl },
  });
}

export function tutorProfileNeverStartedEmailHtml(opts: { name: string; dashboardUrl: string }) {
  return emailLayout({
    preheader: "Your tutor account is ready — add your first details.",
    title: "Start your tutor profile",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>You verified your email but haven't started your tutor profile yet. It only takes a few minutes to add a photo, subjects, headline, and your highest qualification.</p>
<p>Complete profiles appear in search for free. Tutor Pro adds priority placement when you're ready to grow.</p>`,
    cta: { label: "Start my profile", href: opts.dashboardUrl },
  });
}

export function tutorProfileLiveEmailHtml(opts: {
  name: string;
  profileUrl: string;
  dashboardUrl: string;
}) {
  return emailLayout({
    preheader: "Your profile is now visible in tutor search.",
    title: "You're live in search",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Congratulations — your tutor profile is complete and now visible to students browsing ${brand}.</p>
<p>You earned <strong>200 Hub Points</strong> for completing your profile. Use them toward Tutor Pro or a Listing Boost.</p>
<p>Tip: add a <strong>subject profile</strong> for each subject you teach so Maths and Physics show as separate search cards. Boost any listing individually from your dashboard.</p>
<p>Share your public profile link with students and start replying to requests.</p>`,
    cta: { label: "Manage subject profiles", href: `${opts.dashboardUrl}?tab=profile#subject-profiles` },
    footer: `<a href="${opts.profileUrl}">View public profile</a> · <a href="${opts.dashboardUrl}">Open dashboard</a> · Questions? Contact admin@mytutoringhub.com`,
  });
}

export function tutorPlanNudgeEmailHtml(opts: { name: string; pricingUrl: string }) {
  return emailLayout({
    preheader: "Unlock priority placement and unlimited enquiry reveals.",
    title: "Grow with Tutor Pro",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Your profile is live. <strong>Tutor Pro</strong> adds priority ranking in search and unlimited enquiry reveals when you message students first.</p>
<p>Free tutors get up to <strong>3 active teaching listings</strong>. Tutor Pro unlocks up to 10, plus relevance-first ranking and unlimited enquiry reveals.</p>
<p>Complimentary Tutor Pro may still be available — check Pricing for current offers.</p>`,
    cta: { label: "View tutor plans", href: opts.pricingUrl },
  });
}

export function tutorSecondProfileEmailHtml(opts: {
  name: string;
  dashboardUrl: string;
  existingSubject?: string;
}) {
  const subjectHint = opts.existingSubject
    ? ` You already list <strong>${escapeHtml(opts.existingSubject)}</strong>.`
    : "";
  return emailLayout({
    preheader: "Add another subject so more students can find you.",
    title: "Add a second subject profile",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Tutors who list more than one subject get discovered for each subject separately.${subjectHint}</p>
<p>Create another teaching listing from your dashboard — free tutors can run up to 3 active listings; Tutor Pro unlocks up to 10.</p>`,
    cta: { label: "Add a subject profile", href: `${opts.dashboardUrl}?tab=profile#subject-profiles` },
  });
}

export function tutorBoostNudgeEmailHtml(opts: {
  name: string;
  dashboardUrl: string;
  listingTitle?: string;
}) {
  const listingHint = opts.listingTitle
    ? ` Start with <strong>${escapeHtml(opts.listingTitle)}</strong>.`
    : "";
  return emailLayout({
    preheader: "Boost one subject listing for 30 days of extra visibility.",
    title: "Boost a subject profile",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Profile Boost lifts a single subject listing higher in search for 30 days — Maths and Physics can be boosted independently.${listingHint}</p>
<p>Open your subject profiles and choose Boost on the listing you want students to see first.</p>`,
    cta: { label: "Boost a listing", href: `${opts.dashboardUrl}?tab=profile#subject-profiles` },
  });
}

export function tutorVerifyNudgeEmailHtml(opts: { name: string; dashboardUrl: string }) {
  return emailLayout({
    preheader: "Upload your ID to earn the verified tutor badge.",
    title: "Get your verified badge",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Verified tutors build more trust with parents and students. Upload your government photo ID from your dashboard — our team reviews it within a few days.</p>
<p>The verified badge appears on your profile and helps you stand out in search.</p>`,
    cta: { label: "Upload verification documents", href: `${opts.dashboardUrl}?tab=profile&verify=1` },
  });
}

export function tutorVerificationApprovedEmailHtml(opts: { name: string; profileUrl: string }) {
  return emailLayout({
    preheader: "Your verified tutor badge is now active.",
    title: "You're verified",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Great news — our team approved your verification documents. The <strong>Verified</strong> badge is now shown on your public profile.</p>
<p>Parents and students trust verified tutors. Keep your profile up to date and respond promptly to enquiries.</p>`,
    cta: { label: "View your profile", href: opts.profileUrl },
  });
}

export function recommendationSubmittedEmailHtml(opts: {
  name: string;
  recommenderName: string;
  dashboardUrl: string;
}) {
  return emailLayout({
    preheader: "We received your recommendation submission.",
    title: "Recommendation submitted",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>We received your recommendation from <strong>${escapeHtml(opts.recommenderName)}</strong>. Our team will review it before it appears on your profile and counts toward your tutor badge.</p>
<p>Reviews usually take 1–3 business days. You'll get another email when it's approved or if we need more information.</p>`,
    cta: { label: "View submissions", href: opts.dashboardUrl },
  });
}

export function recommendationApprovedEmailHtml(opts: {
  name: string;
  recommenderName: string;
  profileUrl: string;
  badgeLabel?: string;
}) {
  const badgeLine = opts.badgeLabel
    ? `<p>This counts toward your <strong>${escapeHtml(opts.badgeLabel)}</strong> badge progression.</p>`
    : "";
  return emailLayout({
    preheader: "A recommendation was approved on your profile.",
    title: "Recommendation approved",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Your recommendation from <strong>${escapeHtml(opts.recommenderName)}</strong> has been verified and is now visible on your public profile.</p>
${badgeLine}`,
    cta: { label: "View your profile", href: opts.profileUrl },
  });
}

export function recommendationRejectedEmailHtml(opts: {
  name: string;
  recommenderName: string;
  adminNote?: string;
  dashboardUrl: string;
}) {
  const note = opts.adminNote?.trim()
    ? `<p><strong>Note from our team:</strong> ${escapeHtml(opts.adminNote.trim())}</p>`
    : "";
  return emailLayout({
    preheader: "We could not approve a recommendation submission.",
    title: "Recommendation not approved",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>We reviewed the recommendation from <strong>${escapeHtml(opts.recommenderName)}</strong> but could not approve it at this time.</p>
${note}
<p>You can submit a new recommendation with clearer proof or contact admin@mytutoringhub.com if you have questions.</p>`,
    cta: { label: "Submit another", href: opts.dashboardUrl },
  });
}

export function reviewPublishedEmailHtml(opts: {
  name: string;
  studentName: string;
  rating: number;
  commentPreview: string;
  profileUrl: string;
}) {
  return emailLayout({
    preheader: "A new student review is live on your profile.",
    title: "New review published",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p><strong>${escapeHtml(opts.studentName)}</strong> left a <strong>${opts.rating}/5</strong> review on your profile:</p>
<p style="padding:12px 14px;background:#f6f1e8;border-radius:8px;color:#486581">“${escapeHtml(opts.commentPreview.slice(0, 220))}”</p>
<p>On-platform reviews count toward your <strong>Super Tutor</strong> and <strong>Top Tutor</strong> badges.</p>`,
    cta: { label: "View your profile", href: opts.profileUrl },
  });
}

export function studentBrowseNudgeEmailHtml(opts: {
  name: string;
  searchUrl: string;
  step: number;
}) {
  const body =
    opts.step === 1
      ? `<p>Hi ${escapeHtml(opts.name)},</p>
<p>You verified your email but haven't messaged a tutor yet. Browse profiles, compare subjects and rates, and send your first message free.</p>`
      : `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Still looking for the right tutor? Try filtering by subject and city — most tutors reply within a day.</p>
<p>Your free account includes <strong>${BUSINESS.studentFreeContactsPerMonth} new tutor contacts per month</strong>.</p>`;
  return emailLayout({
    preheader: "Find and message tutors on My Tutoring Hub.",
    title: opts.step === 1 ? "Ready to find your tutor?" : "Tutors are waiting to hear from you",
    body,
    cta: { label: "Browse tutors", href: opts.searchUrl },
  });
}

export function studentPostAdNudgeEmailHtml(opts: {
  name: string;
  adsUrl: string;
  step: number;
}) {
  const body =
    opts.step === 1
      ? `<p>Hi ${escapeHtml(opts.name)},</p>
<p>With Student Pass active, you can post a <strong>student request</strong> so tutors come to you. Describe your subject, level, and budget — tutors in your area will see it.</p>`
      : `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Posting a request takes two minutes and often gets faster replies than browsing alone. Tutors with matching subjects are notified.</p>`;
  return emailLayout({
    preheader: "Post a student request and let tutors apply.",
    title: opts.step === 1 ? "Post your first student request" : "Let tutors find you",
    body,
    cta: { label: "Post a request", href: opts.adsUrl },
  });
}

export function studentReferralNudgeEmailHtml(opts: { name: string; dashboardUrl: string }) {
  return emailLayout({
    preheader: "Earn 50 Hub Points per successful referral.",
    title: "Invite friends, earn Hub Points",
    body: `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Share ${brand} with classmates or friends. When they join and complete their milestone, you earn <strong>50 Hub Points</strong> (worth Rs 1 each toward subscriptions and ads).</p>
<p>Find your personal invite link on your dashboard.</p>`,
    cta: { label: "Open dashboard", href: opts.dashboardUrl },
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
