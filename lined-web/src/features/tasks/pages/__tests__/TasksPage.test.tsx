import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { KANBAN_TEST_IDS } from '@/features/tasks/kanban/kanbanConstants';
import { TasksPage } from '../TasksPage';

describe('TasksPage', () => {
  it('renders the Kanban board', () => {
    expect.assertions(1);
    renderWithProviders(<TasksPage />);

    expect(screen.getByTestId(KANBAN_TEST_IDS.loading)).toBeInTheDocument();
  });

  it('shows tasks once the board finishes loading', async () => {
    expect.assertions(1);
    renderWithProviders(<TasksPage />);

    expect(await screen.findByText('Plan dinner for Saturday')).toBeInTheDocument();
  });
});
