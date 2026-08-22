"use client";

import Link from "next/link";

export function NavLink({
  href,
  pathname,
  onClick,
  children,
  className,
}: {
  href: string;
  pathname: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active =
    pathname === href || (href !== "/" && href.length > 1 && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${active ? "is-active" : ""}${className ? ` ${className}` : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
