import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SwitchField, type SwitchFieldProps } from '.';

const Controlled = (args: SwitchFieldProps) => {
  const [checked, setChecked] = useState(args.checked);
  return <SwitchField {...args} checked={checked} onCheckedChange={setChecked} />;
};

const meta = {
  title: 'Patterns/SwitchField',
  component: SwitchField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Label + description + switch composition for a settings row. Replaces the ' +
          'previous feature-local `ToggleRow`.',
      },
    },
  },
  render: (args) => <Controlled {...args} />,
  args: {
    label: 'Email notifications',
    description: 'Get notified by email',
    checked: true,
    onCheckedChange: () => {},
  },
} satisfies Meta<typeof SwitchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checked: Story = {};
export const Unchecked: Story = { args: { checked: false } };
export const Disabled: Story = { args: { disabled: true } };
export const NoDescription: Story = { args: { description: undefined } };
