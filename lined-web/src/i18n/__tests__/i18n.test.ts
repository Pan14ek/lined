import { describe, it, expect } from 'vitest';
import en from '../locales/en';
import uk from '../locales/uk';
import { NAMESPACES } from '../index';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// CLDR plural suffixes (i18next convention): a locale may define more of
// these than another (Ukrainian has one/few/many/other, English only
// one/other) — that's expected, not a missing-translation bug, so we
// compare base keys with any trailing plural suffix stripped off.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

const collectKeys = (value: JsonValue, prefix = ''): string[] => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix.replace(PLURAL_SUFFIX, '')];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    collectKeys(child, prefix ? `${prefix}.${key}` : key),
  );
};

describe('i18n resource parity', () => {
  it.each(NAMESPACES)('uk/%s.json has exactly the same keys as en/%s.json', (namespace) => {
    expect.assertions(2);
    const enKeys = new Set(collectKeys(en[namespace]));
    const ukKeys = new Set(collectKeys(uk[namespace]));

    const missingInUk = [...enKeys].filter((key) => !ukKeys.has(key));
    const missingInEn = [...ukKeys].filter((key) => !enKeys.has(key));

    expect(missingInUk).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('every namespace listed in NAMESPACES has a non-empty en resource', () => {
    expect.assertions(NAMESPACES.length);
    for (const namespace of NAMESPACES) {
      expect(Object.keys(en[namespace]).length).toBeGreaterThan(0);
    }
  });
});
