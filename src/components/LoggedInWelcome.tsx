import Link from "next/link";
import { getStudentWelcomeMatch } from "@/lib/student-tutor-matches";
import type { Role } from "@/lib/types";

export async function LoggedInWelcome({
  userId,
  name,
  role,
}: {
  userId: string;
  name: string;
  role: Role;
}) {
  const firstName = name.trim().split(/\s+/)[0] || name;

  if (role === "TUTOR") {
    return (
      <div className="logged-in-welcome" role="status">
        <p className="logged-in-welcome-text">
          Welcome back, <strong>{firstName}</strong> — check student requests and reply to
          messages.
        </p>
        <div className="logged-in-welcome-actions">
          <Link href="/ads" className="btn btn-sm">
            Student requests
          </Link>
          <Link href="/messages" className="btn btn-secondary btn-sm">
            Messages
          </Link>
        </div>
      </div>
    );
  }

  if (role === "ADMIN") {
    return (
      <div className="logged-in-welcome" role="status">
        <p className="logged-in-welcome-text">
          Welcome back, <strong>{firstName}</strong>.
        </p>
        <div className="logged-in-welcome-actions">
          <Link href="/admin" className="btn btn-sm">
            Admin dashboard
          </Link>
        </div>
      </div>
    );
  }

  const match = await getStudentWelcomeMatch(userId);
  const searchHref =
    match.kind === "subjects" && match.subjects[0]
      ? `/search?subject=${encodeURIComponent(match.subjects[0])}`
      : "/search";

  return (
    <div className="logged-in-welcome" role="status">
      <p className="logged-in-welcome-text">
        Welcome back, <strong>{firstName}</strong>
        {match.kind === "subjects" ? (
          <>
            {" "}
            —{" "}
            {match.count === 0
              ? `we’re finding tutors for ${match.subjects.slice(0, 2).join(", ")}`
              : `${match.count.toLocaleString()} tutor${match.count === 1 ? "" : "s"} match your subjects`}
          </>
        ) : (
          <> — {match.count.toLocaleString()} active tutors ready to help</>
        )}
      </p>
      <div className="logged-in-welcome-actions">
        <Link href={searchHref} className="btn btn-sm">
          {match.kind === "subjects" ? "View matches" : "Browse tutors"}
        </Link>
      </div>
    </div>
  );
}
