import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '.';

const meta = {
  title: 'Design System/Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Canonical tabbed navigation within a page or panel. Use routed links for ' +
          'top-level app navigation instead.',
      },
    },
  },
  render: () => (
    <Tabs defaultValue="calendar" style={{ width: 320 }}>
      <TabsList>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="members" disabled>
          Members
        </TabsTrigger>
      </TabsList>
      <TabsContent value="calendar">Calendar view content.</TabsContent>
      <TabsContent value="tasks">Tasks view content.</TabsContent>
      <TabsContent value="members">Members view content.</TabsContent>
    </Tabs>
  ),
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
