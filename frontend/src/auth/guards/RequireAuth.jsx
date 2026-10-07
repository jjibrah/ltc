import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';

export default function RequireAuth({ children }) {
  const { isAuthenticated, isLoading, sessionError, refreshSession, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoadingScreen />;
  if (sessionError) return <main className="app-loading-screen"><h1>Session check unavailable</h1><p role="alert">{sessionError}</p><button className="btn-primary" type="button" onClick={refreshSession}>Try again</button></main>;
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: { pathname: location.pathname, search: location.search, hash: location.hash } }} />;
  }
  if (isAuthenticated && mustChangePassword && location.pathname !== '/admin/first-login/change-password') return <Navigate to="/admin/first-login/change-password" replace />;
  return children || <Outlet />;
}

function AuthLoadingScreen() {
  return <div className="app-loading-screen" role="status" aria-live="polite"><div className="app-loading-screen__mark" aria-hidden="true">LTC</div><strong>Living the Charge</strong><span>Checking your session...</span></div>;
}
