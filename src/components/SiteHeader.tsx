import { auth } from "@/lib/auth";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          MyTutoringHub
        </Link>
        <nav className="nav">
          <Link href="/search">Find tutors</Link>
          <Link href="/subjects">Subjects</Link>
          <Link href="/ads">Student ads</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/become-a-tutor">Become a tutor</Link>
          <Link href="/pricing">Pricing</Link>
          {session?.user ? (
            <>
              <Link href="/messages">Messages</Link>
              <Link href="/dashboard">Dashboard</Link>
              {session.user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/register" className="btn btn-sm">
                Join free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
