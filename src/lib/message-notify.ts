import { after } from "next/server";
import { sendEmail, newMessageEmailHtml } from "@/lib/email";

/** Notify recipient of a new message without blocking the send API response. */
export function notifyNewMessage(opts: {
  to: string;
  fromName: string;
  preview: string;
  conversationId: string;
}) {
  after(async () => {
    try {
      await sendEmail({
        to: opts.to,
        subject: "New message on My Tutoring Hub",
        html: newMessageEmailHtml(opts.fromName, opts.preview, opts.conversationId),
      });
    } catch (err) {
      console.error("[message-notify] email failed", {
        to: opts.to,
        conversationId: opts.conversationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
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
