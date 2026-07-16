import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders the "To Do" label for TODO', () => {
    expect.assertions(1);
    render(<StatusBadge status="TODO" />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('renders the "In Progress" label for IN_PROGRESS', () => {
    expect.assertions(1);
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders the "Done" label for DONE', () => {
    expect.assertions(1);
    render(<StatusBadge status="DONE" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
