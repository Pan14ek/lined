import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/features/layout/AppShell';
import { RequireAuth, RedirectIfAuthed } from '@/features/auth/RequireAuth';
import { SignInPage } from '@/features/auth/pages/SignInPage';
import { SignUpPage } from '@/features/auth/pages/SignUpPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { LobbyPage } from '@/features/lobby/pages/LobbyPage';
import { LobbySettingsPage } from '@/features/lobby/pages/LobbySettingsPage';
import { CalendarPage } from '@/features/calendar/pages/CalendarPage';
import { TasksPage } from '@/features/tasks/pages/TasksPage';
import { UserSettingsPage } from '@/features/settings/pages/UserSettingsPage';
import { SubscriptionPage } from '@/features/subscription/pages/SubscriptionPage';

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
    path: '/forgot-password',
    element: (
      <RedirectIfAuthed>
        <ForgotPasswordPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <RedirectIfAuthed>
        <ResetPasswordPage />
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
          { path: 'subscription', element: <SubscriptionPage /> },
        ],
      },
    ],
  },
]);
