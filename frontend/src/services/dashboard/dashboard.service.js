import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

export const dashboardService = {
  getSummary: (fresh = false) => apiRequest(endpoints.dashboard, { auth: true, cacheTtl: fresh ? 0 : 30000 }),
};
