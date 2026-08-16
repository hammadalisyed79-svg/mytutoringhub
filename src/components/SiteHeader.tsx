import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

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
          <Link href="/ads">Student ads</Link>
          <Link href="/pricing">Pricing</Link>
          {session?.user ? (
            <>
              <Link href="/messages">Messages</Link>
              <Link href="/dashboard">Dashboard</Link>
              {session.user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="link-btn">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/register" className="btn btn-sm">
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
