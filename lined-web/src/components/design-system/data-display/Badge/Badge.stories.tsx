import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '.';

const meta = {
  title: 'Design System/Data Display/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Generic short metadata/status pill. Has no domain knowledge — ' +
          'a domain status maps to `tone` via a feature-owned wrapper (e.g. `TaskStatusBadge`).',
      },
    },
  },
  argTypes: {
    tone: { control: 'select', options: ['neutral', 'brand', 'success', 'warning', 'danger', 'info'] },
    variant: { control: 'select', options: ['soft', 'solid', 'outline'] },
    size: { control: 'select', options: ['sm', 'md'] },
  },
  args: { children: 'Label' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: 'neutral' } };
export const Brand: Story = { args: { tone: 'brand' } };
export const Success: Story = { args: { tone: 'success' } };
export const Warning: Story = { args: { tone: 'warning' } };
export const Danger: Story = { args: { tone: 'danger' } };
export const Info: Story = { args: { tone: 'info' } };

export const Soft: Story = { args: { variant: 'soft' } };
export const Solid: Story = { args: { variant: 'solid' } };
export const Outline: Story = { args: { variant: 'outline' } };

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
