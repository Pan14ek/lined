import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmDialog, type ConfirmDialogProps } from '.';
import { Button } from '../../design-system/actions/Button';

const WithTrigger = (args: ConfirmDialogProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete lobby
      </Button>
      <ConfirmDialog {...args} open={open} onOpenChange={setOpen} onConfirm={() => setOpen(false)} />
    </>
  );
};

const meta = {
  title: 'Patterns/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'High-level "are you sure?" prompt built on `Dialog` + `Button` + `TextField` + `Alert`. ' +
          'Use `Dialog` directly for a full multi-field workflow.',
      },
    },
  },
  render: (args) => <WithTrigger {...args} />,
  args: {
    open: false,
    onOpenChange: () => {},
    title: 'Delete lobby',
    description: 'This will permanently delete the lobby and all of its data. This cannot be undone.',
    confirmLabel: 'Delete lobby',
    tone: 'danger',
    onConfirm: () => {},
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'Could not delete this lobby — please try again' },
};

export const Loading: Story = {
  args: { loading: true },
};

export const WithTypeToConfirm: Story = {
  name: 'With type-to-confirm',
  args: {
    confirmationText: { expected: 'Design Team', label: 'Type "Design Team" to confirm' },
  },
};

export const NonDestructive: Story = {
  args: {
    tone: 'default',
    title: 'Make owner',
    description: 'Make this member the owner of the lobby?',
    confirmLabel: 'Make owner',
  },
};
