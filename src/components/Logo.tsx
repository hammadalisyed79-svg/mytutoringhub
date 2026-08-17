export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="18" fill="#0A4D42" />
      {/* hub nodes */}
      <circle cx="32" cy="16" r="3.2" fill="#F7F3EA" />
      <circle cx="20" cy="22" r="2.6" fill="#C45C26" />
      <circle cx="44" cy="22" r="2.6" fill="#C45C26" />
      <path
        d="M29.2 17.6 22.2 20.8M34.8 17.6l7 3.2"
        stroke="#F7F3EA"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* open book */}
      <path
        d="M12 46.5V28.2c0-1.3.8-2.4 2-2.9L30.5 18a3.6 3.6 0 0 1 3 0L50 25.3c1.2.5 2 1.6 2 2.9v18.3"
        stroke="#F7F3EA"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32 19.2V45.8" stroke="#F7F3EA" strokeWidth="3" strokeLinecap="round" />
      {/* bookmark */}
      <path d="M32 28.5v14.5l3.4-2.4 3.4 2.4V31.2" fill="#C45C26" />
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
          <span className="brand-word">My</span>
          <span className="brand-word">Tutoring</span>
          <span className="brand-word brand-word-accent">Hub</span>
        </span>
      )}
    </span>
  );
}
