import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { Sheet } from '..';

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    expect.assertions(1);
    renderWithProviders(
      <Sheet open={false} onOpenChange={vi.fn()} title="Task details">
        Body
      </Sheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the title, body and footer when open', () => {
    expect.assertions(3);
    renderWithProviders(
      <Sheet open onOpenChange={vi.fn()} title="Task details" footer={<button type="button">Save</button>}>
        Task form
      </Sheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Task details' })).toBeInTheDocument();
    expect(screen.getByText('Task form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
