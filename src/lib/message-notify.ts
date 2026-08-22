import { sendEmail, newMessageEmailHtml } from "@/lib/email";

/** Notify recipient of a new message without blocking or failing the send API. */
export function notifyNewMessage(opts: {
  to: string;
  fromName: string;
  preview: string;
  conversationId: string;
}) {
  void sendEmail({
    to: opts.to,
    subject: "New message on My Tutoring Hub",
    html: newMessageEmailHtml(opts.fromName, opts.preview, opts.conversationId),
  }).catch((err) => {
    console.error("[message-notify] email failed", {
      to: opts.to,
      conversationId: opts.conversationId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
