import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

export function RequireAuth() {
  const userId = useAuthStore((s) => s.userId);
  if (userId === null) {
    return <Navigate to="/sign-in" replace />;
  }
  return <Outlet />;
}

export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.userId);
  if (userId !== null) {
    return <Navigate to="/" replace />;
  }
  return children;
}
