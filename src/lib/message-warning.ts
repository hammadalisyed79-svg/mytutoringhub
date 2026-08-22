import { sendEmail, messageWarningEmailHtml } from "@/lib/email";

export async function notifyMessageWarning(opts: {
  to: string;
  name: string;
  preview: string;
  adminNote?: string;
}) {
  if (!opts.to?.trim()) {
    return { sent: false, error: "Recipient has no email address" };
  }
  try {
    const result = await sendEmail({
      to: opts.to.trim(),
      subject: "Important: community guidelines reminder · My Tutoring Hub",
      html: messageWarningEmailHtml({
        name: opts.name,
        preview: opts.preview,
        adminNote: opts.adminNote,
      }),
    });
    if (result.skipped) {
      return { sent: false, error: "RESEND_API_KEY not configured on server" };
    }
    return { sent: true, id: result.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[message-warning] email failed", { to: opts.to, error });
    return { sent: false, error };
  }
}
