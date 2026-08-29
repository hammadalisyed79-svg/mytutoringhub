import { privateMetadata } from "@/lib/seo";
import { VerifyEmailConfirm } from "@/components/VerifyEmailConfirm";

export const metadata = privateMetadata(
  "Confirm email – My Tutoring Hub",
  "Confirm your My Tutoring Hub email address to finish signing up.",
);

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  return (
    <div className="page">
      <div className="container narrow-prose">
        <VerifyEmailConfirm token={token} />
      </div>
    </div>
  );
}
