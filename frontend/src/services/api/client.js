// Shared API boundary. Request, refresh, and error behavior stays centralized
// in the existing client so feature services remain transport-agnostic.
export { apiRequest, API_BASE_URL } from '../../shared/api/client';
