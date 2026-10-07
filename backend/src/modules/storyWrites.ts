import type { Express } from 'express';
import { randomUUID, randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { Providers } from '../shared/providers.js';
import type { Config } from '../config/env.js';
import type { Authorization } from './auth.js';
import { one, type Row } from '../shared/data.js';
import { HttpError, providerError } from '../shared/errors.js';
import { upload, imageFile } from '../shared/uploads.js';
import { safeHtml } from '../shared/html.js';
import { trackedBucket } from '../jobs/storageCleanup.js';
const fields = z.object({ name: z.string().min(1).max(255), excerpt: z.string().max(500).nullable().optional(), content: z.string().max(20000).transform(safeHtml), order: z.string().optional().transform(v => Number.parseInt(v || '0', 10) || 0), is_published: z.string().optional().transform(v => ['true', '1', 't', 'yes'].includes((v || '').toLowerCase())) });
export function registerStoryWrites(app: Express, p: Providers, c: Config, a: Authorization) {
    const bucket = trackedBucket(p, c.STORY_IMAGE_BUCKET);
    const view = (r: Row) => ({ ...r, photo: r.photo_path ? bucket.getPublicUrl(String(r.photo_path)).data.publicUrl : null });
    for (const method of ['post', 'patch'] as const)
        app[method](`/api/admin/stories${method === 'patch' ? '/:id' : ''}`, async (req, res, next) => { try {
            res.locals.user = await a.require(req, method === 'post' ? 'stories.create' : 'stories.update');
            next();
        }
        catch (e) {
            next(e);
        } }, upload('photo'), async (req, res) => {
            const values: Row = (method === 'post' ? fields : fields.partial()).parse(req.body);
            if (method === 'patch') {
                if (req.body.order !== undefined)
                    values.order = Number.parseInt(req.body.order, 10) || 0;
                if (req.body.is_published !== undefined)
                    values.is_published = ['true', '1', 't', 'yes'].includes(String(req.body.is_published).toLowerCase());
            }
            if ((method === 'post' && values.is_published) || (method === 'patch' && req.body.is_published !== undefined)) {
                if (!(await a.permissions(res.locals.user)).includes('stories.publish'))
                    throw new HttpError(403, 'Publishing permission required');
            }
            const existing = method === 'patch' ? one(await p.db.from('stories').select('*').eq('id', req.params.id).limit(1), 'Story not found') : undefined;
            const image = await imageFile(req.file);
            if (image && existing?.photo_path) await bucket.remove([String(existing.photo_path)]);
            let path: string | undefined;
            let committed = false;
            try {
                if (image) {
                    path = `stories/${randomUUID()}-${randomBytes(8).toString('hex')}${image.extension}`;
                    providerError((await bucket.upload(path, image.bytes, { contentType: image.type, upsert: false })).error);
                    values.photo_path = path;
                }
                if (values.is_published && !existing?.published_date)
                    values.published_date = new Date().toISOString();
                const q = method === 'post' ? p.db.from('stories').insert({ ...values, created_by: res.locals.user.id }) : p.db.from('stories').update(values).eq('id', req.params.id);
                const row = one(await q.select(), 'Story not found');
                committed = true;
                res.json(view(row));
            }
            catch (e) {
                if (path && !committed)
                    await bucket.remove([path]);
                throw e;
            }
        });
    app.delete('/api/admin/stories/:id', async (req, res) => {
        await a.require(req, 'stories.delete');
        const r = one(await p.db.from('stories').select('*').eq('id',req.params.id).limit(1),'Story not found');
        if (r.photo_path) await bucket.remove([String(r.photo_path)]);
        one(await p.db.from('stories').delete().eq('id', req.params.id).select(), 'Story not found');
        res.json({ message: 'Story deleted', id: req.params.id });
    });
}
