'use client';

import React from 'react';
import { Controller, useFormContext, type Control, type FieldError, type FieldPath, type FieldValues } from 'react-hook-form';

export interface FormFieldRenderProps<Value> {
  name: string;
  value: Value;
  onChange: (value: Value | React.ChangeEvent<HTMLElement>) => void;
  onBlur: () => void;
  /** Callback ref, assignable to any field element (input, select, textarea, button). */
  ref: React.RefCallback<HTMLElement>;
  /** The zod message of the field, ready for the field component's `error` prop. */
  error?: string;
  disabled?: boolean;
}

export interface FormFieldProps<T extends FieldValues, Name extends FieldPath<T>> {
  name: Name;
  /** Only needed outside a `Form` (no provider in scope). */
  control?: Control<T>;
  /** Renders a lib field with the wired props, e.g. `({ error, ...field }) => <EmailField {...field} error={error} />`. */
  render: (field: FormFieldRenderProps<T[Name]>) => React.ReactElement;
}

/** First message of a react-hook-form error (nested errors report their root message). */
export function fieldErrorMessage(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  if (typeof error.message === 'string' && error.message) return error.message;
  const nested = Object.values(error).find((entry) => entry && typeof entry === 'object' && 'message' in entry) as FieldError | undefined;
  return nested?.message as string | undefined;
}

/**
 * Binds one lib field to a form value (MAIR-608): value, change, blur, ref and
 * the zod error message, so the field renders exactly as in Figma without
 * knowing react-hook-form.
 */
export function FormField<T extends FieldValues, Name extends FieldPath<T>>({ name, control, render }: FormFieldProps<T, Name>) {
  const context = useFormContext<T>();
  return (
    <Controller
      name={name}
      control={control ?? context.control}
      render={({ field, fieldState }) => render({
        name: field.name,
        value: field.value,
        onChange: field.onChange,
        onBlur: field.onBlur,
        ref: field.ref,
        disabled: field.disabled,
        error: fieldErrorMessage(fieldState.error),
      })}
    />
  );
}
