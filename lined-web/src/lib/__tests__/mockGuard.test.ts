import { describe, it, expect } from 'vitest';
import { assertMocksDisabledInProduction } from '../mockGuard';

describe('assertMocksDisabledInProduction', () => {
  it('throws when MSW is enabled in a production build', () => {
    expect.assertions(1);
    expect(() =>
      assertMocksDisabledInProduction({ prod: true, enableMsw: true, useMocks: false }),
    ).toThrow(/VITE_ENABLE_MSW/);
  });

  it('throws when dev.ts mocks are enabled in a production build', () => {
    expect.assertions(1);
    expect(() =>
      assertMocksDisabledInProduction({ prod: true, enableMsw: false, useMocks: true }),
    ).toThrow(/VITE_USE_MOCKS/);
  });

  it('does not throw in production with both mock flags disabled', () => {
    expect.assertions(1);
    expect(() =>
      assertMocksDisabledInProduction({ prod: true, enableMsw: false, useMocks: false }),
    ).not.toThrow();
  });

  it('does not throw in development even with mocks enabled', () => {
    expect.assertions(1);
    expect(() =>
      assertMocksDisabledInProduction({ prod: false, enableMsw: true, useMocks: true }),
    ).not.toThrow();
  });
});
