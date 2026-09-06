import type { Meta, StoryObj } from '@storybook/react-vite';
import { X, Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '.';

const meta = {
  title: 'Design System/Actions/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Icon-only interactive action, e.g. close dialog, overflow menu, dismiss. ' +
          '`aria-label` is mandatory since there is no visible text label.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['ghost', 'secondary', 'destructive'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    icon: <X />,
    'aria-label': 'Close',
    onClick: () => {},
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = { args: { variant: 'ghost' } };
export const Secondary: Story = { args: { variant: 'secondary', icon: <Pencil />, 'aria-label': 'Edit' } };
export const Destructive: Story = {
  args: { variant: 'destructive', icon: <Trash2 />, 'aria-label': 'Delete' },
};

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };

export const Disabled: Story = { args: { disabled: true } };
