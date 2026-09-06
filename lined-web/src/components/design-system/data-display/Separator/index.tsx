import { Separator as SeparatorPrimitive } from '@/components/ui/separator';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Purpose: a thin visual divider between sections of content.
 *
 * When to use: separating unrelated groups of content in a list, menu, or layout.
 *
 * When not to use: a section boundary that also needs a heading — use `SectionHeader`.
 */
export const Separator = ({ orientation = 'horizontal', className }: SeparatorProps) => (
  <SeparatorPrimitive orientation={orientation} className={className} />
);
