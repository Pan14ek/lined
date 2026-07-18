import { LayoutDashboard, Calendar, ListTodo } from 'lucide-react';

/** Primary nav destinations, shared by the desktop Sidebar and the mobile BottomTabBar. */
export const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
] as const;
