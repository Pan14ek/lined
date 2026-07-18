import { useState } from 'react';

export const useFormState = <T extends object>(initialValues: T, validate: (values: T) => Partial<Record<keyof T, string>>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const errors = validate(values);

  const set = <K extends keyof T>(key: K, value: T[K]) => {
        setValues((prev) => ({ ...prev, [key]: value }));
      }

  const markTouched = (key: keyof T) => {
        setTouched((prev) => ({ ...prev, [key]: true }));
      }

  const markAllTouched = () => {
        const all = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {} as Partial<Record<keyof T, boolean>>,
        );
        setTouched(all);
      }

  return {
    values,
    errors,
    touched,
    set,
    markTouched,
    markAllTouched,
    hasErrors: Object.keys(errors).length > 0,
  };
}
