import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROLES, CREATE_LOBBY_MODAL_TEXT, LOBBY_TYPE_OPTION_NAME } from '@/test/createMenuContent';
import { LobbyTypePicker } from '../LobbyTypePicker';

describe('LobbyTypePicker', () => {
  it('renders all four lobby type options', () => {
    expect.assertions(4);
    render(<LobbyTypePicker value="COUPLE" onChange={vi.fn()} />);

    expect(
      screen.getByRole(ROLES.radio, { name: LOBBY_TYPE_OPTION_NAME.COUPLE }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole(ROLES.radio, { name: LOBBY_TYPE_OPTION_NAME.FAMILY }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole(ROLES.radio, { name: LOBBY_TYPE_OPTION_NAME.FRIENDS }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole(ROLES.radio, { name: LOBBY_TYPE_OPTION_NAME.WORK }),
    ).toBeInTheDocument();
  });

  it('marks the option matching the current value as checked', () => {
    expect.assertions(2);
    render(<LobbyTypePicker value="FAMILY" onChange={vi.fn()} />);

    expect(screen.getByRole(ROLES.radio, { name: LOBBY_TYPE_OPTION_NAME.FAMILY })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole(ROLES.radio, { name: LOBBY_TYPE_OPTION_NAME.COUPLE })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('calls onChange with the clicked lobby type', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LobbyTypePicker value="COUPLE" onChange={onChange} />);

    await user.click(screen.getByRole(ROLES.radio, { name: LOBBY_TYPE_OPTION_NAME.FRIENDS }));

    expect(onChange).toHaveBeenCalledWith('FRIENDS');
  });

  it('renders the options inside an accessible radiogroup', () => {
    expect.assertions(1);
    render(<LobbyTypePicker value="COUPLE" onChange={vi.fn()} />);

    expect(
      screen.getByRole(ROLES.radiogroup, { name: CREATE_LOBBY_MODAL_TEXT.typeFieldLabel }),
    ).toBeInTheDocument();
  });
});
