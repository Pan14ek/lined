import { useTranslation } from 'react-i18next';
import type { UserDto } from '@/features/users/model';
import { Skeleton } from '@/components/ui/skeleton';
import { SKELETON_BONE_CLASS } from '@/components/skeletons/boneClass';
import { cn } from '@/lib/utils';

interface AssigneePickerProps {
  members: UserDto[];
  selectedId: number | undefined;
  onSelect: (id: number | undefined) => void;
  isLoading?: boolean;
}

interface AssigneeOptionProps {
  label: string;
  initial: string;
  isSelected: boolean;
  onClick: () => void;
}

const AssigneeOption = ({ label, initial, isSelected, onClick }: AssigneeOptionProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={isSelected}
    aria-label={label}
    onClick={onClick}
    className="flex flex-col items-center gap-1"
  >
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full border-[3px] text-lg font-bold text-white',
        isSelected ? 'border-brand-green bg-brand-green' : 'border-border bg-muted-foreground',
      )}
    >
      {initial}
    </div>
    <span
      className={cn(
        'text-[11px]',
        isSelected ? 'font-semibold text-brand-green-dark dark:text-brand-green' : 'text-text-secondary',
      )}
    >
      {label}
    </span>
  </button>
);

export const AssigneePicker = ({
  members,
  selectedId,
  onSelect,
  isLoading,
}: AssigneePickerProps) => {
  const { t } = useTranslation('lobby');

  if (isLoading) {
    return (
      <div className="flex gap-2.5" data-testid="assignee-picker-loading">
        {[0, 1].map((i) => (
          <Skeleton key={i} className={cn('size-12 rounded-full', SKELETON_BONE_CLASS)} />
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={t('assigneePicker.ariaLabel')} className="flex flex-wrap gap-2.5">
      <AssigneeOption
        label={t('assigneePicker.unassigned')}
        initial="—"
        isSelected={selectedId == null}
        onClick={() => onSelect(undefined)}
      />
      {members.map((member) => (
        <AssigneeOption
          key={member.id}
          label={member.username}
          initial={member.username.charAt(0).toUpperCase()}
          isSelected={selectedId === member.id}
          onClick={() => onSelect(member.id)}
        />
      ))}
    </div>
  );
};
