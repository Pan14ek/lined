import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { LobbyLoadingState, LobbyNotFoundState } from '../LobbyLoadStates';

describe('LobbyLoadingState', () => {
  it('renders the loading skeleton with the given test id', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyLoadingState loadingTestId="lobby-page-loading" />);

    expect(screen.getByTestId('lobby-page-loading')).toBeInTheDocument();
  });

  it('does not render the not-found message', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyLoadingState loadingTestId="lobby-page-loading" />);

    expect(screen.queryByText(/Lobby not found/)).not.toBeInTheDocument();
  });
});

describe('LobbyNotFoundState', () => {
  it('renders the not-found message', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyNotFoundState />);

    expect(screen.getByText(/Lobby not found/)).toBeInTheDocument();
  });
});
