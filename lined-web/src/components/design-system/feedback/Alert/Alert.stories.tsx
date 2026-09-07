import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from '.';

const meta = {
  title: 'Design System/Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inline banner for status/warnings/errors tied to surrounding content. ' +
          'Use `Badge` for a short inline status label instead.',
      },
    },
  },
  argTypes: {
    tone: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
  },
  args: { children: 'Your changes have been saved.' },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = { args: { tone: 'info', children: 'A new version is available.' } };
export const Success: Story = { args: { tone: 'success', children: 'Your changes have been saved.' } };
export const Warning: Story = {
  args: { tone: 'warning', children: 'This event overlaps with another booking.' },
};
export const Danger: Story = { args: { tone: 'danger', children: 'Could not delete this lobby.' } };

export const WithTitle: Story = {
  args: { tone: 'danger', title: 'Something went wrong', children: 'Please try again in a moment.' },
};
export const WithAction: Story = {
  args: {
    tone: 'danger',
    title: 'Failed to load tasks',
    children: 'Check your connection and try again.',
    action: <button type="button" className="text-sm font-medium underline">Retry</button>,
  },
};
