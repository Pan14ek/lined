import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '..';

describe('Tabs', () => {
  it('shows the default tab content', () => {
    expect.assertions(2);
    renderWithProviders(
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">Calendar view</TabsContent>
        <TabsContent value="tasks">Tasks view</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('Calendar view')).toBeVisible();
    expect(screen.queryByText('Tasks view')).not.toBeInTheDocument();
  });

  it('switches content when a different tab is selected', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(
      <Tabs defaultValue="calendar" onValueChange={vi.fn()}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">Calendar view</TabsContent>
        <TabsContent value="tasks">Tasks view</TabsContent>
      </Tabs>,
    );

    await user.click(screen.getByRole('tab', { name: 'Tasks' }));

    expect(screen.getByText('Tasks view')).toBeVisible();
  });
});
