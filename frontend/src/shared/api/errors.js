export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function normalizeApiError(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    // Some backend failures do not include a JSON body.
  }

  const message = response.status === 403
    ? "You don't have permission to access this page."
    : data?.detail || data?.error || data?.message || `Request failed (${response.status})`;
  return new ApiError(message, { status: response.status, data });
}
