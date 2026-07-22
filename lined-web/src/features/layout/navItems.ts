import { LayoutDashboard, Calendar, ListTodo } from 'lucide-react';

/** Primary nav destinations, shared by the desktop Sidebar and the mobile BottomTabBar. */
export const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/calendar', icon: Calendar, labelKey: 'nav.calendar' },
  { to: '/tasks', icon: ListTodo, labelKey: 'nav.tasks' },
] as const;
