import express, { type Express } from 'express';
import Stripe from 'stripe';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Providers } from '../shared/providers.js';
import type { Config } from '../config/env.js';
import type { Authorization } from './auth.js';
import { rows, one, page, normalizedEmail, type Row } from '../shared/data.js';
import { HttpError, providerError } from '../shared/errors.js';
import { cents, decimal, providerAmount } from '../shared/money.js';
const name = z.string().min(1).max(150).transform(s => s.trim().replace(/\s+/g, ' ')).refine(Boolean);
const optionalText = (max: number) => z.string().max(max).nullable().optional().transform(s => s?.trim() || null);
const amount = z.union([z.string(), z.number()]).transform(v => decimal(cents(v)));
const checkout = z.object({ amount, currency: z.string().trim().toLowerCase().default('usd').refine(v => v === 'usd', 'Unsupported donation currency'), frequency: z.enum(['one_time', 'monthly']).default('one_time'), donor_name: name, donor_email: normalizedEmail, anonymous: z.boolean().default(true), message: optionalText(2000) });
export function donationServices(p: Providers, c: Config, stripe: Stripe) {
    const first = async (table: string, column: string, value: unknown) => value ? rows(await p.db.from(table).select('*').eq(column, value).limit(1))[0] : undefined;
    const update = async (id: unknown, values: Row) => one(await p.db.from('donation_sessions').update(values).eq('id', id).select(), 'Donation session not found');
    // Different Stripe events may race despite their independent event leases.
    // Apply negative states only while the database row is still pending.
    const updatePending = async (id: unknown, status: string) => rows(await p.db.from('donation_sessions').update({ status }).eq('id', id).eq('status', 'pending').select());
    const id = (v: unknown) => typeof v === 'string' ? v : v && typeof v === 'object' ? (v as Row).id : undefined;
    const record = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Row;
    const subscription = (obj: Row) => id(obj.subscription) || id(record(record(obj.parent).subscription_details).subscription);
    async function findSession(obj: Row) { const metadata = { ...record(record(record(obj.parent).subscription_details).metadata), ...record(obj.metadata) }; const internal = await first('donation_sessions', 'id', metadata.donation_session_id); if (internal)
        return internal; for (const [column, value] of [['stripe_checkout_session_id', obj.object === 'checkout.session' ? obj.id : null], ['stripe_subscription_id', obj.object === 'subscription' ? obj.id : subscription(obj)]] as const) {
        const r = await first('donation_sessions', column, value);
        if (r)
            return r;
    } const payment = await first('donation_payments', 'stripe_payment_intent_id', id(obj.payment_intent) || (obj.object === 'payment_intent' ? obj.id : null)); if (payment)
        return first('donation_sessions', 'id', payment.donation_session_id); if (subscription(obj)) {
        const sub = await stripe.subscriptions.retrieve(String(subscription(obj)));
        return first('donation_sessions', 'id', sub.metadata.donation_session_id);
    } return undefined; }
    const complete = (session: Row, extra: Row = {}) => ({ ...extra, status: session.status === 'cancelled' ? 'cancelled' : 'completed', ...(session.anonymous === false ? { supporter_publication_status: 'approved', supporter_reviewed_at: new Date().toISOString(), supporter_reviewed_by: 'verified-stripe-webhook' } : {}) });
    async function payment(session: Row, obj: Row, success: boolean) {
        const invoice = obj.object === 'invoice';
        const minor = invoice ? (success ? obj.amount_paid : obj.amount_due) : obj.amount_total ?? obj.amount;
        if (obj.currency && obj.currency !== 'usd')
            throw new HttpError(422, 'Unsupported donation currency');
        if (!Number.isSafeInteger(minor) || Number(minor) < 0)
            throw new HttpError(422, 'Invalid verified payment amount');
        if (success && BigInt(Number(minor)) !== cents(session.requested_amount))
            throw new HttpError(409, 'Verified payment amount does not match donation');
        const intent = id(obj.payment_intent) || (obj.object === 'payment_intent' ? obj.id : null);
        const r = await p.db.rpc('ltc_record_payment', { session_id: session.id, intent_id: intent || null, charge_id: id(obj.charge) || null, invoice_id: invoice ? obj.id : null, amount_value: decimal(BigInt(Number(minor))), payment_status: success ? 'succeeded' : 'failed', payment_time: success ? new Date(Number(record(obj.status_transitions).paid_at || obj.created || Math.floor(Date.now() / 1000)) * 1000).toISOString() : null });
        providerError(r.error);
        return Array.isArray(r.data) ? r.data[0] : r.data;
    }
    async function dispatch(type: string, obj: Row) {
        if (['refund.created', 'refund.updated'].includes(type)) {
            if (!['pending', 'succeeded'].includes(String(obj.status)) || !id(obj.charge))
                return;
            const charge = record(await stripe.charges.retrieve(String(id(obj.charge))));
            let existing = await first('donation_payments', 'stripe_charge_id', charge.id) || await first('donation_payments', 'stripe_payment_intent_id', id(charge.payment_intent));
            if (!existing && id(charge.payment_intent)) {
                const intent = record(await stripe.paymentIntents.retrieve(String(id(charge.payment_intent))));
                const session = await findSession(intent);
                if (session)
                    existing = await payment(session, { ...intent, amount: charge.amount, charge: charge.id }, true);
            }
            if (!existing)
                throw new HttpError(503, 'Refund payment awaits reconciliation');
            let refunded = 0n;
            for await (const refund of stripe.refunds.list({ charge: String(charge.id), limit: 100 })) {
                if (refund.status === 'succeeded')
                    refunded += BigInt(refund.amount);
            }
            providerError((await p.db.rpc('ltc_record_refund', { payment_id: existing.id, refund_value: decimal(refunded), charge_id: charge.id })).error);
            return;
        }
        const relevant = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'payment_intent.payment_failed', 'invoice.paid', 'invoice.payment_failed', 'customer.subscription.updated', 'customer.subscription.deleted'];
        if (!relevant.includes(type))
            return;
        const session = await findSession(obj);
        if (!session)
            throw new HttpError(503, 'Donation association awaits reconciliation');
        const extra: Row = {};
        if (id(obj.customer))
            extra.stripe_customer_id = id(obj.customer);
        if (subscription(obj))
            extra.stripe_subscription_id = subscription(obj);
        if (type === 'checkout.session.completed') {
            if (obj.mode === 'payment' && obj.payment_status === 'paid') {
                await payment(session, obj, true);
                await update(session.id, complete(session, extra));
            }
            else if (Object.keys(extra).length)
                await update(session.id, extra);
        }
        else if (type === 'checkout.session.async_payment_succeeded' || type === 'invoice.paid') {
            await payment(session, obj, true);
            await update(session.id, complete(session, extra));
        }
        else if (type === 'checkout.session.async_payment_failed' || type === 'invoice.payment_failed' || type === 'payment_intent.payment_failed') {
            if (type !== 'checkout.session.async_payment_failed')
                await payment(session, obj, false);
            if (Object.keys(extra).length)
                await update(session.id, extra);
            await updatePending(session.id, 'failed');
        }
        else if (type === 'checkout.session.expired') {
            await updatePending(session.id, 'expired');
        }
        else {
            extra.stripe_subscription_id = obj.id;
            if (type === 'customer.subscription.deleted' || ['canceled', 'incomplete_expired'].includes(String(obj.status)))
                extra.status = 'cancelled';
            await update(session.id, extra);
            if (['past_due', 'unpaid'].includes(String(obj.status)))
                await updatePending(session.id, 'failed');
        }
    }
    async function webhook(raw: Buffer, signature: string | undefined) {
        if (!c.STRIPE_WEBHOOK_SECRET)
            throw new HttpError(503, 'Stripe webhook is not configured');
        if (!signature)
            throw new HttpError(400, 'Missing Stripe-Signature header');
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(raw, signature, c.STRIPE_WEBHOOK_SECRET);
        }
        catch {
            throw new HttpError(400, 'Invalid Stripe webhook signature');
        }
        const lease = new Date().toISOString();
        const existing = await first('stripe_webhook_events', 'stripe_event_id', event.id);
        if (existing?.processing_status === 'processed')
            return { received: true, duplicate: true };
        if (existing) {
            if (existing.processing_status === 'processing' && Date.parse(String(existing.processing_started_at)) > Date.now() - 300000)
                throw new HttpError(409, 'Stripe event is already being processed');
            let q = p.db.from('stripe_webhook_events').update({ processing_status: 'processing', processing_started_at: lease, error_information: null }).eq('stripe_event_id', event.id).eq('processing_status', existing.processing_status);
            if (existing.processing_started_at)
                q = q.eq('processing_started_at', existing.processing_started_at);
            if (!rows(await q.select()).length)
                throw new HttpError(409, 'Stripe event is already being processed');
        }
        else {
            const r = await p.db.from('stripe_webhook_events').insert({ stripe_event_id: event.id, event_type: event.type, processing_status: 'processing', processing_started_at: lease }).select();
            if (r.error?.code === '23505')
                throw new HttpError(409, 'Stripe event is already being processed');
            providerError(r.error);
            if (!r.data?.length)
                throw new HttpError(503, 'Webhook persistence failed');
        }
        try {
            await dispatch(event.type, record(event.data.object));
            one(await p.db.from('stripe_webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString(), error_information: null }).eq('stripe_event_id', event.id).eq('processing_started_at', lease).select(), 'Webhook claim lost');
        }
        catch (e) {
            await p.db.from('stripe_webhook_events').update({ processing_status: 'failed', error_information: 'Processing failed; reconcile using event ID' }).eq('stripe_event_id', event.id).eq('processing_started_at', lease);
            throw new HttpError(500, 'Webhook processing failed');
        }
        return { received: true };
    }
    async function createCheckout(body: z.infer<typeof checkout>, key: string) {
        if (!c.STRIPE_API_VERSION)
            throw new HttpError(503, 'Stripe API version must be confirmed before checkout');
        if (!c.STRIPE_SECRET_KEY)
            throw new HttpError(503, 'Donation payments are not configured');
        const minor = providerAmount(body.amount);
        if (!/^[A-Za-z0-9_-]{8,200}$/.test(key))
            throw new HttpError(422, 'Invalid Idempotency-Key header');
        const existing = await first('donation_sessions', 'checkout_idempotency_key', key);
        const donationId = existing?.id || randomUUID();
        if (existing) {
            for (const field of ['currency', 'frequency', 'donor_name', 'donor_email', 'anonymous', 'message'] as const)
                if ((existing[field] ?? null) !== (body[field] ?? null))
                    throw new HttpError(409, 'Idempotency key was already used for another request');
            if (cents(existing.requested_amount) !== cents(body.amount))
                throw new HttpError(409, 'Idempotency key was already used for another request');
            if (existing.stripe_checkout_session_id) {
                const session = await stripe.checkout.sessions.retrieve(String(existing.stripe_checkout_session_id));
                if (!session.url)
                    throw new HttpError(409, 'Checkout request has already been used');
                return { session_id: donationId, stripe_checkout_session_id: session.id, checkout_url: session.url };
            }
        }
        else {
            const r = await p.db.from('donation_sessions').insert({ id: donationId, ...body, amount: undefined, requested_amount: body.amount, status: 'pending', supporter_publication_status: 'pending', checkout_idempotency_key: key }).select();
            if (r.error?.code === '23505')
                throw new HttpError(409, 'Checkout request is already being processed');
            providerError(r.error);
        }
        const metadata = { donation_session_id: String(donationId) };
        const params: Stripe.Checkout.SessionCreateParams = { mode: body.frequency === 'monthly' ? 'subscription' : 'payment', line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: minor, product_data: { name: 'Donation to Living The Charge' }, ...(body.frequency === 'monthly' ? { recurring: { interval: 'month' } } : {}) } }], customer_email: body.donor_email, client_reference_id: String(donationId), metadata, success_url: `${c.FRONTEND_URL}/donation-success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${c.FRONTEND_URL}/donate`, ...(body.frequency === 'monthly' ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }) };
        try {
            const result = await stripe.checkout.sessions.create(params, { idempotencyKey: `donation-checkout-${createHash('sha256').update(key).digest('hex')}` });
            if (!result.url)
                throw new Error('Missing checkout URL');
            await update(donationId, { stripe_checkout_session_id: result.id });
            return { session_id: donationId, stripe_checkout_session_id: result.id, checkout_url: result.url };
        }
        catch {
            throw new HttpError(502, 'Unable to create payment session');
        }
    }
    return { webhook, createCheckout, dispatch };
}
export function registerWebhook(app: Express, p: Providers, c: Config, stripe: Stripe) { const s = donationServices(p, c, stripe); app.post('/api/stripe/webhook/', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => res.json(await s.webhook(req.body, req.headers['stripe-signature'] as string | undefined))); }
export function registerDonations(app: Express, p: Providers, c: Config, a: Authorization, stripe: Stripe) {
    const s = donationServices(p, c, stripe);
    app.post('/api/donations/checkout-session/', async (req, res) => { const b = checkout.parse(req.body); await p.rateLimit(`donation-checkout:${req.ip}:${b.donor_email}`, 10, 300); res.status(201).json(await s.createCheckout(b, String(req.headers['idempotency-key'] || randomUUID()))); });
    app.get('/api/donations/session/:id/', async (req, res) => { const id = String(req.params.id); const r = one(await p.db.from('donation_sessions').select('id,status,requested_amount,currency,frequency').eq(id.startsWith('cs_') ? 'stripe_checkout_session_id' : 'id', id).limit(1), 'Donation session not found'); res.json({ session_id: r.id, status: r.status, amount: Number(r.requested_amount), currency: r.currency, frequency: r.frequency }); });
    app.get('/api/donations/progress/', async (_req, res) => { const r = await p.db.rpc('ltc_donation_progress'); providerError(r.error); res.json(Array.isArray(r.data) ? r.data[0] : r.data); });
    app.get('/api/donations/supporters/', async (req, res) => { const { limit, offset } = page(req.query, 9, 50); const r = await p.db.rpc('get_public_supporters_fast', { requested_limit: limit, requested_offset: offset }); res.json(rows(r).map(r => ({ ...r, amount: Number(r.amount) }))); });
    const pledge = z.object({ full_name: z.string().min(2).max(150).transform(s => s.trim().replace(/\s+/g, ' ')).refine(Boolean), pledge_type: z.enum(['individual', 'organization']).default('individual'), organization: optionalText(200), email: normalizedEmail, amount: amount.refine(v => cents(v) > 0n && cents(v) <= 100000000n), currency: z.string().trim().toLowerCase().default('usd').refine(v => v === 'usd'), frequency: z.enum(['one_time', 'monthly']).default('one_time'), message: optionalText(1000), consent_to_publish: z.boolean().default(false) }).refine(b => b.pledge_type !== 'organization' || !!b.organization, 'Organization name is required');
    app.post('/api/donations/pledges/', async (req, res) => { const b = pledge.parse(req.body); await p.rateLimit(`pledge-submission:${req.ip}:${b.email}`, 5, 900); const id = randomUUID(); one(await p.db.from('pledges').insert({ id, ...b, status: 'pending' }).select(), 'Your pledge could not be submitted'); res.status(201).json({ id, status: 'pending', message: 'Thank you. The Living the Charge team will follow up with you.' }); });
    app.get('/api/donations/pledges/', async (req, res) => { const { limit } = page(req.query, 50, 100); res.json(rows(await p.db.from('pledges').select('id,full_name,organization,pledge_type,amount,currency,frequency,message,created_at').eq('status', 'approved').eq('consent_to_publish', true).order('created_at', { ascending: false }).range(0, limit - 1)).map(r => ({ id: r.id, name: r.full_name, organization: r.organization, pledge_type: r.pledge_type || (r.organization ? 'organization' : 'individual'), amount: Number(r.amount), currency: r.currency, frequency: r.frequency, message: r.message, pledged_at: r.created_at }))); });
    app.get('/api/admin/donations', async (req, res) => { await a.require(req, 'donations.view'); const { limit, offset } = page(req.query, 100); const filters = z.object({ search: z.string().max(100).optional(), status: z.string().optional() }).parse(req.query); let query = p.db.from('donation_sessions').select('id,donor_name,donor_email,requested_amount,currency,frequency,status,anonymous,supporter_publication_status,payment_source,manual_reference,created_at,updated_at').order('created_at', { ascending: false }).range(offset, offset + limit - 1); if (filters.status && filters.status !== 'all')
        query = query.eq('status', filters.status); const search = filters.search?.trim().replace(/[^a-zA-Z0-9@._+\- ]/g, ''); if (search)
        query = query.or(`donor_name.ilike.%${search}%,donor_email.ilike.%${search}%`); const sessions = rows(await query); const payments = sessions.length ? rows(await p.db.from('donation_payments').select('donation_session_id,status,paid_at,payment_source').in('donation_session_id', sessions.map(r => r.id)).order('paid_at', { ascending: false })) : []; res.json(sessions.map(r => { const payment = payments.find(v => v.donation_session_id === r.id); return { ...r, donated_at: payment?.paid_at || r.created_at, payment_status: payment?.status, payment_source: r.payment_source || payment?.payment_source || 'stripe' }; })); });
    app.get('/api/admin/donations/summary', async (req, res) => { await a.require(req, 'donations.view'); const r = await p.db.rpc('ltc_donation_summary'); providerError(r.error); res.json(Array.isArray(r.data) ? r.data[0] : r.data); });
    app.get('/api/admin/donations/pledges', async (req, res) => { await a.require(req, 'pledges.view'); const { limit, offset } = page(req.query, 100); res.json(rows(await p.db.from('pledges').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1))); });
    app.patch('/api/admin/donations/pledges/:id', async (req, res) => { const u = await a.require(req, 'pledges.update'); const b = z.object({ status: z.enum(['pending', 'approved', 'fulfilled', 'withdrawn']) }).parse(req.body); res.json(one(await p.db.from('pledges').update({ ...b, reviewed_at: new Date().toISOString(), reviewed_by: u.id, fulfilled_at: b.status === 'fulfilled' ? new Date().toISOString() : null }).eq('id', req.params.id).select(), 'Pledge not found')); });
    app.patch('/api/donations/admin/session/:id/supporter-publication/', async (req, res) => { const u = await a.require(req, undefined, 'admin'); const b = z.object({ status: z.enum(['pending', 'approved', 'rejected']), anonymous: z.boolean().nullable().optional() }).parse(req.body); const patch: Row = { supporter_publication_status: b.status, supporter_reviewed_at: b.status === 'pending' ? null : new Date().toISOString(), supporter_reviewed_by: b.status === 'pending' ? null : u.id }; if (b.anonymous !== undefined && b.anonymous !== null)
        patch.anonymous = b.anonymous; one(await p.db.from('donation_sessions').update(patch).eq('id', req.params.id).select(), 'Donation session not found'); res.json({ session_id: req.params.id, supporter_publication_status: b.status }); });
    app.post('/api/admin/donations/manual', async (req, res) => { const u = await a.require(req, undefined, 'super_admin'); const b = checkout.omit({ currency: true }).extend({ amount: amount.refine(v => cents(v) > 0n && cents(v) <= 100000000n), donated_at: z.string().refine(v => !Number.isNaN(Date.parse(v))), manual_reference: optionalText(255) }).parse(req.body); const r = await p.db.rpc('ltc_manual_donation', { actor_id: u.id, donation_values: b, event_request_id: res.locals.requestId }); providerError(r.error); res.status(201).json(Array.isArray(r.data) ? r.data[0] : r.data); });
}
