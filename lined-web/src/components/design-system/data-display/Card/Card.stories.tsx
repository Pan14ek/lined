import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '.';
import { Button } from '../../actions/Button';

const meta = {
  title: 'Design System/Data Display/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Generic surface/container for grouping related content. A domain-specific ' +
          'card (lobby/task/plan) remains feature-owned and composes this `Card`.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['plain', 'outlined', 'elevated', 'interactive'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
  },
  render: (args) => (
    <Card {...args} style={{ width: 360 }}>
      <CardHeader>
        <CardTitle>Weekend getaway</CardTitle>
        <CardDescription>Couple lobby · 3 members</CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost">
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>Next event: Saturday brunch at 10:00.</CardContent>
      <CardFooter>
        <Button size="sm" fullWidth>
          Open lobby
        </Button>
      </CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = { args: { variant: 'plain' } };
export const Outlined: Story = { args: { variant: 'outlined' } };
export const Elevated: Story = { args: { variant: 'elevated' } };
export const Interactive: Story = { args: { variant: 'interactive' } };

export const NoPadding: Story = { args: { padding: 'none' } };
export const SmallPadding: Story = { args: { padding: 'sm' } };
export const LargePadding: Story = { args: { padding: 'lg' } };
