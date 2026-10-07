import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';

const LoginPage = lazy(() => import('../../auth/login/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../../auth/forgot-password/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../../auth/reset-password/ResetPasswordPage'));

export const authRoutes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/admin/login', element: <AdminLoginRoute /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/set-password', element: <ResetPasswordPage /> },
  { path: '/set-password/:uid/:token', element: <ResetPasswordPage /> },
];

function AdminLoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="app-loading-screen" role="status" aria-live="polite"><div className="app-loading-screen__mark" aria-hidden="true">LTC</div><strong>Living the Charge</strong><span>Checking your session...</span></div>;
  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />;
}
