import type { Express } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { Providers } from '../shared/providers.js';
import type { Config } from '../config/env.js';
import type { Authorization } from './auth.js';
import { rows, one, page, type Row } from '../shared/data.js';
import { HttpError, providerError } from '../shared/errors.js';
import { safeHtml } from '../shared/html.js';
import { renderNewsletter } from '../jobs/delivery.js';
import { upload, imageFile, imageExtension, safeFilename } from '../shared/uploads.js';
import { trackedBucket } from '../jobs/storageCleanup.js';
const create = z.object({ title: z.string().max(500).default(''), body_html: z.string().max(200000).default('').transform(safeHtml), preview_text: z.string().max(255).nullable().default(null) });
export function registerNewsletters(app: Express, p: Providers, c: Config, a: Authorization) {
    const sqs = new SQSClient({});
    const bucket = trackedBucket(p, c.NEWSLETTER_ASSETS_BUCKET);
    const get = async (id: unknown) => one(await p.db.from('newsletters').select('*').eq('id', id).limit(1), 'Newsletter not found');
    const attachments = async (id: unknown) => rows(await p.db.from('newsletter_attachments').select('*').eq('newsletter_id', id).order('created_at'));
    const hydrate = async (r: Row) => ({ ...r, banner_url: r.banner_path ? bucket.getPublicUrl(String(r.banner_path)).data.publicUrl : null, attachments: await attachments(r.id) });
    async function editable(id: unknown) { const r = await get(id); if (!['draft', 'failed', 'cancelled'].includes(String(r.status)))
        throw new HttpError(409, 'Accepted newsletter content is frozen'); return r; }
    app.get('/api/admin/newsletters/', async (req, res) => { await a.require(req, 'newsletters.view'); const { limit, offset } = page(req.query); const group = z.object({ group: z.enum(['drafts', 'sent']).optional() }).parse(req.query).group; let query = p.db.from('newsletters').select('*').order('created_at', { ascending: false }); if (group)
        query = query.in('status', group === 'drafts' ? ['draft', 'failed'] : ['sent', 'sending']); const newsletters = rows(await query.range(offset, offset + limit - 1)); const all = newsletters.length ? rows(await p.db.from('newsletter_attachments').select('*').in('newsletter_id', newsletters.map(n => n.id)).order('created_at')) : []; res.json(newsletters.map(r => ({ ...r, banner_url: r.banner_path ? bucket.getPublicUrl(String(r.banner_path)).data.publicUrl : null, attachments: all.filter(v => v.newsletter_id === r.id) }))); });
    app.post('/api/admin/newsletters/', async (req, res) => { const u = await a.require(req, 'newsletters.create'); res.status(201).json(await hydrate(one(await p.db.from('newsletters').insert({ ...create.parse(req.body), created_by: u.id, status: 'draft' }).select(), 'Unable to create newsletter'))); });
    app.patch('/api/admin/newsletters/:id/', async (req, res) => { await a.require(req, 'newsletters.update'); const existing=await editable(req.params.id); const parsed = create.partial().extend({ status: z.enum(['draft', 'cancelled']).optional(),banner_image:z.null().optional() }).parse(req.body); const {banner_image,...b}=parsed;
        if(banner_image===null){if(existing.banner_path)await bucket.remove([String(existing.banner_path)]);Object.assign(b,{banner_path:null});}
        const r = one(await p.db.from('newsletters').update(b).eq('id', req.params.id).in('status', ['draft', 'failed', 'cancelled']).select(), 'Newsletter content changed while saving'); res.json(await hydrate(r)); });
    app.delete('/api/admin/newsletters/:id/', async (req, res) => { await a.require(req, 'newsletters.delete'); const existing = await editable(req.params.id); if (rows(await p.db.from('delivery_jobs').select('id').eq('newsletter_id', req.params.id).limit(1)).length)
        throw new HttpError(409, 'Newsletter delivery history must be retained');
        const assets=(await attachments(req.params.id)).map(r=>String(r.storage_path));
        if(existing.banner_path)assets.push(String(existing.banner_path));
        await bucket.remove(assets);
        one(await p.db.from('newsletters').delete().eq('id', req.params.id).in('status', ['draft', 'failed', 'cancelled']).select(), 'Newsletter not found'); res.json({ message: 'Newsletter deleted.', id: req.params.id }); });
    app.get('/api/admin/newsletters/:id/preview/', async (req, res) => { await a.require(req, 'newsletters.view'); res.setHeader('Content-Security-Policy', "default-src 'none'; img-src https:; style-src 'unsafe-inline'; sandbox"); res.type('html').send(renderNewsletter(await get(req.params.id), c)); });
    app.get('/api/admin/newsletters/:id/status/', async (req, res) => { await a.require(req, 'newsletters.view'); const r = await get(req.params.id); res.json({ id: r.id, status: r.status, recipient_count: r.recipient_count, sent_count: r.sent_count, failed_count: r.failed_count, send_error: r.send_error, sent_at: r.sent_at }); });
    app.post('/api/admin/newsletters/:id/send/', async (req, res) => { await a.require(req, 'newsletters.send'); if (!c.RESEND_API_KEY || !c.ORG_MAILING_ADDRESS || !c.SQS_QUEUE_URL)
        throw new HttpError(503, 'Email delivery configuration is incomplete'); const r = await p.db.rpc('ltc_accept_newsletter', { target_id: req.params.id }); providerError(r.error); const job = (Array.isArray(r.data) ? r.data[0] : r.data) as Row; try {
        await sqs.send(new SendMessageCommand({ QueueUrl: c.SQS_QUEUE_URL, MessageBody: JSON.stringify({ kind: 'newsletter', jobId: job.id }) }));
        await p.db.from('delivery_jobs').update({ dispatched_at: new Date().toISOString() }).eq('id', job.id);
    }
    catch { /* Durable outbox will be dispatched by the independent worker. */ } res.status(202).json(await hydrate(await get(req.params.id))); });
    const guard = async (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => { try {
        await a.require(req, 'newsletters.update');
        res.locals.newsletter = await editable(req.params.id);
        next();
    }
    catch (e) {
        next(e);
    } };
    app.post('/api/admin/newsletters/:id/banner/', guard, upload('banner'), async (req, res) => { const image = await imageFile(req.file); if (!image)
        throw new HttpError(422, 'Banner is required'); if (res.locals.newsletter.banner_path) await bucket.remove([String(res.locals.newsletter.banner_path)]); const path = `banners/${req.params.id}/${randomBytes(12).toString('hex')}${image.extension}`; providerError((await bucket.upload(path, image.bytes, { contentType: image.type })).error); let committed = false; try {
        const r = one(await p.db.from('newsletters').update({ banner_path: path }).eq('id', req.params.id).in('status', ['draft', 'failed', 'cancelled']).select(), 'Newsletter content is frozen');
        committed = true;
        res.json(await hydrate(r));
    }
    catch (e) {
        if (!committed)
            await bucket.remove([path]);
        throw e;
    } });
    app.post('/api/admin/newsletters/:id/attachments/', guard, upload('file', 8 * 1024 * 1024), async (req, res) => { const f = req.file; if (!f)
        throw new HttpError(422, 'Attachment is required'); const data = await readFile(f.path); if (f.mimetype === 'application/pdf') {
        if (data.subarray(0, 5).toString() !== '%PDF-')
            throw new HttpError(422, 'Attachment content does not match its declared type');
    }
    else
        imageExtension(f.mimetype, data); const existing = await attachments(req.params.id); if (existing.reduce((n, r) => n + Number(r.size_bytes), 0) + data.length > 20 * 1024 * 1024)
        throw new HttpError(422, 'Total attachments would exceed 20 MB limit'); const filename = safeFilename(f.originalname); const path = `attachments/${req.params.id}/${randomBytes(8).toString('hex')}-${filename}`; providerError((await bucket.upload(path, data, { contentType: f.mimetype })).error); try {
        const r = one(await p.db.from('newsletter_attachments').insert({ newsletter_id: req.params.id, original_filename: filename, storage_path: path, mime_type: f.mimetype, size_bytes: data.length }).select(), 'Unable to save attachment');
        res.status(201).json(r);
    }
    catch (e) {
        await bucket.remove([path]);
        throw e;
    } });
    app.delete('/api/admin/newsletters/:id/attachments/:attachment/', async (req, res) => { await a.require(req, 'newsletters.update'); await editable(req.params.id);
        const existing=one(await p.db.from('newsletter_attachments').select('*').eq('id',req.params.attachment).eq('newsletter_id',req.params.id).limit(1),'Attachment not found');
        await bucket.remove([String(existing.storage_path)]);
        one(await p.db.from('newsletter_attachments').delete().eq('id', req.params.attachment).eq('newsletter_id', req.params.id).select(), 'Attachment not found'); res.json({ message: 'Attachment removed.', id: req.params.attachment }); });
}
