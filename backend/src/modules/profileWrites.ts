import type { Express } from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import type { Providers } from '../shared/providers.js';
import type { Config } from '../config/env.js';
import type { Authorization } from './auth.js';
import { rows, one, page, normalizedEmail, type Row } from '../shared/data.js';
import { HttpError, providerError } from '../shared/errors.js';
import { upload, imageFile } from '../shared/uploads.js';
import { trackedBucket } from '../jobs/storageCleanup.js';
const fields = z.object({ name: z.string().min(1).max(255).optional(), email: normalizedEmail.optional(), role: z.string().min(1).max(255).optional(), department: z.string().max(255).optional(), quote: z.string().max(500).optional(), bio: z.string().max(5000).optional() });
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export function registerProfileWrites(app: Express, p: Providers, c: Config, a: Authorization) {
    const bucket = trackedBucket(p, c.PROFILE_IMAGE_BUCKET);
    const view = (r: Row) => ({ id: r.id, name: r.name, role: r.role, department: r.department, quote: r.quote, bio: r.bio, status: r.status, display_order: r.display_order ?? 0, created_at: r.created_at, updated_at: r.updated_at, email: r.email, submission_link_id: r.submission_link_id, image_url: r.image_path ? bucket.getPublicUrl(String(r.image_path)).data.publicUrl : null });
    async function patch(id: unknown, values: Row, file: Express.Multer.File | undefined) {
        const existing = one(await p.db.from('team_profiles').select('*').eq('id', id).limit(1), 'Team profile not found');
        const image = await imageFile(file);
        if (image && existing.image_path) await bucket.remove([String(existing.image_path)]);
        let path: string | undefined;
        let committed = false;
        try {
            if (image) {
                path = `profiles/${randomUUID()}-${randomBytes(8).toString('hex')}${image.extension}`;
                providerError((await bucket.upload(path, image.bytes, { contentType: image.type, upsert: false })).error);
                values.image_path = path;
            }
            const row = Object.keys(values).length ? one(await p.db.from('team_profiles').update(values).eq('id', id).select(), 'Team profile not found') : existing;
            committed = true;
            return view(row);
        }
        catch (e) {
            if (path && !committed)
                await bucket.remove([path]);
            throw e;
        }
    }
    app.patch('/api/admin/team-profiles/:id', async (req, res, next) => { try {
        await a.require(req, 'profiles.update');
        next();
    }
    catch (e) {
        next(e);
    } }, upload('image'), async (req, res) => { res.json(await patch(req.params.id, fields.parse(req.body), req.file)); });
    for (const method of ['post', 'patch'] as const)
        app[method]('/api/admin/my-team-profile', async (req, res, next) => { try {
            res.locals.user = await a.user(req);
            next();
        }
        catch (e) {
            next(e);
        } }, upload('image'), async (req, res) => { const u = res.locals.user; if (c.PRIMARY_SUPER_ADMIN_ID && u.id === c.PRIMARY_SUPER_ADMIN_ID)
            throw new HttpError(403, 'The primary super admin profile can only be managed by the LTC team.'); const values: Row = fields.parse(req.body); delete values.email; const existing = rows(await p.db.from('team_profiles').select('*').ilike('email', u.email).order('created_at', { ascending: false }).limit(1))[0]; if (method === 'post') {
            if (existing)
                throw new HttpError(409, 'A team profile is already linked to this account');
            if (!values.name || !values.role)
                throw new HttpError(422, 'Name and role are required');
            const created = one(await p.db.from('team_profiles').insert({ ...values, email: u.email, status: 'pending' }).select(), 'Unable to create team profile');
            res.json(req.file ? await patch(created.id, {}, req.file) : view(created));
        }
        else {
            if (!existing)
                throw new HttpError(404, 'No team profile is linked to this account');
            res.json(await patch(existing.id, values, req.file));
        } });
    app.delete('/api/admin/team-profiles/:id', async (req, res) => {
        await a.require(req, 'profiles.delete');
        const r=one(await p.db.from('team_profiles').select('*').eq('id',req.params.id).limit(1),'Team profile not found');
        if(r.image_path) await bucket.remove([String(r.image_path)]);
        one(await p.db.from('team_profiles').delete().eq('id',req.params.id).select(),'Team profile not found');
        res.json({ message: 'Team profile deleted.', id: req.params.id });
    });
    app.post('/api/admin/team-profiles/reorder', async (req, res) => { await a.require(req, 'profiles.update'); const b = z.object({ profile_ids: z.array(z.string()).min(1).max(200) }).parse(req.body); const r = await p.db.rpc('ltc_reorder_profiles', { profile_ids: b.profile_ids }); providerError(r.error); res.json(rows(r).map(view)); });
    const durations = { '15m': 900, '1h': 3600, '24h': 86400, '3d': 259200, '7d': 604800 };
    async function valid(token: string) { if (!token || token.length > 256)
        throw new HttpError(400, 'Invalid or expired submission link'); const link = rows(await p.db.from('profile_submission_links').select('*').eq('token_hash', hash(token)).limit(1))[0]; if (!link || link.revoked_at || Date.parse(String(link.expires_at)) <= Date.now())
        throw new HttpError(400, 'Invalid or expired submission link'); return link; }
    app.post('/api/admin/profile-submission-links', async (req, res) => { const u = await a.require(req, 'profiles.update'); const b = z.object({ expires_in: z.enum(['15m', '1h', '24h', '3d', '7d']).default('7d') }).parse(req.body); const token = randomBytes(32).toString('base64url'); const r = one(await p.db.from('profile_submission_links').insert({ token_hash: hash(token), created_by: u.id, expires_at: new Date(Date.now() + durations[b.expires_in] * 1000).toISOString() }).select(), 'Unable to create submission link'); res.status(201).json({ id: r.id, url: `${c.FRONTEND_URL}/profile/submit/${token}`, token, expires_at: r.expires_at, status: 'active' }); });
    app.get('/api/admin/profile-submission-links', async (req, res) => { await a.require(req, 'profiles.view'); const { limit, offset } = page(req.query, 100); const links = rows(await p.db.from('profile_submission_links').select('id,created_by,expires_at,used_at,revoked_at,created_at').order('created_at', { ascending: false }).range(offset, offset + limit - 1)); const result = []; for (const link of links) {
        const r = await p.db.from('team_profiles').select('id', { count: 'exact', head: true }).eq('submission_link_id', link.id);
        providerError(r.error);
        const count = r.count || 0;
        result.push({ ...link, submissions: count, max_submissions: 100, status: link.revoked_at ? 'revoked' : Date.parse(String(link.expires_at)) <= Date.now() ? 'expired' : count >= 100 ? 'full' : 'active' });
    } res.json(result); });
    app.post('/api/admin/profile-submission-links/:id/revoke', async (req, res) => { await a.require(req, 'profiles.update'); one(await p.db.from('profile_submission_links').update({ revoked_at: new Date().toISOString() }).eq('id', req.params.id).select(), 'Submission link not found'); res.json({ id: req.params.id, status: 'revoked', message: 'Submission link revoked.' }); });
    app.get('/api/profile-submission-links/:token/validate', async (req, res) => { const token = String(req.params.token); await p.rateLimit(`profile-token-validate:${req.ip}:${token}`, 20, 300); const link = await valid(token); res.json({ valid: true, link_id: link.id, expires_at: link.expires_at }); });
    app.post('/api/profile-submissions/:token', async (req, res) => { const token = String(req.params.token); await p.rateLimit(`profile-token-submit:${req.ip}:${token}`, 10, 3600); await valid(token); const b = fields.extend({ email: z.string().max(320).optional().transform(s => s?.trim().toLowerCase()), name: z.string().min(1).max(255).transform(s => s.trim()).refine(Boolean), role: z.string().min(1).max(255).transform(s => s.trim()).refine(Boolean) }).parse(req.body); const r = await p.db.rpc('ltc_submit_profile', { token_digest: hash(token), profile_values: b }); providerError(r.error); res.status(201).json({ message: 'Profile submitted successfully.', profile: Array.isArray(r.data) ? r.data[0] : r.data }); });
    app.post('/api/profile-submissions/:token/image', async (req, res, next) => { try {
        const token = String(req.params.token);
        await p.rateLimit(`profile-token-image:${req.ip}:${token}`, 10, 3600);
        res.locals.link = await valid(token);
        next();
    }
    catch (e) {
        next(e);
    } }, upload('file'), async (req, res) => { let q = p.db.from('team_profiles').select('*').eq('submission_link_id', res.locals.link.id); if (req.query.profile_id)
        q = q.eq('id', z.string().parse(req.query.profile_id)); const r = rows(await q.order('created_at', { ascending: false }).limit(1))[0]; if (!r || !['pending', 'changes_requested'].includes(String(r.status)))
        throw new HttpError(400, 'Profile is not eligible for an image upload'); if (!req.file)
        throw new HttpError(422, 'Image file is required'); const updated = await patch(r.id, {}, req.file); const stored = one(await p.db.from('team_profiles').select('image_path').eq('id', r.id).limit(1), 'Team profile not found'); res.json({ message: 'Profile image uploaded successfully.', profile_id: r.id, image_path: stored.image_path, image_url: updated.image_url }); });
}
