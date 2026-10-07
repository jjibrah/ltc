export function listQuery(path, values = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== null && value !== '' && value !== 'all' && value !== 'All') query.set(key, String(value));
  return query.size ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path;
}
