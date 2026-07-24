import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonRow } from '@/components/skeletons/SkeletonRow';
import { SKELETON_BONE_CLASS } from '@/components/skeletons/boneClass';
import { cn } from '@/lib/utils';

interface LobbyLoadStatesProps {
  loadingTestId: string;
}

export const LobbyLoadingState = ({ loadingTestId }: LobbyLoadStatesProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-6" data-testid={loadingTestId}>
      <div className="flex items-center gap-3">
        <Skeleton className={cn('size-12 shrink-0 rounded-xl', SKELETON_BONE_CLASS)} />
        <div className="flex flex-col gap-1.5">
          <Skeleton className={cn('h-5 w-40 rounded', SKELETON_BONE_CLASS)} />
          <Skeleton className={cn('h-3 w-24 rounded', SKELETON_BONE_CLASS)} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className={cn('h-8 w-20 rounded-lg', SKELETON_BONE_CLASS)} />
        <Skeleton className={cn('h-8 w-20 rounded-lg', SKELETON_BONE_CLASS)} />
        <Skeleton className={cn('h-8 w-20 rounded-lg', SKELETON_BONE_CLASS)} />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <SkeletonRow className="h-14" />
        <SkeletonRow className="h-14" />
        <SkeletonRow className="h-14" />
      </div>
    </div>
  );
}

export const LobbyNotFoundState = () => {
  const { t } = useTranslation('lobby');
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <p className="text-sm text-text-secondary">
        {t('loadStates.notFound')}
      </p>
    </div>
  );
}
