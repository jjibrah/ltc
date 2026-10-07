import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import type { Providers } from '../src/shared/providers.js';
const config = loadConfig({ APP_ENV: 'test', SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture' });
function mock(outage = false): Providers { return { db: { storage: { from: () => ({}) } } as unknown as Providers['db'], authClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: { status: outage ? 503 : 401 } }) } } as ReturnType<Providers['authClient']>), ready: async () => { if (outage)
        throw new Error('down'); }, close: async () => { }, rateLimit: async () => { } }; }
async function withApp(p: Providers, run: (url: string) => Promise<void>) { const server = createApp(config, p).listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve)); const address = server.address(); assert.ok(address && typeof address !== 'string'); try {
    await run(`http://127.0.0.1:${address.port}`);
}
finally {
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
} }
test('health is independent of providers; readiness reports outage', () => withApp(mock(true), async (url) => { assert.deepEqual(await (await fetch(`${url}/api/health`)).json(), { status: 'ok' }); assert.equal((await fetch(`${url}/api/ready`)).status, 503); }));
test('CORS accepts explicit origins only', () => withApp(mock(), async (url) => { const good = await fetch(`${url}/api/health`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } }); assert.equal(good.status, 204); assert.equal(good.headers.get('access-control-allow-origin'), 'http://localhost:5173'); assert.equal((await fetch(`${url}/api/health`, { method: 'OPTIONS', headers: { Origin: 'https://attacker.invalid' } })).status, 403); }));
test('auth missing, invalid, outage are distinct', async () => { await withApp(mock(), async (url) => { assert.equal((await fetch(`${url}/api/auth/me`)).status, 401); assert.equal((await fetch(`${url}/api/auth/me`, { headers: { Authorization: 'Bearer fixture' } })).status, 401); }); await withApp(mock(true), async (url) => { assert.equal((await fetch(`${url}/api/auth/me`, { headers: { Authorization: 'Bearer fixture' } })).status, 503); }); });
test('validation precedes provider effects and uses 422', () => withApp(mock(), async (url) => { const r = await fetch(`${url}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'bad', password: 'short' }) }); assert.equal(r.status, 422); }));
test('unknown API path remains JSON and request ID is sanitized', () => withApp(mock(), async (url) => { const r = await fetch(`${url}/api/missing`, { headers: { 'X-Request-ID': 'credential?token=secret' } }); assert.equal(r.status, 404); assert.deepEqual(await r.json(), { detail: 'Not found' }); assert.match(r.headers.get('x-request-id')!, /^[a-z0-9-]+$/); }));
