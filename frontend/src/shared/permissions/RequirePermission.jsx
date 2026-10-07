import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';

export default function RequirePermission({ permission, children }) {
  const { can, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="app-loading-screen" role="status" aria-live="polite"><div className="app-loading-screen__mark" aria-hidden="true">LTC</div><strong>Living the Charge</strong><span>Checking your permissions…</span></div>;
  }
  if (!can(permission)) {
    return location.pathname === '/admin/dashboard'
      ? <div className="admin-page"><div className="admin-permission-denied" role="alert"><h1>Access denied</h1><p>Your account does not have permission to view this area.</p></div></div>
      : <Navigate to="/admin/dashboard" replace state={{ permissionDenied: permission }} />;
  }
  return children;
}
