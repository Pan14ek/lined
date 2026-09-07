import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '..';

describe('DropdownMenu', () => {
  it('opens the menu and shows its items when the trigger is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it('calls onClick when an item is selected', async () => {
    expect.assertions(1);
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onSelect}>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
