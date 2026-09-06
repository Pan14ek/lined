import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from '.';

const meta = {
  title: 'Patterns/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    docs: {
      description: {
        component:
          'Standard empty-list placeholder — icon, message, and an optional action. ' +
          'Use `ErrorState` instead for a failed data fetch.',
      },
    },
  },
  args: { title: 'No events yet' },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Card: Story = { args: { variant: 'card', icon: '📅' } };
export const Inline: Story = { args: { variant: 'inline' } };
export const WithDescription: Story = {
  args: { icon: '📅', description: 'Create your first event to get started' },
};
export const WithButtonAction: Story = {
  args: { icon: '👥', title: 'No lobbies yet', action: { label: '+ Create lobby', onClick: () => {} } },
};
export const WithLinkAction: Story = {
  args: { icon: '✅', title: 'No tasks yet', action: { label: 'Invite someone', to: '/lobbies/1' } },
};
export const Small: Story = { args: { size: 'sm', icon: '📅' } };
export const Large: Story = { args: { size: 'lg', icon: '📅' } };
