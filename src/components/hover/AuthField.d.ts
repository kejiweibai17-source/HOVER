import { InputHTMLAttributes } from "react";

export interface AuthFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  name?: string;
  id?: string;
}

export function AuthField(props: AuthFieldProps): JSX.Element;

export const BIRTHDAY_MIN_AGE: number;
export const BIRTHDAY_MIN_YEAR: number;
export function maxBirthDateISO(): string;

export interface BirthdaySelectProps {
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  selectClassName?: string;
}

export function BirthdaySelect(props: BirthdaySelectProps): JSX.Element;

export interface PasswordInputProps {
  value: string;
  onChange: ((e: React.ChangeEvent<HTMLInputElement>) => void) | ((v: string) => void);
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  name?: string;
  id?: string;
  readOnly?: boolean;
  onKeyDown?: InputHTMLAttributes<HTMLInputElement>["onKeyDown"];
  valueMode?: "event" | "string";
}

export function PasswordInput(props: PasswordInputProps): JSX.Element;

export interface AuthAccountFieldProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function AuthAccountField(props: AuthAccountFieldProps): JSX.Element;
