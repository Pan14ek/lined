import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from '.';

const meta = {
  title: 'Design System/Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Pulsing placeholder block for content that is still loading.',
      },
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextLine: Story = { render: () => <Skeleton className="h-4 w-48" /> };
export const Avatar: Story = { render: () => <Skeleton className="size-10 rounded-full" /> };
export const Card: Story = {
  render: () => (
    <div className="flex flex-col gap-2" style={{ width: 240 }}>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};
