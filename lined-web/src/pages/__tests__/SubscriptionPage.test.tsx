import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { MOCK_USERS } from '@/test/data';
import { useAuthStore } from '@/store/auth';
import { SubscriptionPage } from '../SubscriptionPage';

const user = MOCK_USERS[0]!;

describe('SubscriptionPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: user.id });
  });

  it('renders the current plan, available plans, and history sections', async () => {
    expect.assertions(4);
    renderWithProviders(<SubscriptionPage />);

    expect(await screen.findByText('Renews 28 Apr 2026')).toBeInTheDocument();
    expect(await screen.findByText('CURRENT')).toBeInTheDocument();
    expect(await screen.findByText('Family')).toBeInTheDocument();
    expect(await screen.findByText('ENDED')).toBeInTheDocument();
  });
});
