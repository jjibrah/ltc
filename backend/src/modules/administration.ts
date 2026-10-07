import type { Express } from 'express';
import { z } from 'zod';
import type { Providers, AppUser } from '../shared/providers.js';
import type { Config } from '../config/env.js';
import type { Authorization } from './auth.js';
import { rows, one, page, normalizedEmail, type Row } from '../shared/data.js';
import { HttpError, providerError } from '../shared/errors.js';
const reason = z.string().min(3).max(1000);
const role = z.enum(['super_admin', 'admin', 'staff', 'viewer']);
const codes = z.array(z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/)).max(100).default([]).transform(v => [...new Set(v)].sort());
const fields = 'id,auth_user_id,email,name,role,status,permissions_version,activated_at,invited_at,invitation_expires_at,invitation_completed_at,invited_by,last_active_at,created_at,updated_at';
export function registerAdministration(app: Express, p: Providers, c: Config, a: Authorization) {
    const catalogue = async () => rows(await p.db.from('permissions').select('id,code,module,action,description,is_sensitive,is_system_only').order('module').order('code'));
    const getUser = async (id: unknown) => one(await p.db.from('application_users').select(fields).eq('id', id).limit(1), 'User not found');
    async function userAuthorization(id: unknown) { const user = await getUser(id); const overrides = rows(await p.db.from('user_permission_overrides').select('effect,reason,permissions(code,module,action,description,is_sensitive,is_system_only)').eq('user_id', id)); const defaults = user.role === 'super_admin' ? (await catalogue()).map(r => r.code) : rows(await p.db.from('role_permissions').select('permissions(code)').eq('role', user.role)).map(r => (r.permissions as Row)?.code).filter(Boolean).sort(); return { user, overrides, role_default_permissions: defaults, effective_permissions: user.status === 'active' ? await a.permissions(user as unknown as AppUser) : [] }; }
    app.get('/api/admin/users', async (req, res) => { await a.require(req, 'users.view'); const { limit, offset } = page(req.query, 100, 100); const filters = z.object({ status: z.string().optional(), role: z.string().optional(), search: z.string().max(100).optional() }).parse(req.query); let q = p.db.from('application_users').select(fields).order('created_at', { ascending: false }); if (filters.status)
        q = q.eq('status', filters.status); if (filters.role)
        q = q.eq('role', filters.role); const search = filters.search?.trim().replace(/[^a-zA-Z0-9@._+\- ]/g, ''); if (search)
        q = q.or(`email.ilike.%${search}%,name.ilike.%${search}%`); res.json(rows(await q.range(offset, offset + limit - 1))); });
    app.get('/api/admin/users/:id', async (req, res) => { await a.require(req, 'users.view'); res.json(await getUser(req.params.id)); });
    app.get('/api/admin/permissions', async (req, res) => { await a.require(req, undefined, 'super_admin'); res.json(await catalogue()); });
    app.get('/api/admin/users/:id/permissions', async (req, res) => { await a.require(req, undefined, 'super_admin'); res.json(await userAuthorization(req.params.id)); });
    app.get('/api/admin/role-permissions', async (req, res) => { await a.require(req, undefined, 'super_admin'); const result: Record<string, unknown[]> = { super_admin: (await catalogue()).map(r => r.code), admin: [], staff: [], viewer: [] }; for (const r of rows(await p.db.from('role_permissions').select('role,permissions(code)'))) {
        const code = (r.permissions as Row)?.code;
        if (code && r.role !== 'super_admin')
            result[String(r.role)]?.push(code);
    } res.json({ roles: result }); });
    app.get('/api/admin/user-authorizations', async (req, res) => { await a.require(req, undefined, 'super_admin'); const result: Record<string, string[]> = {}; for (let offset = 0;; offset += 100) {
        const users = rows(await p.db.from('application_users').select('id,role,status').order('id').range(offset, offset + 99));
        for (const u of users)
            result[String(u.id)] = u.status === 'active' ? await a.permissions(u as unknown as AppUser) : [];
        if (users.length < 100)
            break;
    } res.json(result); });
    for (const reset of [false, true])
        app[reset ? 'post' : 'put'](`/api/admin/users/:id/permissions${reset ? '/reset' : ''}`, async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); const b = (reset ? z.object({ reason }) : z.object({ grants: codes, denies: codes, reason })).parse(req.body); const grants = 'grants' in b ? b.grants : []; const denies = 'denies' in b ? b.denies : []; const r = await p.db.rpc('rbac_replace_user_permission_overrides', { actor_id: actor.id, target_id: req.params.id, grant_codes: grants, deny_codes: denies, change_reason: b.reason, event_request_id: res.locals.requestId, event_ip_hash: null }); providerError(r.error); res.json(await userAuthorization(req.params.id)); });
    app.put('/api/admin/roles/:role/permissions', async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); if (req.params.role === 'super_admin')
        throw new HttpError(403, 'Super admin permissions are managed by the system and cannot be changed.'); const target = z.enum(['admin', 'staff', 'viewer']).parse(req.params.role); const b = z.object({ permissions: codes, reason }).parse(req.body); const r = await p.db.rpc('rbac_replace_role_permissions', { actor_id: actor.id, target_role: target, permission_codes: b.permissions, change_reason: b.reason, event_request_id: res.locals.requestId, event_ip_hash: null }); providerError(r.error); res.json({ role: target, permissions: rows(r).map(r => r.code).sort() }); });
    for (const kind of ['role', 'status'] as const)
        app.patch(`/api/admin/users/:id/${kind}`, async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); const b = z.object({ role: role.optional(), status: z.enum(['invited', 'active', 'disabled']).optional(), reason }).parse(req.body); if (!b[kind])
            throw new HttpError(422, `${kind} is required`); providerError((await p.db.rpc(`rbac_set_user_${kind}`, { actor_id: actor.id, target_id: req.params.id, [`new_${kind}`]: b[kind], change_reason: b.reason, event_request_id: res.locals.requestId, event_ip_hash: null })).error); res.json(await userAuthorization(req.params.id)); });
    for (const [action, status] of [['disable', 'disabled'], ['enable', 'active']])
        app.post(`/api/admin/users/:id/${action}`, async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); providerError((await p.db.rpc('rbac_set_user_status', { actor_id: actor.id, target_id: req.params.id, new_status: status, change_reason: `Account ${action}d`, event_request_id: res.locals.requestId, event_ip_hash: null })).error); res.json(await userAuthorization(req.params.id)); });
    app.patch('/api/admin/users/:id', async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); const b = z.object({ name: z.string().min(1).max(255).optional() }).parse(req.body); if (!Object.keys(b).length)
        throw new HttpError(422, 'At least one user field is required'); const before = await getUser(req.params.id); const updated = one(await p.db.from('application_users').update(b).eq('id', req.params.id).select(fields), 'User not found'); await p.db.from('audit_events').insert({ action: 'USER_UPDATED', entity_type: 'application_user', actor_user_id: actor.id, target_user_id: req.params.id, entity_id: req.params.id, before_state: { name: before.name }, after_state: b, reason: 'Application user details updated', request_id: res.locals.requestId }); res.json(updated); });
    app.post('/api/admin/users/invitations', async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); const b = z.object({ email: normalizedEmail, name: z.string().min(1).max(255).transform(s => s.trim()), role: role.default('staff') }).parse(req.body); if (rows(await p.db.from('application_users').select('id').eq('email', b.email).limit(1)).length)
        throw new HttpError(409, 'An application account already exists for this email.'); const invite = await p.db.auth.admin.inviteUserByEmail(b.email, { redirectTo: c.AUTH_REDIRECT_URL || `${c.FRONTEND_URL}/set-password`, data: { name: b.name } }); providerError(invite.error); const id = invite.data.user?.id; if (!id)
        throw new HttpError(503, 'The invitation provider is unavailable'); const r = await p.db.rpc('rbac_create_invited_application_user', { actor_id: actor.id, invited_auth_user_id: id, invited_name: b.name, invited_email: b.email, invited_role: b.role, event_request_id: res.locals.requestId }); if (r.error) {
        await p.db.auth.admin.deleteUser(id);
        providerError(r.error);
    } res.status(201).json({ user: Array.isArray(r.data) ? r.data[0] : r.data, message: 'Invitation sent successfully.' }); });
    app.post('/api/admin/users/:id/invitation/resend', async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); await p.rateLimit(`invitation-resend:${req.ip}:${req.params.id}`, 5, 3600); const u = await getUser(req.params.id); if (u.status !== 'invited')
        throw new HttpError(409, 'Only pending invitations can be resent'); providerError((await p.db.auth.admin.inviteUserByEmail(String(u.email), { redirectTo: c.AUTH_REDIRECT_URL || `${c.FRONTEND_URL}/set-password`, data: { name: u.name } })).error); const r = await p.db.rpc('rbac_resend_invitation', { actor_id: actor.id, target_id: req.params.id, event_request_id: res.locals.requestId }); providerError(r.error); res.json({ user: Array.isArray(r.data) ? r.data[0] : r.data, message: 'Invitation resent successfully.' }); });
    app.post('/api/admin/users/:id/invitation/revoke', async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); const b = z.object({ reason }).parse(req.body); const u = await getUser(req.params.id); if (u.status !== 'invited')
        throw new HttpError(409, 'Only pending invitations can be revoked'); const r = await p.db.rpc('rbac_revoke_invitation', { actor_id: actor.id, target_id: req.params.id, revoke_reason: b.reason, event_request_id: res.locals.requestId }); providerError(r.error); let pending = false; if (u.auth_user_id) {
        const del = await p.db.auth.admin.deleteUser(String(u.auth_user_id));
        pending = !!del.error;
        providerError((await p.db.rpc(pending ? 'rbac_record_invitation_cleanup_failure' : 'rbac_finalize_invitation_cleanup', { target_id: req.params.id, ...(pending ? { failure_reason: 'Auth provider cleanup failed' } : {}) })).error);
    } res.json({ user: Array.isArray(r.data) ? r.data[0] : r.data, cleanup_pending: pending, message: 'Invitation revoked successfully.' }); });
    app.post('/api/admin/users/:id/regenerate-password', async (req, res) => { await a.require(req, undefined, 'super_admin'); const u = await getUser(req.params.id); const r = await p.db.auth.admin.generateLink({ type: 'recovery', email: String(u.email), options: { redirectTo: c.AUTH_REDIRECT_URL || `${c.FRONTEND_URL}/set-password` } }); providerError(r.error); res.json({ user: u, invitation_link: r.data.properties?.action_link, message: 'Password reset link generated.' }); });
    app.delete('/api/admin/users/:id', async (req, res) => { const actor = await a.require(req, undefined, 'super_admin'); const b = z.object({ reason }).parse(req.body); const r = await p.db.rpc('rbac_delete_application_user', { actor_id: actor.id, target_id: req.params.id, delete_reason: b.reason, event_request_id: res.locals.requestId }); providerError(r.error); const id = Array.isArray(r.data) ? r.data[0] : r.data; if (!id)
        throw new HttpError(400, 'Unable to delete this user. The account may be protected.'); const del = await p.db.auth.admin.deleteUser(String(id)); res.json({ message: 'User deleted successfully.', auth_cleanup_pending: !!del.error }); });
}
