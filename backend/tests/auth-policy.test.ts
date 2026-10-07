import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorization } from '../src/modules/auth.js';
import { loadConfig } from '../src/config/env.js';
import type { Providers } from '../src/shared/providers.js';
import type { Request } from 'express';
const config = loadConfig({ SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture' });
function policy(role: string, status = 'active', permissions: string[] = []) { return authorization({ authClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'auth-fixture' } }, error: null }) } }), db: { from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: 'fixture', auth_user_id: 'auth-fixture', email: 'fixture@example.invalid', role, status }], error: null }) }) }) }), rpc: async () => ({ data: permissions.map(code => ({ code })), error: null }) } } as unknown as Providers, config); }
const req = { headers: { authorization: 'Bearer fixture' } } as Request;
test('disabled account cannot authenticate even with a valid auth token', async () => { await assert.rejects(policy('super_admin', 'disabled', ['users.view']).user(req), { status: 403 }); });
test('super-admin-only restrictions apply independently from custom permissions', async () => { for (const role of ['admin', 'staff', 'viewer'])
    await assert.rejects(policy(role, 'active', ['users.manage_permissions']).require(req, undefined, 'super_admin'), { status: 403 }); assert.equal((await policy('super_admin').require(req, undefined, 'super_admin')).role, 'super_admin'); });
test('effective permission matrix is database authoritative across all roles', async () => { for (const role of ['super_admin', 'admin', 'staff', 'viewer']) {
    await assert.rejects(policy(role, 'active', []).require(req, 'stories.publish'), { status: 403 });
    assert.equal((await policy(role, 'active', ['stories.view']).require(req, 'stories.view')).role, role);
} });
