import { listQuery } from '../../shared/api/listQuery';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

// Retry identical requests with the same key; changed details are a new intent.
export function checkoutAttempt(previous, payload, makeKey = () => globalThis.crypto.randomUUID()) {
  const fingerprint = JSON.stringify(payload);
  return previous?.fingerprint === fingerprint ? previous : { fingerprint, key: makeKey() };
}

export function createCheckoutSession(payload, idempotencyKey) {
  return apiRequest(endpoints.donations.checkoutSession, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export function getDonationSession(sessionId) {
  return apiRequest(endpoints.donations.session(sessionId), { cacheTtl: 0 });
}

export function getDonationProgress() {
  return apiRequest(endpoints.donations.progress);
}

export function getDonationSupporters(limit = 9, offset = 0) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiRequest(`${endpoints.donations.supporters}?${params.toString()}`);
}

export function updateSupporterPublication(id, status, anonymous) {
  return apiRequest(endpoints.donations.supporterPublication(id), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ status, ...(anonymous === undefined ? {} : { anonymous }) }),
  });
}

export function createPledge(payload) {
  return apiRequest(endpoints.donations.pledges, { method: 'POST', body: JSON.stringify(payload) });
}

export function getPublicPledges() {
  return apiRequest(endpoints.donations.pledges);
}

export function getAdminDonations(query = {}) {
  return apiRequest(listQuery(endpoints.donations.adminList, query), { auth: true, cacheTtl: 0 });
}

export function createManualDonation(payload) {
  return apiRequest(endpoints.donations.manual, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getAdminPledges(query = {}) {
  return apiRequest(listQuery(endpoints.donations.adminPledges, query), { auth: true, cacheTtl: 0 });
}

export function updatePledgeStatus(id, status) {
  return apiRequest(endpoints.donations.adminPledge(id), { method: 'PATCH', auth: true, body: JSON.stringify({ status }) });
}

export const getDonationSummary = () => apiRequest('/api/admin/donations/summary', { auth: true, cacheTtl: 0 });
