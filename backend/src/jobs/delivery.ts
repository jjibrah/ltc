import type { Providers } from '../shared/providers.js';
import type { Config } from '../config/env.js';
import { rows, one, type Row } from '../shared/data.js';
import { HttpError, providerError } from '../shared/errors.js';
import { escapeHtml, safeHtml } from '../shared/html.js';
import { randomUUID } from 'node:crypto';
export function renderNewsletter(snapshot: Row, c: Config, unsubscribeUrl = '#') {
    const banner = snapshot.banner_path ? `${c.SUPABASE_URL}/storage/v1/object/public/${c.NEWSLETTER_ASSETS_BUCKET}/${encodeURI(String(snapshot.banner_path))}` : null;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(snapshot.title || 'Newsletter')}</title></head><body style="margin:0;padding:0;background-color:#f3f4f6"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(snapshot.preview_text)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 0"><tr><td align="center"><table role="presentation" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">${banner ? `<tr><td><img src="${escapeHtml(banner)}" alt="Newsletter banner" width="600" style="display:block;max-width:100%;height:auto"></td></tr>` : ''}<tr><td style="padding:32px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;color:#111827">${escapeHtml(snapshot.title)}</td></tr><tr><td style="padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#374151">${safeHtml(String(snapshot.body_html || ''))}</td></tr><tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280"><p>You received this email because you subscribed to Living The Charge updates.</p><p><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p><p>${escapeHtml(c.ORG_MAILING_ADDRESS)}</p></td></tr></table></td></tr></table></body></html>`;
}
export interface DeliveryStore {
    claim(id: string, token: string): Promise<Row | undefined>;
    recipients(id: string): Promise<Row[]>;
    suppressed(recipient: Row): Promise<boolean>;
    start(id: string, recipient: Row, token: string): Promise<void>;
    record(id: string, recipient: Row, status: string, providerId?: string): Promise<void>;
    renew(id: string, token: string): Promise<void>;
    retry?(id: string, token: string, seconds: number): Promise<void>;
    finish(id: string, token: string): Promise<boolean>;
}
export function deliveryStore(p: Providers): DeliveryStore {
    return {
        async claim(id, token) { const claimed = rows(await p.db.rpc('ltc_claim_job', { job_id: id, claim_token: token }))[0]; if (claimed)
            return claimed; return rows(await p.db.from('delivery_jobs').select('status').eq('id', id).in('status', ['completed', 'failed']).limit(1))[0]; },
        async recipients(id) { return rows(await p.db.from('delivery_recipients').select('*').eq('job_id', id).eq('status', 'pending').order('subscriber_id').limit(50)); },
        async suppressed(r) { const current = rows(await p.db.from('subscribers').select('status,email').eq('id', r.subscriber_id).limit(1))[0]; return !current || current.status !== 'subscribed' || current.email !== r.email; },
        async start(id, r, token) { await this.renew(id, token); providerError((await p.db.from('delivery_recipients').update({ first_attempt_at: r.first_attempt_at || new Date().toISOString(), attempts: Number(r.attempts || 0) + 1 }).eq('job_id', id).eq('subscriber_id', r.subscriber_id)).error); },
        async record(id, r, status, providerId) { providerError((await p.db.from('delivery_recipients').update({ status, provider_id: providerId || null }).eq('job_id', id).eq('subscriber_id', r.subscriber_id)).error); },
        async renew(id, token) { one(await p.db.from('delivery_jobs').update({ lease_until: new Date(Date.now() + 300000).toISOString() }).eq('id', id).eq('lease_token', token).eq('status', 'processing').gt('lease_until', new Date().toISOString()).select('id'), 'Delivery lease lost'); },
        async retry(id, token, seconds) { providerError((await p.db.from('delivery_jobs').update({ lease_until: new Date(Date.now() + seconds * 1000).toISOString(), last_error: 'Transient provider failure; retry pending' }).eq('id', id).eq('lease_token', token)).error); },
        async finish(id, token) { const r = await p.db.rpc('ltc_complete_job', { job_id: id, claim_token: token }); providerError(r.error); return r.data === true; },
    };
}
export async function processDelivery(id: string, store: DeliveryStore, send: (job: Row, recipient: Row, key: string) => Promise<string>) {
    const token = randomUUID();
    const job = await store.claim(id, token);
    if (!job)
        return false;
    if (['completed', 'failed'].includes(String(job.status)))
        return true;
    for (;;) {
        const batch = await store.recipients(id);
        if (!batch.length)
            break;
        for (const recipient of batch) {
            await store.renew(id, token);
            if (await store.suppressed(recipient)) {
                await store.record(id, recipient, 'suppressed');
                continue;
            }
            // Resend deduplication expires after 24h. Never blindly resend an unknown old attempt.
            if (recipient.first_attempt_at && Date.parse(String(recipient.first_attempt_at)) < Date.now() - 23 * 3600000) {
                await store.record(id, recipient, 'unknown');
                continue;
            }
            if (Number(recipient.attempts || 0) >= 5) {
                await store.record(id, recipient, 'failed');
                continue;
            }
            await store.start(id, recipient, token);
            const key = `ltc-${id}-${recipient.subscriber_id}`;
            try {
                const providerId = await send(job, recipient, key);
                await store.record(id, recipient, 'accepted', providerId);
            }
            catch (e) {
                if (e instanceof HttpError && e.status >= 400 && e.status < 500 && e.status !== 429) {
                    await store.record(id, recipient, 'failed');
                    continue;
                }
                await store.retry?.(id, token, e instanceof HttpError ? Math.max(300, e.retryAfter || 0) : 300);
                throw e;
            }
        }
    }
    return store.finish(id, token);
}
export function resendSender(p: Providers, c: Config, fetcher: typeof fetch = fetch) {
    return async (job: Row, recipient: Row, key: string) => {
        const snapshot = job.snapshot as Row;
        const attachments = [];
        for (const attachment of (snapshot.attachments || []) as Row[]) {
            const result = await p.db.storage.from(c.NEWSLETTER_ASSETS_BUCKET).download(String(attachment.storage_path));
            providerError(result.error);
            if (!result.data)
                throw new HttpError(503, 'Attachment is unavailable');
            attachments.push({ filename: attachment.original_filename, content: Buffer.from(await result.data.arrayBuffer()).toString('base64') });
        }
        const response = await fetcher('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${c.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ from: c.RESEND_FROM_ADDRESS, to: [recipient.email], subject: snapshot.title, html: renderNewsletter(snapshot, c, `${c.FRONTEND_URL}/unsubscribe/${encodeURIComponent(String(recipient.unsubscribe_token))}`), attachments }), signal: AbortSignal.timeout(30000) });
        if (!response.ok) {
            const retry = response.headers.get('Retry-After');
            const delay = retry ? (/^\d+$/.test(retry) ? Number(retry) : Math.ceil((Date.parse(retry) - Date.now()) / 1000)) : undefined;
            throw new HttpError(response.status, 'Email provider did not accept this recipient', delay && Number.isFinite(delay) ? Math.min(43200, Math.max(1, delay)) : undefined);
        }
        const result = await response.json() as {
            id?: string;
        };
        if (!result.id)
            throw new HttpError(503, 'Email provider acceptance is unknown');
        return result.id;
    };
}
