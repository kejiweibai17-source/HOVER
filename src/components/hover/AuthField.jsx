"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const inputClass =
  "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none transition-colors focus:border-black disabled:opacity-50 disabled:cursor-not-allowed";

const dateInputClass =
  "w-full cursor-pointer border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black outline-none transition-colors focus:border-black disabled:opacity-50 disabled:cursor-not-allowed [color-scheme:light]";

/** Max birth date: must be at least 13 years old */
function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d.toISOString().split("T")[0];
}

function PasswordToggleButton({ visible, onToggle }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      className="absolute right-0 top-1/2 z-10 -translate-y-1/2 p-1 text-[#888] transition-colors hover:text-black"
      aria-label={visible ? "隱藏密碼" : "顯示密碼"}
    >
      {visible ? (
        <EyeOff size={18} strokeWidth={1.5} />
      ) : (
        <Eye size={18} strokeWidth={1.5} />
      )}
    </button>
  );
}

/**
 * 通用密碼欄位（含眼睛開關）
 * valueMode="string"：onChange(value: string)
 * valueMode="event"（預設）：onChange(e)
 */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  className = "",
  inputClassName = inputClass,
  disabled,
  required,
  autoComplete,
  name,
  id,
  readOnly,
  onKeyDown,
  valueMode = "event",
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          if (!onChange) return;
          if (valueMode === "string") onChange(e.target.value);
          else onChange(e);
        }}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        readOnly={readOnly}
        onKeyDown={onKeyDown}
        className={`${inputClassName} pr-9`}
      />
      <PasswordToggleButton
        visible={visible}
        onToggle={() => setVisible((v) => !v)}
      />
    </div>
  );
}

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  disabled,
  required,
  autoComplete,
  inputMode,
  pattern,
  minLength,
  maxLength,
  name,
  id,
}) {
  const fieldId = id || name || label.replace(/\s/g, "-");
  const displayLabel = required ? `${label} *` : label;

  if (type === "date") {
    return (
      <div className="relative pb-1">
        <label
          htmlFor={fieldId}
          className="mb-1 block text-[12px] text-[#888]"
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-[#c90000]" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        <input
          id={fieldId}
          name={name}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete || "bday"}
          min="1920-01-01"
          max={maxBirthDate()}
          className={dateInputClass}
        />
      </div>
    );
  }

  if (type === "password") {
    return (
      <div className="pb-1">
        <PasswordInput
          id={fieldId}
          name={name}
          placeholder={displayLabel}
          value={value}
          onChange={onChange}
          valueMode="string"
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          inputClassName={inputClass}
        />
      </div>
    );
  }

  return (
    <div className="relative pb-1">
      <input
        id={fieldId}
        name={name}
        type={type}
        placeholder={displayLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        minLength={minLength}
        maxLength={maxLength}
        className={inputClass}
        aria-required={required || undefined}
      />
    </div>
  );
}

/** Login account field: Taiwan mobile (primary) */
export function AuthAccountField({
  value,
  onChange,
  disabled,
  required,
}) {
  return (
    <div className="relative pb-1">
      <input
        id="login-account"
        name="username"
        type="tel"
        placeholder={required ? "手機號碼 *" : "手機號碼"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        autoComplete="tel"
        inputMode="tel"
        pattern="09[0-9]{8}"
        maxLength={10}
        className={inputClass}
        aria-required={required || undefined}
      />
    </div>
  );
}
