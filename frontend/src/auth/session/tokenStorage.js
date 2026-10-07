// These are real JWT credentials issued by Supabase Auth, not an authentication flag
// or application database. They are kept only so a valid session survives a
// browser refresh; all authentication decisions are made by the API.
const ACCESS_TOKEN_KEY = 'ltc_access_token';
const REFRESH_TOKEN_KEY = 'ltc_refresh_token';
const SESSION_VERSION_KEY = 'ltc_session_version';
const EXPIRES_AT_KEY = 'ltc_access_expires_at';

export const tokenStorage = {
  getVersion: () => localStorage.getItem(SESSION_VERSION_KEY) || 'initial',
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getExpiresAt: () => Number(localStorage.getItem(EXPIRES_AT_KEY) || 0),
  setTokens({ access, refresh, expires_at: expiresAt }) {
    localStorage.setItem(SESSION_VERSION_KEY, crypto.randomUUID());
    if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    if (expiresAt) localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  },
  clear() {
    localStorage.setItem(SESSION_VERSION_KEY, crypto.randomUUID());
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  },
};
