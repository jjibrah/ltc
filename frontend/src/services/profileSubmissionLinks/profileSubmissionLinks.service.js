import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

export const profileSubmissionLinksService = {
  create: ({ expiresIn }) => apiRequest(endpoints.profileSubmissionLinks.create, { method: 'POST', auth: true, body: JSON.stringify({ expires_in: expiresIn }) }).then(normalizeLink),
  getAll: () => apiRequest(endpoints.profileSubmissionLinks.list, { auth: true }).then((links) => links.map(normalizeLink)),
  validate: async (token) => { try { return { ...(await apiRequest(endpoints.profileSubmissionLinks.validate(token))), state: 'valid' }; } catch (error) { return { state: error.status === 400 ? 'invalid' : 'error', message: error.message }; } },
  revoke: (id) => apiRequest(endpoints.profileSubmissionLinks.revoke(id), { method: 'POST', auth: true }),
};

function normalizeLink(link) {
  return { ...link, createdAt: link.created_at || link.createdAt, expiresAt: link.expires_at || link.expiresAt, submissions: Number(link.submissions ?? (link.used_at ? 1 : 0)) };
}
