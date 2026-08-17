import { checkoutNotice } from "@/lib/checkout-status";

export function CheckoutNotice({
  checkout,
  state,
  planLabel,
}: {
  checkout?: string;
  state?: string;
  planLabel?: string;
}) {
  const notice = checkoutNotice(checkout, state);
  if (!notice) return null;
  const className =
    notice.tone === "ok" ? "success panel" : notice.tone === "error" ? "panel form-error" : "panel";
  const text =
    notice.tone === "ok" && planLabel
      ? `${notice.text.replace("Your plan is active", `Your plan is active (${planLabel})`)}`
      : notice.text;
  return (
    <p className={className} style={{ marginTop: "1rem" }}>
      {text}
    </p>
  );
}
