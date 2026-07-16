import { ChevronDown, CalendarPlus, ListPlus, Users, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useCreateMenuStore } from '@/store/createMenu';

export const CreateMenu = () => {
  const openCreateLobby = useCreateMenuStore((s) => s.openCreateLobby);
  const openOverlay = useCreateMenuStore((s) => s.openOverlay);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-green-dark px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark/90">
        + Create
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => openOverlay('event')} className="gap-2.5 py-2">
          <CalendarPlus className="h-4 w-4" />
          New Event
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openOverlay('task')} className="gap-2.5 py-2">
          <ListPlus className="h-4 w-4" />
          New Task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openCreateLobby} className="gap-2.5 py-2">
          <Users className="h-4 w-4" />
          New Lobby
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => openOverlay('reserveSlot')}
          className="gap-2.5 bg-brand-green-light py-2 text-brand-green-dark focus:bg-brand-green-light/80 focus:text-brand-green-dark"
        >
          <Sparkles className="h-4 w-4" />
          Reserve Free Slot
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
