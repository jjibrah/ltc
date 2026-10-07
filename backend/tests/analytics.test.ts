import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { decodeJwt } from 'jose';
import { loadConfig } from '../src/config/env.js';
import { createAnalyticsReader } from '../src/modules/analytics.js';
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const config = loadConfig({ APP_ENV: 'test', SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture', GA4_ENABLED: 'true', GA4_PROPERTY_ID: '1234', GA4_CLIENT_EMAIL: 'reader@fixture.invalid', GA4_PRIVATE_KEY: key, GA4_HOSTNAMES: 'example.org,www.example.org' });
const report = (metrics: string[], dimension?: string) => ({ metricHeaders: metrics.map(name => ({ name })), rows: [{ metricValues: metrics.map((_v, i) => ({ value: String((i + 1) * 10) })), ...(dimension ? { dimensionValues: [{ value: dimension }] } : {}) }], metadata: { timeZone: 'Africa/Nairobi' } });
const body = () => ({ reports: [report(['totalUsers', 'screenPageViews', 'sessions']), report(['screenPageViews'], '20261001'), report(['screenPageViews'], '/stories'), report(['sessions'], 'google / organic'), report(['totalUsers'], 'Kenya')] });
test('analytics disabled/incomplete requires no provider or database requests', async () => {
    const forbidden: typeof fetch = async () => { throw new Error('Must not fetch'); };
    assert.equal((await createAnalyticsReader({ ...config, GA4_ENABLED: 'false' }, forbidden).summary(30) as { status: string }).status, 'not_configured');
    assert.equal((await createAnalyticsReader({ ...config, GA4_PRIVATE_KEY: '' }, forbidden).summary(30) as { status: string }).status, 'configuration_incomplete');
});
test('read-only JWT scope, host/path filters, response parsing and concurrent caching are preserved', async () => {
    let calls = 0; let query: { requests: Record<string, unknown>[] } | undefined;
    const fetcher: typeof fetch = async (url, init) => {
        calls++;
        if (String(url).includes('oauth2')) { const assertion = new URLSearchParams(String(init?.body)).get('assertion'); assert.ok(assertion); const claims = decodeJwt(assertion); assert.equal(claims.scope, 'https://www.googleapis.com/auth/analytics.readonly'); assert.equal(claims.iss, config.GA4_CLIENT_EMAIL); return Response.json({ access_token: 'synthetic', expires_in: 3600 }); }
        query = JSON.parse(String(init?.body)); return Response.json(body());
    };
    const reader = createAnalyticsReader(config, fetcher); const results = await Promise.all([reader.summary(30), reader.summary(30)]);
    assert.deepEqual(results[0], results[1]); assert.equal(calls, 2); await reader.summary(30); assert.equal(calls, 2);
    assert.deepEqual((results[0] as { totals: unknown }).totals, { visitors: 10, page_views: 20, sessions: 30 });
    assert.equal(query?.requests.length, 5); const filters = JSON.stringify(query); assert.ok(filters.includes('hostName') && filters.includes('example.org') && filters.includes('pagePath')); assert.ok(!filters.includes('/admin') && !filters.includes('token'));
    await assert.rejects(reader.summary(365), { status: 422 });
});
test('provider failure/malformed reports are unavailable, never zero reports; error bodies and secrets are not leaked', async () => {
    for (const response of [Response.json({ secret: 'private-token' }, { status: 403 }), Response.json({ reports: [] }), Response.json({ reports: body().reports.map(r => ({ ...r, rows: [{ metricValues: [] }] })) })]) {
        let calls = 0;
        const fetcher: typeof fetch = async url => { calls++; return String(url).includes('oauth2') ? Response.json({ access_token: 'private-token', expires_in: 3600 }) : response; };
        const reader = createAnalyticsReader(config, fetcher);
        await assert.rejects(reader.summary(7), error => { assert.equal((error as { status: number }).status, 503); assert.ok(!(error as Error).message.includes('private-token')); return true; });
        await assert.rejects(reader.summary(7), { status: 503 }); assert.equal(calls, 2, 'Error backoff prevents quota storms');
    }
});
test('valid empty reports yield zero; limitation metadata remains visible', async () => {
    const empty = body(); empty.reports.forEach(r => { r.rows = []; }); Object.assign(empty.reports[0]!.metadata, { subjectToThresholding: true });
    const fetcher: typeof fetch = async url => String(url).includes('oauth2') ? Response.json({ access_token: 'synthetic', expires_in: 3600 }) : Response.json(empty);
    const data = await createAnalyticsReader(config, fetcher).summary(7) as { totals: unknown; daily: unknown[]; limited: boolean };
    assert.deepEqual(data.totals, { visitors: 0, page_views: 0, sessions: 0 }); assert.deepEqual(data.daily, []); assert.equal(data.limited, true);
});

test('analytics routes require an active authenticated user and dashboard permission without provider effects', async () => {
    const { createApp } = await import('../src/app.js');
    const disabledConfig = { ...config, GA4_ENABLED: 'false' as const };
    let active = true, allowed = false;
    const p = {
        authClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'fixture' } }, error: null }) } }),
        db: { storage: { from: () => ({}) }, from: (table: string) => { assert.equal(table, 'application_users'); return { select: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: 'fixture', status: active ? 'active' : 'disabled', role: 'staff' }], error: null }) }) }) }; }, rpc: async (name: string) => { assert.equal(name, 'resolve_effective_permission_codes'); return { data: allowed ? [{ code: 'dashboard.view' }] : [], error: null }; } },
    } as unknown as import('../src/shared/providers.js').Providers;
    const server = createApp(disabledConfig, p).listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r)); const address = server.address(); assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/api/admin/analytics`;
    try {
        assert.equal((await fetch(url)).status, 401);
        const options = { headers: { Authorization: 'Bearer fixture' } };
        assert.equal((await fetch(url, options)).status, 403); active = false; assert.equal((await fetch(url + '/status', options)).status, 403);
        active = true; allowed = true; const good = await fetch(url, options); assert.equal(good.status, 200); assert.equal((await good.json() as { status: string }).status, 'not_configured'); assert.equal(good.headers.get('cache-control'), 'private, no-store');
        assert.equal((await fetch(url + '?days=365', options)).status, 422);
    } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});
