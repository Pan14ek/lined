/**
 * Shared skeleton "bone" color. shadcn's default bg-muted has almost no
 * contrast against this app's light-theme white/near-white surfaces (it
 * only reads as a shimmer in dark mode) — see index.css's --muted vs.
 * --background values. Use this wherever a raw shadcn Skeleton is rendered
 * outside of SkeletonRow/SkeletonCard/SkeletonAvatar.
 */
export const SKELETON_BONE_CLASS = 'bg-gray-200 dark:bg-gray-700';
