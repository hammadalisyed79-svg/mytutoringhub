import { auth } from "@/lib/auth";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteNav } from "@/components/SiteNav";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo-link" aria-label="MyTutoringHub home">
          <Logo />
        </Link>
        <SiteNav user={session?.user ? { role: session.user.role } : null} />
      </div>
    </header>
  );
}
