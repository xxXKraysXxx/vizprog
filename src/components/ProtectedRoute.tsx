import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const tokens = useAppSelector((s) => s.auth.tokens);
  const location = useLocation();
  if (!tokens) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
