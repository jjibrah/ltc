import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import type { Providers } from '../src/shared/providers.js';
import { billingServiceInput, paymentInput, settingsInput } from '../src/modules/operations.js';
const id = '11111111-1111-4111-8111-111111111111';
const service = { name: 'AWS', category: 'hosting', owner: 'Finance', amount: '12.50', currency: 'USD', cycle: 'usage_based', next_due_date: '2026-11-01', portal_url: 'https://console.example.invalid/', notes: '', active: true };
const payment = { amount: '12.50', currency: 'USD', paid_on: '2026-10-07', next_due_date: '2026-11-07', reference: 'Invoice 123', expected_updated_at: '2026-10-07T00:00:00Z', idempotency_key: id };
test('billing validation rejects unsafe URLs, excessive precision, unknown fields and invalid payment deadlines', () => {
    assert.equal(billingServiceInput.safeParse(service).success, true);
    for (const patch of [{ portal_url: 'javascript:alert(1)' }, { portal_url: 'https://name:secret@example.invalid' }, { amount: '1.001' }, { amount: '-1' }, { amount: '1e2' }, { next_due_date: '2026-02-30' }, { admin: true }]) assert.equal(billingServiceInput.safeParse({ ...service, ...patch }).success, false);
    assert.equal(paymentInput.safeParse(payment).success, true);
    assert.equal(paymentInput.safeParse({ ...payment, next_due_date: payment.paid_on }).success, false);
    assert.equal(settingsInput.safeParse({ analytics_provider: 'none', analytics_dashboard_url: 'https://example.invalid' }).success, false);
    assert.equal(settingsInput.safeParse({ analytics_provider: 'google_analytics', analytics_dashboard_url: '' }).success, false);
});
test('billing endpoints enforce roles/finance permission, validation, missing storage, stale edits and payment failures', async () => {
    let role = 'staff', finance = false, effects = 0, missing = false, stale = false, rpcError: string | null = null;
    let lastRpc: Record<string, unknown> | undefined;
    const p = {
        authClient: () => ({ auth: { getUser: async () => ({ data: { user: { id } }, error: null }) } }),
        db: {
            storage: { from: () => ({}) },
            from: (table: string) => {
                let mode = 'select';
                const q: Record<string, unknown> = {};
                for (const method of ['select', 'eq', 'order', 'limit', 'update', 'insert', 'upsert']) q[method] = () => { if (['update', 'insert', 'upsert'].includes(method)) mode = method; return q; };
                q.then = (resolve: (r: unknown) => void) => {
                    if (table === 'application_users') return resolve({ data: [{ id, auth_user_id: id, role, status: 'active' }], error: null });
                    effects++;
                    if (missing) return resolve({ data: null, error: { code: '42P01' } });
                    return resolve({ data: stale && mode === 'update' ? [] : [{ ...service, id, updated_at: payment.expected_updated_at }], error: null });
                }; return q;
            },
            rpc: async (name: string, args: Record<string, unknown>) => {
                if (name === 'resolve_effective_permission_codes') return { data: finance ? [{ code: 'donations.view' }] : [], error: null };
                effects++; lastRpc = args; return { data: { service: { ...service, id }, payment: { id } }, error: rpcError ? { code: rpcError } : null };
            },
        },
    } as unknown as Providers;
    const config = loadConfig({ APP_ENV: 'test', SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture' });
    const server = createApp(config, p).listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r)); const address = server.address(); assert.ok(address && typeof address !== 'string');
    const call = (path: string, method = 'GET', body?: unknown, authenticated = true) => fetch(`http://127.0.0.1:${address.port}/api/admin/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer fixture' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    try {
        assert.equal((await call('billing', 'GET', undefined, false)).status, 401);
        assert.equal((await call('billing')).status, 403); assert.equal(effects, 0);
        finance = true; assert.equal((await call('billing')).status, 200);
        const reads = effects;
        for (const [path, method, body] of [['billing', 'POST', service], [`billing/${id}`, 'PATCH', { ...service, expected_updated_at: payment.expected_updated_at }], [`billing/${id}/payments`, 'POST', payment], ['operations-settings', 'PUT', { analytics_provider: 'none', analytics_dashboard_url: '' }]] as const) assert.equal((await call(path, method, body)).status, 403);
        assert.equal(effects, reads, 'Read-only finance cannot mutate any operations record');
        role = 'super_admin'; assert.equal((await call('billing', 'POST', { ...service, amount: '1.001' })).status, 422); assert.equal(effects, reads);
        assert.equal((await call('billing', 'POST', service)).status, 201);
        missing = true; const unavailable = await call('billing'); assert.equal(unavailable.status, 503); assert.match((await unavailable.json() as { detail: string }).detail, /manual billing migration/); missing = false;
        stale = true; assert.equal((await call(`billing/${id}`, 'PATCH', { ...service, expected_updated_at: payment.expected_updated_at })).status, 409); stale = false;
        for (const [code, status] of [['40001', 409], ['23505', 409], ['22023', 422], ['42501', 403], ['PGRST202', 503]] as const) { rpcError = code; assert.equal((await call(`billing/${id}/payments`, 'POST', payment)).status, status); }
        rpcError = null; assert.equal((await call(`billing/${id}/payments`, 'POST', payment)).status, 201); assert.equal(lastRpc?.submission_key, payment.idempotency_key); assert.equal(lastRpc?.expected_version, payment.expected_updated_at); assert.equal(lastRpc?.actor_uuid, id);
    } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});
