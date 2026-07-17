import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { MOCK_USERS } from '@/test/data';
import { AssigneePicker } from '../AssigneePicker';

const members = [MOCK_USERS[0]!, MOCK_USERS[1]!]; // alex_johnson, nastia_k

describe('AssigneePicker', () => {
  it('renders one option per member plus Unassigned', () => {
    expect.assertions(3);
    renderWithProviders(
      <AssigneePicker members={members} selectedId={undefined} onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('radio', { name: 'Unassigned' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'alex_johnson' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'nastia_k' })).toBeInTheDocument();
  });

  it('calls onSelect with the member id when a member is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <AssigneePicker members={members} selectedId={undefined} onSelect={onSelect} />,
    );

    await user.click(screen.getByRole('radio', { name: 'nastia_k' }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('calls onSelect with undefined when Unassigned is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <AssigneePicker members={members} selectedId={1} onSelect={onSelect} />,
    );

    await user.click(screen.getByRole('radio', { name: 'Unassigned' }));

    expect(onSelect).toHaveBeenCalledWith(undefined);
  });

  it('marks the selected member as checked and others as unchecked', () => {
    expect.assertions(3);
    renderWithProviders(
      <AssigneePicker members={members} selectedId={1} onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('radio', { name: 'alex_johnson' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'nastia_k' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('radio', { name: 'Unassigned' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('shows a loading skeleton instead of options when isLoading is true', () => {
    expect.assertions(2);
    renderWithProviders(
      <AssigneePicker members={members} selectedId={undefined} onSelect={vi.fn()} isLoading />,
    );

    expect(screen.getByTestId('assignee-picker-loading')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Unassigned' })).not.toBeInTheDocument();
  });

  it('renders only the Unassigned option when there are no members', () => {
    expect.assertions(2);
    renderWithProviders(<AssigneePicker members={[]} selectedId={undefined} onSelect={vi.fn()} />);

    expect(screen.getByRole('radio', { name: 'Unassigned' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });
});
