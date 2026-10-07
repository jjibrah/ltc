// Pure client core: tests inject storage, fetch and logout without real services.
export function createRequestCoordinator({ baseUrl, refreshPath, storage, fetcher = (...args) => fetch(...args), normalizeError, onLogout, withRefreshLock = (fn) => fn() }) {
  const cache = new Map();
  const reads = new Map();
  let generation = 0;
  let refreshPromise;
  let sessionKey = storage.getAccessToken();
  function clear(prefix = '') {
    generation += 1;
    for (const key of cache.keys()) if (!prefix || key.endsWith(prefix) || key.includes(`|${prefix}`)) cache.delete(key);
    reads.clear();
  }
  function synchronize() {
    const key = storage.getAccessToken();
    if (key !== sessionKey) { clear(); sessionKey = key; }
  }
  async function refresh() {
    if (refreshPromise) return refreshPromise;
    const originalRefresh = storage.getRefreshToken();
    const originalVersion = storage.getVersion();
    if (!originalRefresh) return null;
    refreshPromise = withRefreshLock(async () => {
      // Another tab may have rotated the refresh token while this tab waited.
      if (storage.getVersion() !== originalVersion) return storage.getAccessToken();
      const response = await fetcher(`${baseUrl}${refreshPath}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: originalRefresh }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        if ([400, 401, 403].includes(response.status) && storage.getVersion() === originalVersion) { storage.clear(); clear(); onLogout(); return null; }
        throw await normalizeError(response);
      }
      const tokens = await response.json();
      if (storage.getVersion() !== originalVersion) return storage.getAccessToken();
      storage.setTokens({ ...tokens, refresh: tokens.refresh || originalRefresh });
      synchronize();
      return tokens.access;
    }).finally(() => { refreshPromise = undefined; });
    return refreshPromise;
  }
  async function request(path, options = {}) {
    const { auth = false, retry401 = true, responseType = 'json', cacheTtl = 15000, timeoutMs = 15000, headers, ...init } = options;
    synchronize();
    const access = storage.getAccessToken();
    const version = storage.getVersion();
    const isGet = (init.method || 'GET').toUpperCase() === 'GET' && responseType === 'json';
    const key = `${auth ? version : 'public'}|${path}`;
    const cacheable = isGet && cacheTtl > 0 && !init.signal;
    if (!isGet) clear();
    const startedGeneration = generation;
    if (cacheable) {
      for (const [k, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(k);
      if (cache.has(key)) return structuredClone(cache.get(key).value);
      if (reads.has(key)) return structuredClone(await reads.get(key));
    }
    const requestHeaders = new Headers(headers);
    if (auth && access) requestHeaders.set('Authorization', `Bearer ${access}`);
    if (init.body && !(init.body instanceof FormData) && !requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json');
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
    const work = (async () => {
      try {
        let response = await fetcher(`${baseUrl}${path}`, { ...init, signal, headers: requestHeaders });
        if (auth && retry401 && response.status === 401) {
          const nextAccess = storage.getAccessToken() !== access ? storage.getAccessToken() : await refresh();
          signal.throwIfAborted();
          if (nextAccess) { requestHeaders.set('Authorization', `Bearer ${nextAccess}`); response = await fetcher(`${baseUrl}${path}`, { ...init, signal, headers: requestHeaders }); }
        }
        if (!response.ok) throw await normalizeError(response);
        if (response.status === 204) return null;
        if (responseType === 'text') return await response.text();
        if (responseType === 'blob') return await response.blob();
        const value = await response.json();
        if (cacheable && startedGeneration === generation && (!auth || storage.getVersion() === version)) {
          while (cache.size >= 100) cache.delete(cache.keys().next().value);
          cache.set(key, { value: structuredClone(value), expiresAt: Date.now() + cacheTtl });
        }
        return value;
      } finally { clearTimeout(deadline); if (!isGet) clear(); }
    })();
    if (cacheable) { reads.set(key, work); work.then(() => { if (reads.get(key) === work) reads.delete(key); }, () => { if (reads.get(key) === work) reads.delete(key); }); }
    return work;
  }
  return { request, refresh, clear };
}
