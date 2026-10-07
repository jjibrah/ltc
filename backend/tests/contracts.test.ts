import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import type { Providers } from '../src/shared/providers.js';
const normalize = (path: string) => path.replace(/\{[^}]+\}|:[^/]+/g, ':param').replace(/\/$/, '');
test('every legacy method/path is registered without relying on a catchall', () => {
    const config = loadConfig({ APP_ENV: 'test', SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture' });
    const p = { db: { storage: { from: () => ({}) } } } as unknown as Providers;
    const app = createApp(config, p);
    const stack = app.router.stack as {
        route?: {
            path: string;
            methods: Record<string, boolean>;
        };
    }[];
    const registered = new Set(stack.flatMap(layer => layer.route ? Object.keys(layer.route.methods).map(method => `${method.toUpperCase()} ${normalize(layer.route!.path)}`) : []));
    const inventory = JSON.parse(readFileSync('docs/legacy-contracts.json', 'utf8')) as {
        method: string;
        path: string;
    }[];
    const missing = inventory.filter(r => !registered.has(`${r.method} ${normalize(r.path)}`));
    assert.deepEqual(missing, []);
    assert.equal(inventory.length, 90);
});

test('every legacy protected route rejects missing or disabled credentials before provider effects', async () => {
    const config = loadConfig({ APP_ENV: 'test', SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture' });
    let effects = 0;
    const p = {
        authClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'disabled-auth-fixture' } }, error: null }) } }),
        db: { storage: { from: () => ({}) }, from: (table: string) => {
            if (table !== 'application_users') { effects++; throw new Error('Unexpected database access'); }
            return { select: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: 'disabled-fixture', role: 'super_admin', status: 'disabled' }], error: null }) }) }) };
        } }
    } as unknown as Providers;
    const inventory = JSON.parse(readFileSync('docs/legacy-contracts.json', 'utf8')) as { method: string; path: string; contract: string; router: string }[];
    const protectedRoutes = inventory.filter(r => /Depends\((?:get_current_user|require_permission|require_super_admin|require_admin)/.test(r.contract + r.router));
    assert.ok(protectedRoutes.length > 50);
    const server = createApp(config, p).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    try {
        for (const disabled of [false, true]) for (const route of protectedRoutes) {
            const path = route.path.replace(/\{[^}]+\}/g, 'fixture');
            const response: Response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method: route.method, headers: disabled ? { Authorization: 'Bearer disabled-fixture' } : {} });
            assert.equal(response.status, disabled ? 403 : 401, `${route.method} ${route.path}, disabled=${disabled}`);
            const body = await response.json() as { detail?: unknown };
            assert.equal(typeof body.detail, 'string');
        }
        assert.equal(effects, 0);
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});
