import { listQuery } from '../../shared/api/listQuery';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

const normalize = (user) => ({
  ...user,
  profileStatus: user.profile_status || user.profileStatus || 'incomplete',
  lastActiveAt: user.last_active_at || user.lastActiveAt || null,
  invitedAt: user.invited_at || user.invitedAt || null,
  invitationExpiresAt: user.invitation_expires_at || user.invitationExpiresAt || null,
  invitationCompletedAt: user.invitation_completed_at || user.invitationCompletedAt || null,
  activatedAt: user.activated_at || user.activatedAt || null,
});

export const usersService = {
  async getAll(query = {}) {
    const response = await apiRequest(listQuery(endpoints.adminUsers.list, query), { auth: true });
    const users = Array.isArray(response) ? response : response.results || [];
    return users.map(normalize);
  },
  async getById(id) {
    return normalize(await apiRequest(endpoints.adminUsers.detail(id), { auth: true }));
  },
  async invite(values) {
    const response = await apiRequest(endpoints.adminUsers.invitations, { method: 'POST', auth: true, body: JSON.stringify(values) });
    return { ...normalize(response.user), message: response.message };
  },
  resendInvitation: (id) => apiRequest(endpoints.adminUsers.resendInvitation(id), { method: 'POST', auth: true }),
  revokeInvitation: (id, reason) => apiRequest(endpoints.adminUsers.revokeInvitation(id), { method: 'POST', auth: true, body: JSON.stringify({ reason }) }),
  getCatalogue: () => apiRequest(endpoints.permissions, { auth: true }),
  getRolePermissions: () => apiRequest(endpoints.rolePermissions, { auth: true }),
  saveRolePermissions: (role, permissions, reason) => apiRequest(endpoints.rolePermissionDetail(role), { method: 'PUT', auth: true, body: JSON.stringify({ permissions, reason }) }),
  getAuthorizationMatrix: () => apiRequest(endpoints.userAuthorizations, { auth: true }),
  async getAuthorization(id) {
    const response = await apiRequest(endpoints.adminUsers.permissions(id), { auth: true });
    return { ...response, user: normalize(response.user) };
  },
  savePermissions: (id, grants, denies, reason) => apiRequest(endpoints.adminUsers.permissions(id), { method: 'PUT', auth: true, body: JSON.stringify({ grants, denies, reason }) }),
  resetPermissions: (id, reason) => apiRequest(endpoints.adminUsers.resetPermissions(id), { method: 'POST', auth: true, body: JSON.stringify({ reason }) }),
  changeRole: (id, role, reason) => apiRequest(endpoints.adminUsers.role(id), { method: 'PATCH', auth: true, body: JSON.stringify({ role, reason }) }),
  changeStatus: (id, status, reason) => apiRequest(endpoints.adminUsers.status(id), { method: 'PATCH', auth: true, body: JSON.stringify({ status, reason }) }),
  disable: (id) => apiRequest(endpoints.adminUsers.disable(id), { method: 'POST', auth: true }),
  enable: (id) => apiRequest(endpoints.adminUsers.enable(id), { method: 'POST', auth: true }),
  regenerateTemporaryPassword: (id) => apiRequest(endpoints.adminUsers.regeneratePassword(id), { method: 'POST', auth: true }),
  delete: (id, reason) => apiRequest(endpoints.adminUsers.delete(id), { method: 'DELETE', auth: true, body: JSON.stringify({ reason }) }),
  getActivity: (id, limit = 50) => apiRequest(`${endpoints.audit.list}?target_id=${encodeURIComponent(id)}&limit=${limit}`, { auth: true }),
};
