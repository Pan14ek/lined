import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen } from '@/test/utils';
import { RequireAuth, RedirectIfAuthed } from '../RequireAuth';
import { useAuthStore } from '@/store/auth';

describe('RequireAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: null });
  });

  it('redirects to /sign-in when signed out', () => {
    expect.assertions(1);
    renderWithProviders(
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<div>Protected Page</div>} />
        </Route>
        <Route path="/sign-in" element={<div>Sign In Page</div>} />
      </Routes>,
      { initialEntries: ['/'] },
    );

    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
  });

  it('renders the protected route when signed in', () => {
    expect.assertions(1);
    useAuthStore.setState({ userId: 1 });
    renderWithProviders(
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<div>Protected Page</div>} />
        </Route>
        <Route path="/sign-in" element={<div>Sign In Page</div>} />
      </Routes>,
      { initialEntries: ['/'] },
    );

    expect(screen.getByText('Protected Page')).toBeInTheDocument();
  });
});

describe('RedirectIfAuthed', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: null });
  });

  it('redirects home when already signed in', () => {
    expect.assertions(1);
    useAuthStore.setState({ userId: 1 });
    renderWithProviders(
      <Routes>
        <Route
          path="/sign-in"
          element={
            <RedirectIfAuthed>
              <div>Sign In Page</div>
            </RedirectIfAuthed>
          }
        />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>,
      { initialEntries: ['/sign-in'] },
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders the auth page when signed out', () => {
    expect.assertions(1);
    renderWithProviders(
      <Routes>
        <Route
          path="/sign-in"
          element={
            <RedirectIfAuthed>
              <div>Sign In Page</div>
            </RedirectIfAuthed>
          }
        />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>,
      { initialEntries: ['/sign-in'] },
    );

    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
  });
});
