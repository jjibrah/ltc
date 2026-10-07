import { apiRequest } from '../../shared/api/client';
const base = '/api/admin/billing';
export const billingService = {
  list: () => apiRequest(base, { auth: true }),
  create: body => apiRequest(base, { auth: true, method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => apiRequest(`${base}/${encodeURIComponent(id)}`, { auth: true, method: 'PATCH', body: JSON.stringify(body) }),
  payments: id => apiRequest(`${base}/${encodeURIComponent(id)}/payments`, { auth: true }),
  recordPayment: (id, body) => apiRequest(`${base}/${encodeURIComponent(id)}/payments`, { auth: true, method: 'POST', body: JSON.stringify(body) }),
};
export const operationsSettingsService = {
  get: () => apiRequest('/api/admin/operations-settings', { auth: true }),
  save: body => apiRequest('/api/admin/operations-settings', { auth: true, method: 'PUT', body: JSON.stringify(body) }),
};
