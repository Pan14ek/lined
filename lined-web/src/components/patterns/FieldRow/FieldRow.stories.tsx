import type { Meta, StoryObj } from '@storybook/react-vite';
import { FieldRow } from '.';
import { Switch } from '../../design-system/forms/Switch';

const meta = {
  title: 'Patterns/FieldRow',
  component: FieldRow,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Label (+ description) on one side and a control on the other — the ' +
          'settings-row layout used across Profile/Notifications/Appearance settings.',
      },
    },
  },
  args: {
    label: 'Email notifications',
    description: 'Get notified by email when someone invites you to a lobby',
    children: <Switch checked aria-label="Email notifications" onCheckedChange={() => {}} />,
  },
} satisfies Meta<typeof FieldRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Responsive: Story = { args: { orientation: 'responsive' } };
export const Horizontal: Story = { args: { orientation: 'horizontal' } };
export const Vertical: Story = { args: { orientation: 'vertical' } };
export const Disabled: Story = { args: { disabled: true } };
