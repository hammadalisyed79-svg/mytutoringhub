"use client";

import { useRouter } from "next/navigation";

export function MoreCountriesSelect({
  options,
  selectedLabel,
  placeholder = "More countries",
}: {
  options: { label: string; href: string }[];
  selectedLabel?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  if (options.length === 0) return null;
  const selected = options.some((option) => option.label === selectedLabel) ? selectedLabel : "";

  return (
    <select
      className="country-more-select"
      aria-label={placeholder}
      value={selected}
      onChange={(event) => {
        const next = options.find((option) => option.label === event.target.value);
        if (next) router.push(next.href);
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.label} value={option.label}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
