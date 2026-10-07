import { apiRequest } from '../../shared/api/client';
export const analyticsService = {
  status: () => apiRequest('/api/admin/analytics/status', { auth: true, cacheTtl: 0 }),
  summary: days => apiRequest(`/api/admin/analytics?days=${days}`, { auth: true, cacheTtl: 0 }),
};
