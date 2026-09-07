import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { FieldRow } from '..';

describe('FieldRow', () => {
  it('renders the label, description, and control', () => {
    expect.assertions(3);
    renderWithProviders(
      <FieldRow label="Email notifications" description="Get notified by email">
        <button type="button">Toggle</button>
      </FieldRow>,
    );

    expect(screen.getByText('Email notifications')).toBeInTheDocument();
    expect(screen.getByText('Get notified by email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('mutes the label text when disabled', () => {
    expect.assertions(1);
    renderWithProviders(
      <FieldRow label="Email notifications" disabled>
        <button type="button">Toggle</button>
      </FieldRow>,
    );

    expect(screen.getByText('Email notifications')).toHaveClass('text-muted-foreground');
  });
});
