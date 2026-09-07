import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog, type DialogProps } from '.';
import { Button } from '../../actions/Button';

const WithTrigger = (args: DialogProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog {...args} open={open} onOpenChange={setOpen} />
    </>
  );
};

const meta = {
  title: 'Design System/Overlays/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Canonical modal shell. Accessible dialog semantics, focus trap/restoration, ' +
          'escape-to-close and click-outside come from Base UI. Use `ConfirmDialog` for a ' +
          'simple confirm/cancel prompt, `Sheet` for a side-anchored panel.',
      },
    },
  },
  render: (args) => <WithTrigger {...args} />,
  args: {
    open: false,
    onOpenChange: () => {},
    title: 'Create event',
    children: 'Event form goes here.',
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };

export const WithDescription: Story = {
  args: { description: 'Add a new event to this lobby’s calendar.' },
};

export const WithFooter: Story = {
  args: {
    footer: (
      <>
        <Button variant="secondary">Cancel</Button>
        <Button>Create</Button>
      </>
    ),
  },
};

export const LongContent: Story = {
  args: {
    scrollableContent: true,
    children: Array.from({ length: 20 }).map((_, i) => <p key={i}>Line {i + 1} of a long form.</p>),
  },
};

export const ResponsiveFullscreenMobile: Story = {
  name: 'Responsive: fullscreen on mobile',
  args: { responsive: 'fullscreen-mobile' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
