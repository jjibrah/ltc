import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import AppLoadingScreen from '../../shared/components/feedback/AppLoadingScreen';

export default function RequireAuth({ children }) {
  const { isAuthenticated, isLoading, sessionError, refreshSession, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) return <AppLoadingScreen message="Checking your session..." />;
  if (sessionError) return <main className="app-loading-screen"><h1>Session check unavailable</h1><p role="alert">{sessionError}</p><button className="btn-primary" type="button" onClick={refreshSession}>Try again</button></main>;
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: { pathname: location.pathname, search: location.search, hash: location.hash } }} />;
  }
  if (isAuthenticated && mustChangePassword && location.pathname !== '/admin/first-login/change-password') return <Navigate to="/admin/first-login/change-password" replace />;
  return children || <Outlet />;
}
