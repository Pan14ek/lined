import type { HTMLAttributes } from 'react';
import { Skeleton as SkeletonPrimitive } from '@/components/ui/skeleton';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Purpose: pulsing placeholder block for content that is still loading.
 *
 * When to use: loading placeholders that mirror the shape of the content
 * that will replace them (a line of text, an avatar, a card).
 *
 * When not to use: a full loading section with retry/empty affordances —
 * combine with `AsyncContent` for that.
 */
export const Skeleton = ({ ...props }: SkeletonProps) => {
  return <SkeletonPrimitive {...props} />;
};
