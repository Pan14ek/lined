import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

export const RequireAuth = () => {
  const { status } = useAuthStore();
  if (status === 'bootstrapping') {
    return <div role="status">Loading…</div>;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/sign-in" replace />;
  }
  return <Outlet />;
}

export const RedirectIfAuthed = ({ children }: { children: React.ReactNode }) => {
  const status = useAuthStore((s) => s.status);
  if (status === 'bootstrapping') {
    return <div role="status">Loading…</div>;
  }
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }
  return children;
}
