import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea, type TextareaProps } from '.';

const Controlled = (args: TextareaProps) => {
  const [value, setValue] = useState(args.value);
  return <Textarea {...args} value={value} onValueChange={setValue} />;
};

const meta = {
  title: 'Design System/Forms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Canonical multi-line text control. Use `TextField` for a single line.',
      },
    },
  },
  render: (args) => <Controlled {...args} />,
  args: { label: 'Notes', value: '', onValueChange: () => {} },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Placeholder: Story = { args: { placeholder: 'Add any extra context…' } };
export const Filled: Story = { args: { value: 'Bring snacks and board games.' } };
export const Disabled: Story = { args: { value: 'Bring snacks and board games.', disabled: true } };
export const Error: Story = { args: { error: 'Notes must be under 500 characters' } };
export const Description: Story = { args: { description: 'Visible to everyone in the lobby' } };
export const NoResize: Story = { args: { resize: 'none', rows: 3 } };
