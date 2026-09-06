import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { TaskStatusBadge } from '../TaskStatusBadge';

describe('TaskStatusBadge', () => {
  it('renders the label and status classes for a task status', () => {
    expect.assertions(2);
    renderWithProviders(<TaskStatusBadge status="IN_PROGRESS" />);

    const badge = screen.getByText('In Progress');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-info/10', 'uppercase');
  });

  it('renders provided count content with the compact count variant', () => {
    expect.assertions(2);
    renderWithProviders(<TaskStatusBadge status="DONE" size="count">3</TaskStatusBadge>);

    const badge = screen.getByText('3');
    expect(badge).toHaveClass('text-[11px]', 'bg-success/10');
    expect(badge).not.toHaveClass('uppercase');
  });
});
