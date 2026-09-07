import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sheet, type SheetProps } from '.';
import { Button } from '../../actions/Button';

const WithTrigger = (args: SheetProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open sheet</Button>
      <Sheet {...args} open={open} onOpenChange={setOpen} />
    </>
  );
};

const meta = {
  title: 'Design System/Overlays/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Side-anchored panel (drawer) for a focused task without leaving the page context. ' +
          'Use `Dialog` for a centered modal workflow.',
      },
    },
  },
  render: (args) => <WithTrigger {...args} />,
  args: { open: false, onOpenChange: () => {}, title: 'Task details', children: 'Task form goes here.' },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = { args: { side: 'right' } };
export const Left: Story = { args: { side: 'left' } };
export const Top: Story = { args: { side: 'top' } };
export const Bottom: Story = { args: { side: 'bottom' } };

export const WithFooter: Story = { args: { footer: <Button fullWidth>Save changes</Button> } };
