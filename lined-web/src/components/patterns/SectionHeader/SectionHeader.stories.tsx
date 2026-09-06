import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionHeader } from '.';

const meta = {
  title: 'Patterns/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Heading row for a page section — title (+ description) with an optional ' +
          'trailing action, e.g. above a dashboard widget list.',
      },
    },
  },
  args: { title: 'Upcoming events' },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDescription: Story = { args: { description: 'Next 7 days across all lobbies' } };
export const WithAction: Story = { args: { action: <a href="#">View all</a> } };
