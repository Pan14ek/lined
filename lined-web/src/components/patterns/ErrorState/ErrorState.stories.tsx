import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorState } from '.';

const meta = {
  title: 'Patterns/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Standard failed-data-fetch placeholder with a recovery action. Use `EmptyState` ' +
          'for a successfully loaded but empty list.',
      },
    },
  },
  args: { onRetry: () => {} },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CustomTitle: Story = { args: { title: 'Could not load tasks' } };
export const WithDescription: Story = {
  args: { title: 'Could not load tasks', description: 'Check your connection and try again' },
};
export const CustomAction: Story = {
  args: { onRetry: undefined, action: { label: 'Go back', onClick: () => {} } },
};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
