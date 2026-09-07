import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mail, Search } from 'lucide-react';
import { TextField, type TextFieldProps } from '.';

const Controlled = (args: TextFieldProps) => {
  const [value, setValue] = useState(args.value);
  return <TextField {...args} value={value} onValueChange={setValue} />;
};

const meta = {
  title: 'Design System/Forms/TextField',
  component: TextField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Canonical single-line text-like control. Use for any labeled single-line input. ' +
          'Do not use for multi-line input (`Textarea`) or a fixed option set (`Select`).',
      },
    },
  },
  render: (args) => <Controlled {...args} />,
  args: {
    label: 'Email',
    value: '',
    onValueChange: () => {},
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Placeholder: Story = { args: { label: 'Email', placeholder: 'you@example.com', value: '' } };
export const Filled: Story = { args: { value: 'ada@lined.app' } };
export const Disabled: Story = { args: { value: 'ada@lined.app', disabled: true } };
export const Required: Story = { args: { required: true } };
export const Error: Story = { args: { value: 'not-an-email', error: 'Enter a valid email address' } };
export const Description: Story = { args: { description: "We'll only use this to sign you in" } };
export const Icon: Story = { args: { leadingIcon: <Mail />, label: 'Email' } };
export const Password: Story = { args: { type: 'password', label: 'Password', value: 'hunter2' } };
export const Date: Story = { args: { type: 'date', label: 'Event date', value: '2026-01-01' } };
export const Search_: Story = {
  name: 'Search icon',
  args: { leadingIcon: <Search />, label: 'Search', placeholder: 'Search lobbies…' },
};
