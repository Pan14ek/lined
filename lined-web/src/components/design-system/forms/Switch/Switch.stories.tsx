import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch, type SwitchProps } from '.';

const Controlled = (args: SwitchProps) => {
  const [checked, setChecked] = useState(args.checked);
  return <Switch {...args} checked={checked} onCheckedChange={setChecked} />;
};

const meta = {
  title: 'Design System/Forms/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Low-level boolean on/off toggle. Prefer `SwitchField` when the ' +
          'switch needs a visible label and description.',
      },
    },
  },
  render: (args) => <Controlled {...args} />,
  args: { checked: false, 'aria-label': 'Enable notifications', onCheckedChange: () => {} },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { checked: true } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { disabled: true, checked: true } };
