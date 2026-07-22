import { ChevronDown, CalendarPlus, ListPlus, Users, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useCreateMenuStore } from '@/store/createMenu';

export const CreateMenu = () => {
  const { t } = useTranslation('common');
  const openCreateLobby = useCreateMenuStore((s) => s.openCreateLobby);
  const openOverlay = useCreateMenuStore((s) => s.openOverlay);
  const openReserveSlot = useCreateMenuStore((s) => s.openReserveSlot);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-green-dark px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark/90">
        {t('createMenu.trigger')}
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => openOverlay('event')} className="gap-2.5 py-2">
          <CalendarPlus className="h-4 w-4" />
          {t('createMenu.newEvent')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openOverlay('task')} className="gap-2.5 py-2">
          <ListPlus className="h-4 w-4" />
          {t('createMenu.newTask')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openCreateLobby()} className="gap-2.5 py-2">
          <Users className="h-4 w-4" />
          {t('createMenu.newLobby')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => openReserveSlot()}
          className="gap-2.5 bg-brand-green-light py-2 text-brand-green-dark focus:bg-brand-green-light/80 focus:text-brand-green-dark dark:text-brand-green dark:focus:text-brand-green"
        >
          <Sparkles className="h-4 w-4" />
          {t('createMenu.reserveFreeSlot')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
