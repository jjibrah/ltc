import { tokenStorage } from '../../auth/session/tokenStorage';
import { endpoints } from './endpoints';
import { normalizeApiError } from './errors';
import { createRequestCoordinator } from './requestCoordinator';
const configuredOrigin = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
if (import.meta.env.PROD && !configuredOrigin) throw new Error('VITE_API_URL or VITE_API_BASE_URL is required for production builds');
export const API_BASE_URL = (configuredOrigin || 'http://localhost:8000').replace(/\/$/, '');
const coordinator = createRequestCoordinator({ baseUrl: API_BASE_URL, refreshPath: endpoints.auth.refresh, storage: tokenStorage, normalizeError: normalizeApiError,
  onLogout: () => window.dispatchEvent(new Event('ltc:auth-logout')),
  withRefreshLock: (fn) => navigator.locks ? navigator.locks.request('ltc:session-refresh', fn) : fn(),
});
export const clearApiCache = coordinator.clear;
export const refreshAccessToken = coordinator.refresh;
export const apiRequest = coordinator.request;
window.addEventListener('storage', (event) => { if (event.key?.startsWith('ltc_')) { clearApiCache(); if (!tokenStorage.getAccessToken()) window.dispatchEvent(new Event('ltc:auth-logout')); } });
