import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import AppLoadingScreen from '../components/feedback/AppLoadingScreen';

export default function RequirePermission({ permission, children }) {
  const { can, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AppLoadingScreen message="Checking your permissions…" />;
  }
  if (!can(permission)) {
    return location.pathname === '/admin/dashboard'
      ? <div className="admin-page"><div className="admin-permission-denied" role="alert"><h1>Access denied</h1><p>Your account does not have permission to view this area.</p></div></div>
      : <Navigate to="/admin/dashboard" replace state={{ permissionDenied: permission }} />;
  }
  return children;
}
