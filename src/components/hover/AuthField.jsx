"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const inputClass =
  "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none transition-colors focus:border-black disabled:opacity-50 disabled:cursor-not-allowed";

const selectClass =
  "w-full cursor-pointer appearance-none border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black outline-none transition-colors focus:border-black disabled:opacity-50 disabled:cursor-not-allowed";

/** 註冊／會員生日：須年滿此歲數（對應 max 日期） */
export const BIRTHDAY_MIN_AGE = 13;
/** 可選最早出生年 */
export const BIRTHDAY_MIN_YEAR = 1920;

/** 最晚可選生日（今天往前推 BIRTHDAY_MIN_AGE 年） */
export function maxBirthDateISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - BIRTHDAY_MIN_AGE);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function parseISODate(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { year: "", month: "", day: "" };
  return { year: m[1], month: m[2], day: m[3] };
}

/**
 * 生日選擇：年／月／日下拉（年份由早到晚完整列出，避免原生 date 只顯示到 max 年造成誤解）
 * value / onChange 使用 YYYY-MM-DD
 */
export function BirthdaySelect({
  value = "",
  onChange,
  disabled,
  required,
  id,
  name,
  className = "",
  selectClassName = selectClass,
}) {
  const maxISO = maxBirthDateISO();
  const maxParts = parseISODate(maxISO);
  const maxYear = Number(maxParts.year) || new Date().getFullYear() - BIRTHDAY_MIN_AGE;
  const parts = parseISODate(value);

  const years = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= BIRTHDAY_MIN_YEAR; y -= 1) list.push(y);
    return list;
  }, [maxYear]);

  const yearNum = parts.year ? Number(parts.year) : 0;
  const monthNum = parts.month ? Number(parts.month) : 0;
  const maxDay = daysInMonth(yearNum, monthNum);

  const months = useMemo(() => {
    const list = [];
    const end =
      yearNum && yearNum === maxYear ? Number(maxParts.month) : 12;
    for (let m = 1; m <= end; m += 1) list.push(m);
    return list;
  }, [yearNum, maxYear, maxParts.month]);

  const days = useMemo(() => {
    const list = [];
    let end = maxDay || 31;
    if (
      yearNum &&
      monthNum &&
      yearNum === maxYear &&
      monthNum === Number(maxParts.month)
    ) {
      end = Math.min(end, Number(maxParts.day));
    }
    for (let d = 1; d <= end; d += 1) list.push(d);
    return list;
  }, [maxDay, yearNum, monthNum, maxYear, maxParts.month, maxParts.day]);

  const emit = (nextYear, nextMonth, nextDay) => {
    if (!onChange) return;
    if (!nextYear || !nextMonth || !nextDay) {
      onChange("");
      return;
    }
    const dim = daysInMonth(Number(nextYear), Number(nextMonth));
    let day = Number(nextDay);
    if (day > dim) day = dim;
    // 仍超過 max 則夾住
    const iso = `${nextYear}-${pad2(nextMonth)}-${pad2(day)}`;
    onChange(iso > maxISO ? maxISO : iso);
  };

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      <label className="min-w-0">
        <span className="sr-only">出生年</span>
        <select
          id={id}
          name={name ? `${name}-year` : undefined}
          value={parts.year}
          disabled={disabled}
          required={required}
          className={selectClassName}
          onChange={(e) => {
            const y = e.target.value;
            emit(y, parts.month, parts.day);
          }}
        >
          <option value="">年</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0">
        <span className="sr-only">出生月</span>
        <select
          name={name ? `${name}-month` : undefined}
          value={parts.month}
          disabled={disabled}
          required={required}
          className={selectClassName}
          onChange={(e) => {
            const m = e.target.value;
            emit(parts.year, m, parts.day);
          }}
        >
          <option value="">月</option>
          {months.map((m) => (
            <option key={m} value={pad2(m)}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0">
        <span className="sr-only">出生日</span>
        <select
          name={name ? `${name}-day` : undefined}
          value={parts.day}
          disabled={disabled}
          required={required}
          className={selectClassName}
          onChange={(e) => {
            const d = e.target.value;
            emit(parts.year, parts.month, d);
          }}
        >
          <option value="">日</option>
          {days.map((d) => (
            <option key={d} value={pad2(d)}>
              {d}
            </option>
          ))}
        </select>
      </label>
      {/* 保留隱藏欄位供表單語意／自動填入相容 */}
      <input type="hidden" name={name} value={value || ""} readOnly />
    </div>
  );
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
        <BirthdaySelect
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
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
