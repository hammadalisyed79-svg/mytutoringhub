import { sendEmail, newMessageEmailHtml } from "@/lib/email";

/** Deliver a new-message email. Never throws — logs failures for Vercel logs. */
export async function notifyNewMessage(opts: {
  to: string;
  fromName: string;
  preview: string;
  conversationId: string;
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const result = await sendEmail({
      to: opts.to,
      subject: "New message on My Tutoring Hub",
      html: newMessageEmailHtml(opts.fromName, opts.preview, opts.conversationId),
    });
    if (result.skipped) {
      return {
        sent: false,
        error: "RESEND_API_KEY not configured on server",
      };
    }
    return { sent: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[message-notify] email failed", {
      to: opts.to,
      conversationId: opts.conversationId,
      error,
    });
    return { sent: false, error };
  }
}

/** Admin diagnostics: send a test message notification email. */
export async function sendTestMessageEmail(to: string) {
  return sendEmail({
    to,
    subject: "Test · My Tutoring Hub messaging",
    html: newMessageEmailHtml(
      "My Tutoring Hub",
      "If you received this, Resend is configured correctly.",
      undefined,
    ),
  });
}
