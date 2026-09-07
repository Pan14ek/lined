import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { Dialog } from '..';

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    expect.assertions(1);
    renderWithProviders(
      <Dialog open={false} onOpenChange={vi.fn()} title="Create event">
        Body
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the title, description, body and footer when open', () => {
    expect.assertions(4);
    renderWithProviders(
      <Dialog
        open
        onOpenChange={vi.fn()}
        title="Create event"
        description="Add a new event to this lobby"
        footer={<button type="button">Create</button>}
      >
        Event form
      </Dialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Create event' })).toBeInTheDocument();
    expect(screen.getByText('Add a new event to this lobby')).toBeInTheDocument();
    expect(screen.getByText('Event form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('calls onOpenChange when the built-in close button is clicked', async () => {
    expect.assertions(1);
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Dialog open onOpenChange={onOpenChange} title="Create event">
        Body
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
