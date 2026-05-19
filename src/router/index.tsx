import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@components/Layout';
import { ProtectedRoute } from '@components/ProtectedRoute';
import { Dashboard } from '@/pages/Dashboard';
import { SpreadsheetPage } from '@/pages/SpreadsheetPage';
import { Profile } from '@/pages/Profile';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Notfound } from '@/pages/Notfound';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/documents/:documentId', element: <SpreadsheetPage /> },
      { path: '/profile', element: <Profile /> },
    ],
  },
  { path: '*', element: <Notfound /> },
]);
