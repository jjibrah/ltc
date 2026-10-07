import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

const queryString = (values) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined && value !== false) query.set(key, String(value));
  });
  return query.toString();
};

export const auditService = {
  getSummary: () => apiRequest(endpoints.audit.summary, { auth: true }),
  list: (filters) => apiRequest(`${endpoints.audit.list}?${queryString(filters)}`, { auth: true }),
  getById: (id) => apiRequest(endpoints.audit.detail(id), { auth: true }),
};
