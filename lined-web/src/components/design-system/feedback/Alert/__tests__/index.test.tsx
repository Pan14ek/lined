import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { Alert } from '..';

describe('Alert', () => {
  it('renders as an alert role with the message', () => {
    expect.assertions(1);
    renderWithProviders(<Alert>Something went wrong</Alert>);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('renders the title separately from the message', () => {
    expect.assertions(2);
    renderWithProviders(<Alert title="Heads up">Your session will expire soon</Alert>);

    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Your session will expire soon')).toBeInTheDocument();
  });

  it('renders no icon when icon is explicitly null', () => {
    expect.assertions(1);
    renderWithProviders(<Alert icon={null}>No icon here</Alert>);

    expect(screen.getByRole('alert').querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders the action', () => {
    expect.assertions(1);
    renderWithProviders(
      <Alert action={<button type="button">Retry</button>}>Failed to load</Alert>,
    );

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
