import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from '.';

const meta = {
  title: 'Design System/Data Display/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A thin visual divider between sections of content.',
      },
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <p>Section one</p>
      <Separator className="my-3" />
      <p>Section two</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div style={{ display: 'flex', height: 40, alignItems: 'center', gap: 12 }}>
      <span>Left</span>
      <Separator orientation="vertical" />
      <span>Right</span>
    </div>
  ),
};
