import { clearApiCache } from '../../shared/api/client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService } from '../../services/auth/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const permissionsFlight = useRef(null);
  const [sessionError, setSessionError] = useState('');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    setSessionError('');
    setUser(result.user);
    setIsAuthenticated(true);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSessionError('');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setSessionError('');
    try {
      const result = await authService.refreshSession();
      setUser(result?.user || null);
      setIsAuthenticated(Boolean(result));
      return result?.user || null;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
      } else setSessionError('We could not verify your session. Try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Role/group changes are database-backed and do not change the Supabase JWT.
  // Refresh only the application user record so an open admin session receives
  // new effective permissions without showing the full auth loading screen.
  const refreshPermissions = useCallback(async () => {
    try {
      const result = await authService.refreshSession();
      const nextUser = result?.user || null;
      if (!nextUser) return null;
      setUser((previous) => {
        if (JSON.stringify(previous?.permissions) !== JSON.stringify(nextUser.permissions)) clearApiCache();
        return nextUser;
      });
      setIsAuthenticated(true);
      return nextUser;
    } catch (error) {
      // A disabled/invalid account must not remain visually authenticated.
      if (error?.status === 401 || error?.status === 403) logout();
      return null;
    }
  }, [logout]);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible' && !permissionsFlight.current) {
        permissionsFlight.current = refreshPermissions().finally(() => { permissionsFlight.current = null; });
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, [isAuthenticated, refreshPermissions]);

  useEffect(() => {
    window.addEventListener('ltc:auth-logout', logout);
    return () => window.removeEventListener('ltc:auth-logout', logout);
  }, [logout]);

  const can = useCallback((permission) => Boolean(permission && user?.permissions?.includes(permission)), [user]);
  const value = useMemo(() => ({ user, sessionError, isAuthenticated, isLoading, login, logout, refreshSession, refreshPermissions, can, mustChangePassword: false }), [user, sessionError, isAuthenticated, isLoading, login, logout, refreshSession, refreshPermissions, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
