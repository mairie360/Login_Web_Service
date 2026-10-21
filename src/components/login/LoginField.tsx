import type React from "react";

export const inputClassName =
  "block w-full rounded-md border border-[var(--mairie-control-border)] bg-[var(--mairie-surface)] p-2 text-sm text-[var(--mairie-text)] placeholder:text-gray-400 shadow-sm outline-none transition focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20";

export interface LoginFieldProps {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  autoComplete: string;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  /** Extra classes on the wrapper (the email field carries the text colour). */
  wrapperClassName?: string;
  /** Wraps the label in a row, ready for a trailing link. */
  labelRow?: boolean;
}

/** Labelled, required field of the sign-in card; the name equals the id. */
export const LoginField = ({ id, label, type, value, autoComplete, disabled, placeholder, onChange, wrapperClassName, labelRow }: LoginFieldProps) => {
  const labelElement: React.ReactNode = (
    <label htmlFor={id} className="text-sm text-[var(--mairie-muted)]">
      {label}
    </label>
  );
  return (
    <div className={`w-full flex flex-col gap-1${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      {labelRow ? <div className="flex justify-between items-center">{labelElement}</div> : labelElement}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        required
        className={inputClassName}
      />
    </div>
  );
};
