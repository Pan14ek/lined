export const locales = {
  english: 'en',
  ukrainian: 'uk',
} as const;

export const texts = {
  english: /English/i,
  ukrainian: /Українська/i,
  ukrainianDateExample: /субота, 18 липня 2026/i,
  ukrainianPreview: /Мої лобі.*Майбутні події.*Мої завдання/,
} as const;

export const testIds = {
  preview: 'language-preview',
} as const;

export const roles = {
  alert: 'alert',
  radio: 'radio',
} as const;

export const api = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
} as const;
