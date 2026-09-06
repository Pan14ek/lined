import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '.';

const meta = {
  title: 'Design System/Data Display/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Generic circular avatar with an image + text-fallback contract. ' +
          'Has no notion of a user/domain model — feature code wraps it (e.g. `UserAvatar`).',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    tone: { control: 'select', options: ['neutral', 'brand'] },
  },
  args: { fallback: 'A' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};
export const Brand: Story = { args: { tone: 'brand' } };
export const ExtraSmall: Story = { args: { size: 'xs' } };
export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };
export const ExtraLarge: Story = { args: { size: 'xl' } };
export const WithImage: Story = {
  args: { src: 'https://i.pravatar.cc/64?img=12', alt: 'Ada Lovelace', fallback: 'A' },
};
