import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select, type SelectProps } from '.';

const options = [
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
  { value: 'work', label: 'Work', disabled: true },
];

const Controlled = (args: SelectProps<string>) => {
  const [value, setValue] = useState(args.value);
  return <Select {...args} value={value} onValueChange={setValue} />;
};

const meta = {
  title: 'Design System/Forms/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Canonical control for choosing one value from a fixed, known set of options. ' +
          'For 2-4 highly visible options prefer a segmented control.',
      },
    },
  },
  render: (args) => <Controlled {...args} />,
  args: {
    label: 'Lobby type',
    value: undefined,
    onValueChange: () => {},
    options,
    placeholder: 'Choose a type',
  },
} satisfies Meta<typeof Select<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { value: 'family' } };
export const Disabled: Story = { args: { value: 'family', disabled: true } };
export const Error: Story = { args: { error: 'Choose a lobby type' } };
export const Description: Story = { args: { description: 'Determines the accent color and default icons' } };
export const WithDisabledOption: Story = { name: 'With a disabled option', args: {} };
