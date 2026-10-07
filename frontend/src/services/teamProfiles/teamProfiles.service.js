import { listQuery } from '../../shared/api/listQuery';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

const normalize = (profile) => ({ ...profile, displayOrder: Number(profile.display_order) || 0, status: profile.status === 'pending' ? 'pending_review' : profile.status, image: profile.image_url ? { previewUrl: profile.image_url } : null, submittedAt: profile.created_at || profile.submitted_at, reviewedAt: profile.reviewed_at, reviewedBy: profile.reviewed_by_name, reviewNote: profile.review_note, publishedAt: profile.published_at, updatedAt: profile.updated_at || profile.created_at });
const mapList = (response) => (Array.isArray(response) ? response : response.results || []).map(normalize);
const updateAction = (id, action) => apiRequest(endpoints.adminTeamProfiles.action(id, action), { method: 'POST', auth: true }).then(normalize);
const toFormData = (values) => { const form = new FormData(); ['name', 'email', 'role', 'department', 'quote', 'bio'].forEach((key) => form.append(key, values[key] || '')); if (values.image?.file) form.append('image', values.image.file); return form; };

export const teamProfilesService = {
  getAll: (query = {}) => apiRequest(listQuery(endpoints.adminTeamProfiles.list, query), { auth: true }).then(mapList),
  getMine: () => apiRequest(endpoints.adminTeamProfiles.mine, { auth: true }).then(normalize),
  createMine: (body) => apiRequest(endpoints.adminTeamProfiles.mine, { method: 'POST', auth: true, body: toFormData(body) }).then(normalize),
  getById: (id) => apiRequest(endpoints.adminTeamProfiles.detail(id), { auth: true }).then(normalize),
  update: (id, body) => apiRequest(endpoints.adminTeamProfiles.detail(id), { method: 'PATCH', auth: true, body: toFormData(body) }).then(normalize),
  updateMine: (body) => apiRequest(endpoints.adminTeamProfiles.mine, { method: 'PATCH', auth: true, body: toFormData(body) }).then(normalize),
  reorder: (profileIds) => apiRequest(endpoints.adminTeamProfiles.reorder, { method: 'POST', auth: true, body: JSON.stringify({ profile_ids: profileIds }) }).then(mapList),
  delete: (id) => apiRequest(endpoints.adminTeamProfiles.detail(id), { method: 'DELETE', auth: true }),
  submit: async (token, values) => {
    const result = await apiRequest(endpoints.profileSubmissionLinks.submit(token), { method: 'POST', body: JSON.stringify({ name: values.name, email: values.email, role: values.role, department: values.department, quote: values.quote, bio: values.bio }) });
    if (values.image?.file) { const form = new FormData(); form.append('file', values.image.file); await apiRequest(endpoints.profileSubmissionLinks.upload(token, result.profile.id), { method: 'POST', body: form }); }
    return normalize(result.profile || result);
  },
  approve: (id) => updateAction(id, 'publish'),
  publish: (id) => updateAction(id, 'publish'),
  requestChanges: (id) => updateAction(id, 'request-changes'),
  reject: (id) => updateAction(id, 'reject'),
  unpublish: (id) => updateAction(id, 'unpublish'),
  getPublished: () => apiRequest('/api/team-profiles/published').then(mapList),
};
