interface MockEnv {
  prod: boolean;
  enableMsw: boolean;
  useMocks: boolean;
}

/**
 * Refuses to boot a production build configured to serve mock data — a
 * misconfigured deploy must fail loudly rather than silently ship fake
 * responses (and the security behavior mocks don't reproduce) to real users.
 */
export const assertMocksDisabledInProduction = (env: MockEnv): void => {
  if (env.prod && (env.enableMsw || env.useMocks)) {
    throw new Error(
      'Refusing to start: VITE_ENABLE_MSW/VITE_USE_MOCKS must not be enabled in a production build.',
    );
  }
}
