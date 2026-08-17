"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SuggestOption = {
  value: string;
  label: string;
  hint?: string;
};

export function SuggestField({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  spellCheck = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string, option?: SuggestOption) => void;
  options: SuggestOption[];
  placeholder?: string;
  spellCheck?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(option: SuggestOption) {
    onChange(option.value, option);
    setOpen(false);
  }

  return (
    <div className="suggest" ref={wrapRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={spellCheck}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && options[active]) {
            e.preventDefault();
            choose(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && options.length > 0 && (
        <ul id={listId} role="listbox" className="suggest-list">
          {options.map((option, i) => (
            <li key={`${option.value}-${option.hint || option.label}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={i === active ? "is-active" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {option.hint ? <span className="suggest-hint">{option.hint}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
