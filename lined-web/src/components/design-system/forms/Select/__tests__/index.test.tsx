import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { Select } from '..';

const options = [
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
];

describe('Select', () => {
  it('shows the label and the placeholder when no value is selected', () => {
    expect.assertions(2);
    renderWithProviders(
      <Select label="Lobby type" value={undefined} onValueChange={vi.fn()} options={options} placeholder="Choose a type" />,
    );

    expect(screen.getByText('Lobby type')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Lobby type' })).toHaveTextContent('Choose a type');
  });

  it('opens the popup and calls onValueChange when an option is chosen', async () => {
    expect.assertions(1);
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Select label="Lobby type" value={undefined} onValueChange={onValueChange} options={options} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Lobby type' }));
    await user.click(await screen.findByRole('option', { name: 'Family' }));

    expect(onValueChange).toHaveBeenCalledWith('family');
  });

  it('renders the selected option label and disables interaction when disabled', () => {
    expect.assertions(2);
    renderWithProviders(
      <Select label="Lobby type" value="couple" onValueChange={vi.fn()} options={options} disabled />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Lobby type' });
    expect(trigger).toHaveTextContent('Couple');
    expect(trigger).toBeDisabled();
  });
});
