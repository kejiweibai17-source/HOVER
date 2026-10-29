"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";

const inputClass =
  "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none transition-colors focus:border-black disabled:opacity-50 disabled:cursor-not-allowed";

/** 註冊／會員生日：須年滿此歲數（對應 max 日期） */
export const BIRTHDAY_MIN_AGE = 13;
/** 可選最早出生年 */
export const BIRTHDAY_MIN_YEAR = 1920;

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

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

function toISO(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function displaySlash(iso) {
  const p = parseISODate(iso);
  if (!p.year || !p.month || !p.day) return "";
  return `${p.year}/${p.month}/${p.day}`;
}

function clampISO(iso, maxISO) {
  if (!iso) return "";
  return iso > maxISO ? maxISO : iso;
}

/**
 * 生日選擇：日曆彈層（圖二樣式）
 * 年份下拉維持完整可選（maxYear → 1920）
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
  /** @deprecated 日曆樣式不再使用下拉 class，保留相容 */
  selectClassName: _selectClassName,
}) {
  const maxISO = maxBirthDateISO();
  const maxParts = parseISODate(maxISO);
  const maxYear =
    Number(maxParts.year) || new Date().getFullYear() - BIRTHDAY_MIN_AGE;
  const maxMonth = Number(maxParts.month) || 12;
  const parts = parseISODate(value);

  const years = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= BIRTHDAY_MIN_YEAR; y -= 1) list.push(y);
    return list;
  }, [maxYear]);

  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    () => Number(parts.year) || maxYear,
  );
  const [viewMonth, setViewMonth] = useState(
    () => Number(parts.month) || maxMonth,
  );

  useEffect(() => {
    if (!open) return;
    const p = parseISODate(value);
    setViewYear(Number(p.year) || maxYear);
    setViewMonth(Number(p.month) || maxMonth);
    setHeaderOpen(false);
  }, [open, value, maxYear, maxMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        setHeaderOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setHeaderOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const canGoPrev = viewYear > BIRTHDAY_MIN_YEAR || viewMonth > 1;
  const canGoNext =
    viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);

  const shiftMonth = (delta) => {
    let y = viewYear;
    let m = viewMonth + delta;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    if (y < BIRTHDAY_MIN_YEAR) return;
    if (y > maxYear || (y === maxYear && m > maxMonth)) return;
    setViewYear(y);
    setViewMonth(m);
  };

  const cells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
    const dim = daysInMonth(viewYear, viewMonth);
    const prevDim = daysInMonth(
      viewMonth === 1 ? viewYear - 1 : viewYear,
      viewMonth === 1 ? 12 : viewMonth - 1,
    );
    const list = [];
    for (let i = 0; i < firstDow; i += 1) {
      list.push({
        day: prevDim - firstDow + 1 + i,
        inMonth: false,
        iso: "",
      });
    }
    for (let d = 1; d <= dim; d += 1) {
      const iso = toISO(viewYear, viewMonth, d);
      list.push({ day: d, inMonth: true, iso });
    }
    let trailing = 1;
    while (list.length % 7 !== 0) {
      list.push({
        day: trailing,
        inMonth: false,
        iso: "",
      });
      trailing += 1;
    }
    return list;
  }, [viewYear, viewMonth]);

  const isDisabledDay = (iso) => {
    if (!iso) return true;
    if (iso > maxISO) return true;
    const y = Number(iso.slice(0, 4));
    return y < BIRTHDAY_MIN_YEAR;
  };

  const pickDay = (iso) => {
    if (!onChange || isDisabledDay(iso)) return;
    onChange(clampISO(iso, maxISO));
    setOpen(false);
    setHeaderOpen(false);
  };

  const clear = () => {
    onChange?.("");
    setOpen(false);
    setHeaderOpen(false);
  };

  const goToday = () => {
    // 生日不可選「今天」本體；改為跳到／選取最晚可選日（年滿 13）
    onChange?.(maxISO);
    setViewYear(maxYear);
    setViewMonth(maxMonth);
    setOpen(false);
    setHeaderOpen(false);
  };

  const display = displaySlash(value);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-required={required || undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className="flex w-full items-center gap-2 border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-left outline-none transition-colors focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={`min-w-0 flex-1 text-[14px] ${
            display ? "text-black" : "text-[#aaa]"
          }`}
        >
          {display || "選擇日期"}
        </span>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[#ccc] text-black">
          <Calendar size={15} strokeWidth={1.75} />
        </span>
      </button>

      <input type="hidden" name={name} value={value || ""} readOnly />

      {open ? (
        <div
          role="dialog"
          aria-label="選擇生日"
          className="absolute left-0 right-0 z-50 mt-2 w-full min-w-[280px] border border-[#ddd] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setHeaderOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[14px] font-medium text-black hover:opacity-70"
            >
              {viewYear}年{viewMonth}月
              <ChevronDown
                size={14}
                className={`transition-transform ${headerOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label="上個月"
                disabled={!canGoPrev}
                onClick={() => shiftMonth(-1)}
                className="p-1.5 text-black disabled:opacity-30"
              >
                <ChevronUp size={16} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label="下個月"
                disabled={!canGoNext}
                onClick={() => shiftMonth(1)}
                className="p-1.5 text-black disabled:opacity-30"
              >
                <ChevronDown size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {headerOpen ? (
            <div className="mb-3 grid grid-cols-2 gap-2 border border-[#eee] bg-[#fafafa] p-2">
              <label className="block">
                <span className="mb-1 block px-1 text-[11px] text-[#888]">
                  年份（{BIRTHDAY_MIN_YEAR}–{maxYear}）
                </span>
                <select
                  value={viewYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setViewYear(y);
                    if (y === maxYear && viewMonth > maxMonth) {
                      setViewMonth(maxMonth);
                    }
                  }}
                  className="w-full border border-[#ddd] bg-white px-2 py-2 text-[13px] text-black outline-none"
                  aria-label="選擇年份"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}年
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block px-1 text-[11px] text-[#888]">
                  月份
                </span>
                <select
                  value={viewMonth}
                  onChange={(e) => {
                    setViewMonth(Number(e.target.value));
                  }}
                  className="w-full border border-[#ddd] bg-white px-2 py-2 text-[13px] text-black outline-none"
                  aria-label="選擇月份"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1)
                    .filter((m) => viewYear < maxYear || m <= maxMonth)
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}月
                      </option>
                    ))}
                </select>
              </label>
              <div className="col-span-2 flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setHeaderOpen(false)}
                  className="text-[12px] font-medium text-[#1a73e8] hover:underline"
                >
                  完成
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="py-1 text-[11px] font-medium text-[#888]"
              >
                {w}
              </div>
            ))}
            {cells.map((cell, idx) => {
              const selected = cell.inMonth && cell.iso && cell.iso === value;
              const disabledDay =
                !cell.inMonth || isDisabledDay(cell.iso);
              return (
                <button
                  key={`${cell.inMonth}-${cell.day}-${idx}`}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => pickDay(cell.iso)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center text-[13px] transition-colors ${
                    selected
                      ? "bg-[#1a73e8] font-medium text-white"
                      : disabledDay
                        ? "cursor-default text-[#ccc]"
                        : "text-black hover:bg-[#e8f0fe]"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#eee] pt-2">
            <button
              type="button"
              onClick={clear}
              className="text-[13px] font-medium text-[#1a73e8] hover:underline"
            >
              清除
            </button>
            <button
              type="button"
              onClick={goToday}
              className="text-[13px] font-medium text-[#1a73e8] hover:underline"
              title="選取最晚可選日期（年滿 13 歲）"
            >
              今天
            </button>
          </div>
        </div>
      ) : null}
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
