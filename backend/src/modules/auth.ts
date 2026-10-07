import { auditEvent } from '../shared/audit.js';
import type { Express, Request } from 'express';
import type { AuthResponse } from '@supabase/supabase-js';
import { z } from 'zod';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import type { Config } from '../config/env.js';
import type { Providers, AppUser } from '../shared/providers.js';
import { HttpError, providerError } from '../shared/errors.js';
const email = z.string().trim().toLowerCase().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
const password = z.string().min(8).max(128).refine(s => /[A-Za-z]/.test(s) && /\d/.test(s), 'Password must contain at least one letter and one number');
function authError(error: {
    status?: number;
} | null, detail: string) { if (!error)
    return; if (error.status && error.status < 500)
    throw new HttpError(401, detail); throw new HttpError(503, 'Authentication is temporarily unavailable'); }
export function authorization(p: Providers, c: Config) {
    const jwks = createRemoteJWKSet(new URL(`${c.SUPABASE_URL}/auth/v1/.well-known/jwks.json`), { timeoutDuration: c.SUPABASE_TIMEOUT_SECONDS * 1000 });
    async function user(req: Request): Promise<AppUser> {
        const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token)
            throw new HttpError(401, 'Authentication required');
        let id: string | undefined;
        try {
            const alg = decodeProtectedHeader(token).alg;
            if (alg === 'ES256' || alg === 'RS256') {
                const result = await jwtVerify(token, jwks, { issuer: `${c.SUPABASE_URL}/auth/v1`, audience: 'authenticated', algorithms: ['ES256', 'RS256'] });
                id = result.payload.sub;
            }
        }
        catch { /* Remote verification retains legacy signing and key rotation compatibility. */ }
        if (!id) {
            const result = await p.authClient().auth.getUser(token);
            authError(result.error, 'Invalid or expired token');
            id = result.data.user?.id;
        }
        if (!id)
            throw new HttpError(401, 'Invalid user');
        const row = await p.db.from('application_users').select('*').eq('auth_user_id', id).limit(1);
        providerError(row.error);
        const u = row.data?.[0] as AppUser | undefined;
        if (!u)
            throw new HttpError(403, 'User does not have admin access');
        if (u.status !== 'active')
            throw new HttpError(403, 'Account is not active');
        return u;
    }
    async function permissions(u: AppUser): Promise<string[]> { const r = await p.db.rpc('resolve_effective_permission_codes', { requested_user_id: u.id }); providerError(r.error); return (r.data || []).map((v: {
        code: string;
    }) => v.code).sort(); }
    async function require(req: Request, permission?: string, role?: 'admin' | 'super_admin') {
        const u = await user(req);
        if (role === 'super_admin' && u.role !== 'super_admin')
            throw new HttpError(403, 'Super admin access required');
        if (role === 'admin' && !['admin', 'super_admin'].includes(u.role))
            throw new HttpError(403, 'Admin access required');
        if (permission && !(await permissions(u)).includes(permission))
            throw new HttpError(403, 'Permission denied');
        return u;
    }
    return { user, permissions, require };
}
export type Authorization = ReturnType<typeof authorization>;
export function registerAuth(app: Express, p: Providers, c: Config, a: Authorization) {
    const publicUser = (u: AppUser) => ({ id: u.id, auth_user_id: u.auth_user_id, email: u.email, name: u.name || '', role: u.role, status: u.status });
    async function session(result: AuthResponse) {
        authError(result.error, 'Invalid email or password');
        const s = result.data.session;
        const id = result.data.user?.id;
        if (!s || !id)
            throw new HttpError(401, 'Invalid or expired token');
        const r = await p.db.from('application_users').select('*').eq('auth_user_id', id).limit(1);
        providerError(r.error);
        const u = r.data?.[0] as AppUser | undefined;
        if (!u || u.status !== 'active')
            throw new HttpError(403, 'Account is not active');
        return { access: s.access_token, refresh: s.refresh_token, expires_at: s.expires_at, expires_in: s.expires_in, user: publicUser(u) };
    }
    app.post('/api/auth/login', async (req, res) => { const body = z.object({ email, password }).parse(req.body); await p.rateLimit(`auth-login:${req.ip}:${body.email}`, 10, 300); try {
        const result = await session(await p.authClient().auth.signInWithPassword(body));
        await auditEvent(p, { action: 'LOGIN_SUCCESS', entity_type: 'authentication', actor_user_id: result.user.id, target_user_id: result.user.id, entity_id: result.user.id, reason: 'Password authentication succeeded', request_id: res.locals.requestId, is_sensitive: true });
        res.json(result);
    }
    catch (error) {
        await auditEvent(p, { action: 'LOGIN_FAILED', entity_type: 'authentication', reason: 'Authentication denied or unavailable', request_id: res.locals.requestId, is_sensitive: true });
        throw error;
    } });
    app.post('/api/auth/refresh', async (req, res) => { const body = z.object({ refresh: z.string().min(1) }).parse(req.body); const result = await p.authClient().auth.refreshSession({ refresh_token: body.refresh }); authError(result.error, 'Invalid or expired refresh token'); res.json(await session(result)); });
    app.get('/api/auth/me', async (req, res) => { const u = await a.user(req); res.json({ ...publicUser(u), permissions: await a.permissions(u) }); });
    app.post('/api/auth/forgot-password', async (req, res) => { const body = z.object({ email }).parse(req.body); await p.rateLimit(`auth-forgot-password:${req.ip}:${body.email}`, 3, 900); await p.authClient().auth.resetPasswordForEmail(body.email, { redirectTo: c.AUTH_REDIRECT_URL || `${c.FRONTEND_URL}/set-password` }); await auditEvent(p, { action: 'PASSWORD_RESET_REQUESTED', entity_type: 'authentication', reason: 'Password reset flow requested', request_id: res.locals.requestId, is_sensitive: true }); res.json({ message: 'If an account with that email exists, a reset link has been sent.' }); });
    app.post('/api/auth/change-password', async (req, res) => {
        const u = await a.user(req);
        const body = z.object({ current_password: z.string().min(1).max(128), new_password: password }).parse(req.body);
        const client = p.authClient();
        authError((await client.auth.signInWithPassword({ email: u.email, password: body.current_password })).error, 'Current password is incorrect');
        providerError((await client.auth.updateUser({ password: body.new_password })).error);
        await auditEvent(p, { action: 'PASSWORD_CHANGED', entity_type: 'authentication', actor_user_id: u.id, target_user_id: u.id, entity_id: u.id, reason: 'Authenticated user changed password', request_id: res.locals.requestId, is_sensitive: true });
        res.json({ message: 'Password changed successfully.' });
    });
    app.post('/api/auth/set-password', async (req, res) => {
        const body = z.object({ access_token: z.string().min(1), password, first_name: z.string().max(100).nullable().optional(), last_name: z.string().max(100).nullable().optional() }).parse(req.body);
        const result = await p.authClient().auth.getUser(body.access_token);
        authError(result.error, 'The reset link is invalid or has expired');
        const id = result.data.user?.id;
        if (!id)
            throw new HttpError(400, 'The reset link is invalid or has expired');
        const row = await p.db.from('application_users').select('*').eq('auth_user_id', id).limit(1);
        providerError(row.error);
        const u = row.data?.[0];
        if (!u)
            throw new HttpError(403, 'User does not have admin access');
        if (u.status === 'disabled')
            throw new HttpError(403, 'This account is disabled.');
        if (u.invitation_expires_at && Date.parse(u.invitation_expires_at) < Date.now() && u.status !== 'active')
            throw new HttpError(410, 'This invitation has expired. Request a new invitation.');
        providerError((await p.db.auth.admin.updateUserById(id, { password: body.password, ...(body.first_name !== undefined || body.last_name !== undefined ? { user_metadata: { first_name: body.first_name || '', last_name: body.last_name || '' } } : {}) })).error);
        providerError((await p.db.rpc('rbac_activate_invited_user', { target_auth_user_id: id, event_request_id: res.locals.requestId })).error);
        await auditEvent(p, { action: 'PASSWORD_SET', entity_type: 'authentication', actor_user_id: u.id, target_user_id: u.id, entity_id: u.id, reason: 'Invitation or recovery password completed', request_id: res.locals.requestId, is_sensitive: true });
        res.json({ message: 'Password has been set successfully.' });
    });
}
