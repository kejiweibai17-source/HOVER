"use client";

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

  if (type === "date") {
    return (
      <div className="relative pb-1">
        <label
          htmlFor={fieldId}
          className="mb-1 block text-[12px] text-[#888]"
        >
          {label}
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

  return (
    <div className="relative pb-1">
      <input
        id={fieldId}
        name={name}
        type={type}
        placeholder={label}
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
      />
    </div>
  );
}

/** Login account field: accepts email or Taiwan mobile */
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
        type="text"
        placeholder="信箱或手機號碼"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        autoComplete="username email tel"
        inputMode="email"
        className={inputClass}
      />
    </div>
  );
}
