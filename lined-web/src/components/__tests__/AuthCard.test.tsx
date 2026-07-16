import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthCard } from '../AuthCard';

describe('AuthCard', () => {
  it('renders the logo, tagline, heading, and subheading', () => {
    expect.assertions(4);
    render(
      <AuthCard heading="Welcome back" subheading="Sign in to your Lined account">
        <div>form content</div>
      </AuthCard>,
    );

    expect(screen.getByText('Lined')).toBeInTheDocument();
    expect(screen.getByText('Where life and quality time meet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to your Lined account')).toBeInTheDocument();
  });

  it('renders its children', () => {
    expect.assertions(1);
    render(
      <AuthCard heading="Create your account" subheading="Join Lined">
        <div>form content</div>
      </AuthCard>,
    );

    expect(screen.getByText('form content')).toBeInTheDocument();
  });
});
