import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import AppLoadingScreen from '../../shared/components/feedback/AppLoadingScreen';

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
  if (isLoading) return <AppLoadingScreen message="Checking your session..." />;
  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />;
}
