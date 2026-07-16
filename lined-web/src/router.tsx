import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { RequireAuth, RedirectIfAuthed } from '@/components/RequireAuth';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LobbyPage } from '@/pages/LobbyPage';
import { LobbySettingsPage } from '@/pages/LobbySettingsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { TasksPage } from '@/pages/TasksPage';
import { UserSettingsPage } from '@/pages/UserSettingsPage';

export const router = createBrowserRouter([
  {
    path: '/sign-in',
    element: (
      <RedirectIfAuthed>
        <SignInPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/sign-up',
    element: (
      <RedirectIfAuthed>
        <SignUpPage />
      </RedirectIfAuthed>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'lobbies/:id', element: <LobbyPage /> },
          { path: 'lobbies/:id/settings', element: <LobbySettingsPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'tasks', element: <TasksPage /> },
          { path: 'settings', element: <UserSettingsPage /> },
        ],
      },
    ],
  },
]);
