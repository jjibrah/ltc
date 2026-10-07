export const formatDate = (value, options = { dateStyle: 'medium' }) => value ? new Intl.DateTimeFormat(undefined, options).format(new Date(value)) : '—';
export const formatDateTime = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const isExpired = (value) => Boolean(value) && new Date(value).getTime() <= Date.now();
export const toIso = (value = new Date()) => new Date(value).toISOString();
