import { tokenStorage } from '../../auth/session/tokenStorage';
import { apiRequest, refreshAccessToken, clearApiCache } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

export const authService = {
  async login(credentials) {
    const tokens = await apiRequest(endpoints.auth.login, { method: 'POST', body: JSON.stringify(credentials) });
    tokenStorage.setTokens(tokens);
    const user = await apiRequest(endpoints.auth.me, { auth: true });
    return { tokens, user };
  },
  async refreshSession() {
    const refresh = tokenStorage.getRefreshToken();
    const expiresAt = tokenStorage.getExpiresAt();
    const accessIsFresh = tokenStorage.getAccessToken() && expiresAt > Math.floor(Date.now() / 1000) + 60;
    if (refresh && !accessIsFresh) {
      await refreshAccessToken();
    }
    if (!tokenStorage.getAccessToken()) return null;
    const user = await apiRequest(endpoints.auth.me, { auth: true, retry401: false, cacheTtl: 0 });
    return { user };
  },
  logout() { tokenStorage.clear(); clearApiCache(); },
  changePassword: (currentPassword, newPassword) => apiRequest(endpoints.auth.changePassword, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  }),
};
