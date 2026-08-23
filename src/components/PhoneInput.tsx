"use client";

import { useEffect, useId, useState } from "react";
import {
  PHONE_COUNTRIES,
  buildE164,
  countryFlag,
  parsePhone,
  phonePlaceholder,
} from "@/lib/phone";

export function PhoneInput({
  value,
  onChange,
  defaultCountryCode = "PK",
  id,
  name,
  disabled,
  hint,
  required,
}: {
  value: string;
  onChange: (e164: string) => void;
  defaultCountryCode?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const [countryCode, setCountryCode] = useState(defaultCountryCode.toUpperCase());
  const [national, setNational] = useState("");

  useEffect(() => {
    const parsed = parsePhone(value, defaultCountryCode);
    setCountryCode(parsed.countryCode);
    setNational(parsed.national);
  }, [value, defaultCountryCode]);

  function emit(nextCountry: string, nextNational: string) {
    setCountryCode(nextCountry);
    setNational(nextNational);
    onChange(buildE164(nextCountry, nextNational));
  }

  return (
    <div className="phone-input-field">
      <div className="phone-input">
        <label className="sr-only" htmlFor={`${inputId}-country`}>
          Country code
        </label>
        <select
          id={`${inputId}-country`}
          className="phone-input-country"
          value={countryCode}
          disabled={disabled}
          onChange={(e) => emit(e.target.value, national)}
          aria-label="Phone country code"
        >
          {PHONE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {countryFlag(country.code)} +{country.dial} {country.name}
            </option>
          ))}
        </select>
        <input
          id={inputId}
          name={name}
          className="phone-input-number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          required={required}
          value={national}
          placeholder={phonePlaceholder(countryCode)}
          onChange={(e) => emit(countryCode, e.target.value)}
          aria-label="Phone number"
        />
      </div>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
