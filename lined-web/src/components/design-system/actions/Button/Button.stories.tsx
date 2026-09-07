import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '.';

const meta = {
  title: 'Design System/Actions/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Canonical action control for all normal actions and form submissions. ' +
          'Use `primary` for the single main action of a flow. ' +
          'Do not use for normal page navigation (use a link) or icon-only actions (use `IconButton`).',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    children: 'Save changes',
    onClick: () => {},
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Delete lobby' } };
export const Link: Story = { args: { variant: 'link', children: 'Learn more' } };

export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };

export const LeadingIcon: Story = {
  args: { leadingIcon: <Mail />, children: 'Invite by email' },
};
export const TrailingIcon: Story = {
  args: { trailingIcon: <ArrowRight />, children: 'Continue' },
};

export const FullWidth: Story = {
  args: { fullWidth: true },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};
