import type { Express } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { Providers } from '../shared/providers.js';
import type { Config } from '../config/env.js';
import type { Authorization } from './auth.js';
import { rows, one, page, normalizedEmail, type Row } from '../shared/data.js';
import { HttpError, providerError } from '../shared/errors.js';
export function registerContent(app: Express, p: Providers, c: Config, a: Authorization) {
    const story = (r: Row, admin = false) => ({ id: r.id, name: r.name, published_date: r.published_date, excerpt: r.excerpt, content: r.content, photo: r.photo_path ? p.db.storage.from(c.STORY_IMAGE_BUCKET).getPublicUrl(String(r.photo_path)).data.publicUrl : null, ...(admin ? { photo_path: r.photo_path, order: r.order, is_published: r.is_published, created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at } : {}) });
    const profile = (r: Row, admin = false) => ({ id: r.id, name: r.name, role: r.role, department: r.department, quote: r.quote, bio: r.bio, image_url: r.image_path ? p.db.storage.from(c.PROFILE_IMAGE_BUCKET).getPublicUrl(String(r.image_path)).data.publicUrl : null, status: r.status, display_order: r.display_order ?? 0, created_at: r.created_at, updated_at: r.updated_at, ...(admin ? { email: r.email, submission_link_id: r.submission_link_id } : {}) });
    for (const path of ['/api/stories', '/api/admin/stories']) {
        const admin = path.includes('/admin/');
        app.get(path, async (req, res) => { if (admin)
            await a.require(req, 'stories.view'); const { limit, offset } = page(req.query); let q = p.db.from('stories').select('*').order('order', { ascending: true }); if (!admin)
            q = q.eq('is_published', true).order('created_at', { ascending: false }); res.json(rows(await q.range(offset, offset + limit - 1)).map(r => story(r, admin))); });
    }
    app.get('/api/stories/:id', async (req, res) => { const r = one(await p.db.from('stories').select('*').eq('id', req.params.id).eq('is_published', true).limit(1), 'Story not found'); res.json(story(r)); });
    for (const path of ['/api/team-profiles', '/api/team-profiles/published', '/api/admin/team-profiles']) {
        const admin = path.includes('/admin/');
        app.get(path, async (req, res) => { if (admin)
            await a.require(req, 'profiles.view'); const { limit, offset } = page(req.query, admin ? 100 : 50); let q = p.db.from('team_profiles').select('*').order('display_order').order('created_at'); if (!admin)
            q = q.eq('status', 'published');
        else {
            const filters = z.object({ status: z.string().optional(), department: z.string().max(255).optional(), search: z.string().max(100).optional() }).parse(req.query);
            if (filters.status)
                q = q.eq('status', filters.status);
            if (filters.department)
                q = q.eq('department', filters.department);
            const search = filters.search?.trim().replace(/[^a-zA-Z0-9@._+\- ]/g, '');
            if (search)
                q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%`);
        } res.json(rows(await q.range(offset, offset + limit - 1)).map(r => profile(r, admin))); });
    }
    for (const path of ['/api/team-profiles/:id', '/api/admin/team-profiles/:id']) {
        const admin = path.includes('/admin/');
        app.get(path, async (req, res) => { if (admin)
            await a.require(req, 'profiles.view'); let q = p.db.from('team_profiles').select('*').eq('id', req.params.id); if (!admin)
            q = q.eq('status', 'published');
        else {
            const filters = z.object({ status: z.string().optional(), department: z.string().max(255).optional(), search: z.string().max(100).optional() }).parse(req.query);
            if (filters.status)
                q = q.eq('status', filters.status);
            if (filters.department)
                q = q.eq('department', filters.department);
            const search = filters.search?.trim().replace(/[^a-zA-Z0-9@._+\- ]/g, '');
            if (search)
                q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%`);
        } res.json(profile(one(await q.limit(1), 'Team profile not found'), admin)); });
    }
    app.get('/api/admin/my-team-profile', async (req, res) => { const u = await a.user(req); res.json(profile(one(await p.db.from('team_profiles').select('*').ilike('email', u.email).order('created_at', { ascending: false }).limit(1), 'No team profile is linked to this account'), true)); });
    for (const [action, status, permission] of [['publish', 'published', 'profiles.publish'], ['unpublish', 'pending', 'profiles.publish'], ['reject', 'rejected', 'profiles.update'], ['request-changes', 'changes_requested', 'profiles.update']] as const) {
        app.post(`/api/admin/team-profiles/:id/${action}`, async (req, res) => { await a.require(req, permission); res.json(profile(one(await p.db.from('team_profiles').update({ status }).eq('id', req.params.id).select(), 'Team profile not found'), true)); });
    }
    const mentor = z.object({ name: z.string().min(2).max(150).transform(s => s.trim()).refine(Boolean), email: normalizedEmail, background: z.string().min(2).max(500).transform(s => s.trim()).refine(Boolean), helpOptions: z.array(z.enum(['Career Guidance', 'Job Shadowing', 'Skills Workshop', 'Networking / Introductions', 'University Guidance', 'Other'])).min(1).max(6).transform(v => [...new Set(v)]), contactMethod: z.enum(['Email', 'WhatsApp', 'Either']).default('Email'), message: z.string().max(2000).nullable().optional().transform(v => v?.trim() || null) });
    app.post('/api/mentors/applications/', async (req, res) => { const b = mentor.parse(req.body); await p.rateLimit(`mentor-application:${req.ip}:${b.email}`, 5, 300); const r = one(await p.db.from('mentor_applications').insert({ full_name: b.name, email: b.email, professional_background: b.background, help_options: b.helpOptions, preferred_contact_method: b.contactMethod, message: b.message, status: 'pending' }).select(), 'Mentor request not saved'); res.status(201).json({ id: r.id, message: 'Thank you. We received your expression of interest and will contact you about the next steps.' }); });
    app.get('/api/admin/mentors/applications', async (req, res) => { await a.require(req, 'mentors.view'); const { limit, offset } = page(req.query, 100); const filters = z.object({ status: z.string().optional(), search: z.string().max(100).optional() }).parse(req.query); let q = p.db.from('mentor_applications').select('id,full_name,email,professional_background,help_options,preferred_contact_method,message,status,submitted_at').order('submitted_at', { ascending: false }); if (filters.status)
        q = q.eq('status', filters.status); const search = filters.search?.trim().replace(/[^a-zA-Z0-9@._+\- ]/g, ''); if (search)
        q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,professional_background.ilike.%${search}%`); res.json(rows(await q.range(offset, offset + limit - 1))); });
    app.patch('/api/admin/mentors/applications/:id', async (req, res) => { await a.require(req, 'mentors.update'); const b = z.object({ status: z.enum(['pending', 'under_review', 'approved', 'declined']) }).parse(req.body); res.json(one(await p.db.from('mentor_applications').update(b).eq('id', req.params.id).select(), 'Mentor request not found')); });
    const subscribedMessage = { message: "If that email is valid, we've updated your subscription." };
    const safe = 'id,email,status,source,created_at,updated_at,unsubscribed_at';
    app.post('/api/subscribe/', async (req, res) => { const b = z.object({ email: normalizedEmail, source: z.string().max(100).nullable().default(null) }).parse(req.body); await p.rateLimit(`subscribe:${req.ip}:${b.email}`, 5, 60); const r = rows(await p.db.from('subscribers').select('*').eq('email', b.email).limit(1))[0]; if (r) {
        if (r.status !== 'subscribed')
            providerError((await p.db.from('subscribers').update({ status: 'subscribed', unsubscribed_at: null, source: b.source || r.source }).eq('id', r.id)).error);
    }
    else {
        const insert = await p.db.from('subscribers').insert({ ...b, status: 'subscribed', unsubscribe_token: randomBytes(32).toString('base64url') });
        if (insert.error?.code !== '23505')
            providerError(insert.error);
    } res.json(subscribedMessage); });
    app.get('/api/unsubscribe/:token/', async (req, res) => { const r = rows(await p.db.from('subscribers').select('id,status').eq('unsubscribe_token', req.params.token).limit(1))[0]; const already = r?.status === 'unsubscribed'; if (r && !already)
        providerError((await p.db.from('subscribers').update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }).eq('id', r.id)).error); res.json({ message: already ? 'You were already unsubscribed.' : "You've been unsubscribed.", already }); });
    app.get('/api/admin/subscribers/', async (req, res) => { await a.require(req, undefined, 'admin'); const { limit, offset } = page(req.query, 100, 100); const filters = z.object({ status: z.string().optional(), search: z.string().max(100).optional() }).parse(req.query); let q = p.db.from('subscribers').select(safe).order('created_at', { ascending: false }); if (filters.status)
        q = q.eq('status', filters.status); const search = filters.search?.trim().replace(/[^a-zA-Z0-9@._+\- ]/g, ''); if (search)
        q = q.ilike('email', `%${search}%`); res.json(rows(await q.range(offset, offset + limit - 1))); });
    app.get('/api/admin/subscribers/count/', async (req, res) => { await a.require(req, undefined, 'admin'); const r = await p.db.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'subscribed'); providerError(r.error); res.json({ count: r.count || 0 }); });
    app.patch('/api/admin/subscribers/:id/', async (req, res) => { await a.require(req, undefined, 'admin'); const b = z.object({ status: z.enum(['subscribed', 'unsubscribed', 'bounced']) }).parse(req.body); res.json(one(await p.db.from('subscribers').update({ ...b, ...(b.status === 'unsubscribed' ? { unsubscribed_at: new Date().toISOString() } : {}) }).eq('id', req.params.id).select(safe), 'Subscriber not found')); });
    app.delete('/api/admin/subscribers/:id/', async (req, res) => { await a.require(req, undefined, 'admin'); one(await p.db.from('subscribers').delete().eq('id', req.params.id).select('id'), 'Subscriber not found'); res.json({ message: 'Subscriber deleted.', id: req.params.id }); });
}
