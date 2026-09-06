import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '.';
import { IconButton } from '../../actions/IconButton';

const meta = {
  title: 'Design System/Overlays/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Canonical overflow/action menu anchored to a trigger. Use `Select` for a ' +
          'single-choice form control instead.',
      },
    },
  },
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<IconButton icon={<Pencil />} aria-label="More actions" />} />
      <DropdownMenuContent>
        <DropdownMenuLabel>Task</DropdownMenuLabel>
        <DropdownMenuItem>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
