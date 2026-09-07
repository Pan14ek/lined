import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionCard } from '.';
import { Button } from '../../design-system/actions/Button';
import { FieldRow } from '../FieldRow';

const meta = {
  title: 'Patterns/SectionCard',
  component: SectionCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Page-section card shell — header (title/description/action) + body + optional ' +
          'footer. Replaces the previous feature-local `SettingsCard`.',
      },
    },
  },
  render: (args) => (
    <div style={{ width: 420 }}>
      <SectionCard {...args}>
        <FieldRow label="Display name">
          <span className="text-sm text-muted-foreground">Ada Lovelace</span>
        </FieldRow>
        <FieldRow label="Email">
          <span className="text-sm text-muted-foreground">ada@lined.app</span>
        </FieldRow>
      </SectionCard>
    </div>
  ),
  args: { title: 'Profile', id: 'profile', children: null },
} satisfies Meta<typeof SectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDescription: Story = { args: { description: 'Your public profile information' } };
export const WithAction: Story = { args: { action: <Button size="sm" variant="ghost">Edit</Button> } };
export const WithFooter: Story = {
  args: { footer: <Button variant="destructive">Delete account</Button> },
};
