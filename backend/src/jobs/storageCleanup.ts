import { randomUUID } from 'node:crypto';
import type { Config } from '../config/env.js';
import type { Providers } from '../shared/providers.js';
import { rows, type Row } from '../shared/data.js';
import { providerError } from '../shared/errors.js';

export function trackedBucket(p: Providers, bucket: string) {
    const storage = p.db.storage.from(bucket);
    async function reserve(path: string) {
        const due = new Date(Date.now() + 3600000).toISOString();
        providerError((await p.db.from('storage_cleanup_jobs').upsert({ bucket, object_path: path, next_attempt_at: due }, { onConflict: 'bucket,object_path', ignoreDuplicates: true })).error);
        providerError((await p.db.from('storage_cleanup_jobs').update({ status: 'pending', next_attempt_at: due, completed_at: null, lease_token: null, lease_until: null, attempts: 0 }).eq('bucket', bucket).eq('object_path', path)).error);
    }
    return {
        getPublicUrl: (path: string) => storage.getPublicUrl(path),
        download: (path: string) => storage.download(path),
        async upload(...args: Parameters<typeof storage.upload>) { await reserve(args[0]); return storage.upload(...args); },
        // Defer removal so every commit/failure has a durable intent and references
        // are checked by the worker. Provider failures cannot invalidate a saved edit.
        async remove(paths: string[]) { for (const path of paths) await reserve(path); return { data: [], error: null }; },
    };
}

export interface CleanupStore {
    due(): Promise<Row[]>;
    claim(job: Row, token: string): Promise<boolean>;
    referenced(job: Row): Promise<boolean>;
    remove(job: Row): Promise<void>;
    finish(job: Row, token: string, status: 'completed' | 'referenced'): Promise<void>;
    retry(job: Row, token: string): Promise<void>;
}
export async function processStorageCleanup(store: CleanupStore) {
    let failed = 0;
    for (const job of await store.due()) {
        const token = randomUUID();
        if (!await store.claim(job, token)) continue;
        try {
            if (await store.referenced(job)) await store.finish(job, token, 'referenced');
            else { await store.remove(job); await store.finish(job, token, 'completed'); }
        } catch { failed++; await store.retry(job, token); }
    }
    return { failed };
}
export function storageCleanupStore(p: Providers, c: Config): CleanupStore {
    const has = async (table: string, column: string, path: unknown) => rows(await p.db.from(table).select('id').eq(column, path).limit(1)).length > 0;
    return {
        async due() { const now = new Date().toISOString(); return rows(await p.db.from('storage_cleanup_jobs').select('*').in('status', ['pending','processing']).lte('next_attempt_at', now).or(`lease_until.is.null,lease_until.lt.${now}`).order('next_attempt_at').limit(20)); },
        async claim(job, token) { const now = new Date().toISOString(); return rows(await p.db.from('storage_cleanup_jobs').update({ status: 'processing', lease_token: token, lease_until: new Date(Date.now()+300000).toISOString(), attempts: Number(job.attempts)+1 }).eq('id', job.id).in('status', ['pending','processing']).lte('next_attempt_at',now).or(`lease_until.is.null,lease_until.lt.${now}`).select('id')).length === 1; },
        async referenced(job) {
            const bucket = String(job.bucket), path = job.object_path;
            const known = [c.STORY_IMAGE_BUCKET,c.PROFILE_IMAGE_BUCKET,c.NEWSLETTER_ASSETS_BUCKET];
            if (!known.includes(bucket)) throw new Error('Unknown media bucket; reconciliation required');
            if (bucket === c.STORY_IMAGE_BUCKET && await has('stories','photo_path',path)) return true;
            if (bucket === c.PROFILE_IMAGE_BUCKET && await has('team_profiles','image_path',path)) return true;
            if (bucket === c.NEWSLETTER_ASSETS_BUCKET) {
                if (await has('newsletters','banner_path',path) || await has('newsletter_attachments','storage_path',path)) return true;
                for (const snapshot of [{ banner_path: path },{ attachments: [{ storage_path: path }] }])
                    if (rows(await p.db.from('delivery_jobs').select('id').contains('snapshot',snapshot).limit(1)).length) return true;
            }
            return false;
        },
        async remove(job) { providerError((await p.db.storage.from(String(job.bucket)).remove([String(job.object_path)])).error); },
        async finish(job, token, status) { providerError((await p.db.from('storage_cleanup_jobs').update({ status, completed_at: new Date().toISOString(), lease_token: null, lease_until: null }).eq('id',job.id).eq('lease_token',token)).error); },
        async retry(job, token) { const attempts = Number(job.attempts)+1; providerError((await p.db.from('storage_cleanup_jobs').update({ status: attempts >= 8 ? 'failed' : 'pending', next_attempt_at: new Date(Date.now()+Math.min(86400000,60000*2**attempts)).toISOString(), lease_token: null, lease_until: null, last_error: 'Storage cleanup failed; verify references and provider availability' }).eq('id',job.id).eq('lease_token',token)).error); },
    };
}
