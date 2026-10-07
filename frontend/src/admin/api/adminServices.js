import { listQuery } from '../../shared/api/listQuery';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

export const storiesService = {
  list: () => apiRequest(endpoints.adminStories.list, { auth: true }),
  create: (body) => apiRequest(endpoints.adminStories.list, { method: 'POST', auth: true, body }),
  update: (id, body) => apiRequest(endpoints.adminStories.detail(id), { method: 'PATCH', auth: true, body }),
  remove: (id) => apiRequest(endpoints.adminStories.detail(id), { method: 'DELETE', auth: true }),
};

export const newslettersService = {
  list: () => apiRequest(endpoints.adminNewsletters.list, { auth: true }),
  create: (body) => apiRequest(endpoints.adminNewsletters.list, { method: 'POST', auth: true, body: JSON.stringify(body) }),
  update: (id, body) => apiRequest(endpoints.adminNewsletters.detail(id), { method: 'PATCH', auth: true, body: JSON.stringify(body) }),
  remove: (id) => apiRequest(endpoints.adminNewsletters.detail(id), { method: 'DELETE', auth: true }),
  uploadBanner: (id, file) => {
    const body = new FormData();
    body.append('banner', file);
    return apiRequest(endpoints.adminNewsletters.banner(id), { method: 'POST', auth: true, body });
  },
  addAttachment: (id, file) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest(endpoints.adminNewsletters.attachments(id), { method: 'POST', auth: true, body });
  },
  removeAttachment: (id, attachmentId) => apiRequest(endpoints.adminNewsletters.attachment(id, attachmentId), { method: 'DELETE', auth: true }),
  preview: (id) => apiRequest(endpoints.adminNewsletters.preview(id), { auth: true, responseType: 'blob' }),
  send: (id) => apiRequest(endpoints.adminNewsletters.send(id), { method: 'POST', auth: true }),
  status: (id) => apiRequest(endpoints.adminNewsletters.status(id), { auth: true }),
  subscriberCount: () => apiRequest(endpoints.subscriberCount, { auth: true }),
};

export function unavailableAdminService(name) {
  return async () => { throw new Error(`${name} API is not available in the current frontend contract.`); };
}

export const usersService = { list: unavailableAdminService('Users'), invite: unavailableAdminService('User invitations') };
export const profilesService = { list: unavailableAdminService('Team profiles'), invite: unavailableAdminService('Profile invitations') };
const mentorStatusToApi = { New: 'pending', 'Under review': 'under_review', Approved: 'approved', Declined: 'declined' };
const mentorStatusFromApi = { pending: 'New', under_review: 'Under review', approved: 'Approved', declined: 'Declined' };
const normalizeMentor = (item) => ({
  id: item.id,
  name: item.full_name,
  email: item.email,
  background: item.professional_background,
  helpOptions: item.help_options || [],
  contactMethod: item.preferred_contact_method || 'Email',
  message: item.message || 'No additional message was provided.',
  status: mentorStatusFromApi[item.status] || item.status,
  submitted: item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'Unknown',
});
export const mentorsService = {
  list: (query = {}) => apiRequest(listQuery(endpoints.adminMentorApplications.list, query), { auth: true }).then((items) => items.map(normalizeMentor)),
  updateStatus: (id, nextStatus) => apiRequest(endpoints.adminMentorApplications.detail(id), { method: 'PATCH', auth: true, body: JSON.stringify({ status: mentorStatusToApi[nextStatus] }) }).then(normalizeMentor),
};
