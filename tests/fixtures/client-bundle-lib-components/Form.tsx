'use client';

import React from 'react';
import { FormProvider, useForm, type FieldValues, type SubmitHandler, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

export interface FormProps<T extends FieldValues> extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** The form returned by `useZodForm` (or `useForm`). */
  form: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  children: React.ReactNode;
}

/**
 * A react-hook-form `FormProvider` around a native form (MAIR-608). Validation
 * runs through the zod schema of `useZodForm`; browser validation bubbles are
 * disabled so that every message goes through the fields' `error` prop.
 */
export function Form<T extends FieldValues>({ form, onSubmit, children, noValidate = true, ...props }: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form {...props} noValidate={noValidate} onSubmit={form.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  );
}

/** `useForm` with a zod schema as resolver; fields validate once touched, then on every change. */
export function useZodForm<Schema extends z.ZodTypeAny>(schema: Schema, options: Omit<UseFormProps<z.input<Schema>>, 'resolver'> = {}) {
  return useForm<z.input<Schema>>({ mode: 'onTouched', ...options, resolver: zodResolver(schema) });
}
