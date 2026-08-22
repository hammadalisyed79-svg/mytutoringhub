export function MessagesAccountBanner({
  email,
  role,
}: {
  email: string;
  role: string;
}) {
  const roleLabel =
    role === "TUTOR" ? "Tutor" : role === "STUDENT" ? "Student" : role === "ADMIN" ? "Admin" : role;
  return (
    <p
      className="muted messages-account-banner"
      style={{
        margin: "0 0 1rem",
        padding: "0.65rem 0.9rem",
        background: "var(--paper-deep)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
      }}
    >
      Signed in as <strong>{email}</strong> ({roleLabel}). Messages and notifications go to this
      account only — tutors and students must each use their own login.
    </p>
  );
}
