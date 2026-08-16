export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill="#0A4D42" />
      <path
        d="M14 42V22.5c0-1.2.7-2.3 1.8-2.8L30 13.2a4 4 0 0 1 3.6 0L47.8 19.7c1.1.5 1.8 1.6 1.8 2.8V42"
        stroke="#F7F3EA"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 14.5V41"
        stroke="#F7F3EA"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="22" cy="46" r="4.5" fill="#C45C26" />
      <circle cx="42" cy="46" r="4.5" fill="#C45C26" />
      <circle cx="32" cy="48.5" r="5.5" fill="#F7F3EA" />
      <path
        d="M26.2 46.8h11.6"
        stroke="#0A4D42"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={`brand-logo ${className}`.trim()}>
      <LogoMark className="brand-logo-mark" />
      {showWordmark && (
        <span className="brand-logo-text">
          MyTutoring<span>Hub</span>
        </span>
      )}
    </span>
  );
}
