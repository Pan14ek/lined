import {
  DropdownMenu as DropdownMenuPrimitive,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Purpose: canonical overflow/action menu anchored to a trigger.
 *
 * When to use: a set of related actions or options that don't need to stay
 * visible (an overflow "..." button, a create/new split button, a filter list).
 *
 * When not to use: a single-choice form control — use `Select`. Persistent
 * navigation — use `Tabs`.
 */
export const DropdownMenu = DropdownMenuPrimitive;
export {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
