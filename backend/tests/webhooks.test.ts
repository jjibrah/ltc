import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { donationServices } from '../src/modules/donations.js';
import { loadConfig } from '../src/config/env.js';
import type { Providers } from '../src/shared/providers.js';
const stripe = new Stripe('sk_test_fixture');
const config = loadConfig({ SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture' });
function setup(failInsert = false) { const events: Record<string, unknown>[] = []; let writes = 0; const db = { from: () => { let values: Record<string, unknown> | undefined; let operation = 'read'; const predicates: ((r: Record<string, unknown>) => boolean)[] = []; const query = { select: () => query, limit: () => query, eq: (k: string, v: unknown) => { predicates.push(r => r[k] === v); return query; }, insert: (v: Record<string, unknown>) => { operation = 'insert'; values = v; return query; }, update: (v: Record<string, unknown>) => { operation = 'update'; values = v; return query; }, then: (resolve: (v: unknown) => unknown) => { if (operation === 'insert') {
            writes++;
            if (failInsert)
                return Promise.resolve({ data: null, error: { code: 'connection_failure' } }).then(resolve);
            if (events.some(r => r.stripe_event_id === values!.stripe_event_id))
                return Promise.resolve({ data: null, error: { code: '23505' } }).then(resolve);
            events.push({ ...values });
        } const data = events.filter(r => predicates.every(fn => fn(r))); if (operation === 'update')
            for (const r of data)
                Object.assign(r, values); return Promise.resolve({ data, error: null }).then(resolve); } }; return query; } }; return { service: donationServices({ db } as unknown as Providers, config, stripe), events, writes: () => writes }; }
function event(id = 'evt_fixture') { const payload = JSON.stringify({ id, type: 'unhandled.fixture', data: { object: { id: 'obj_fixture' } }, created: 123 }); return { raw: Buffer.from(payload), signature: stripe.webhooks.generateTestHeaderString({ payload, secret: config.STRIPE_WEBHOOK_SECRET }) }; }
test('invalid signature has no persistence side effects', async () => { const s = setup(); await assert.rejects(s.service.webhook(Buffer.from('{}'), 'invalid'), { status: 400 }); assert.equal(s.writes(), 0); });
test('durable acceptance failure returns non-success so Stripe retries', async () => { const s = setup(true); const e = event(); await assert.rejects(s.service.webhook(e.raw, e.signature), { status: 503 }); assert.equal(s.events.length, 0); });
test('duplicate verified event is acknowledged after first durable completion only', async () => { const s = setup(); const e = event(); assert.deepEqual(await s.service.webhook(e.raw, e.signature), { received: true }); assert.deepEqual(await s.service.webhook(e.raw, e.signature), { received: true, duplicate: true }); assert.equal(s.writes(), 1); assert.equal(s.events[0]!.processing_status, 'processed'); });
test('fresh active lease rejects a concurrent delivery without processing twice', async () => { const s = setup(); s.events.push({ stripe_event_id: 'evt_fixture', processing_status: 'processing', processing_started_at: new Date().toISOString() }); const e = event(); await assert.rejects(s.service.webhook(e.raw, e.signature), { status: 409 }); assert.equal(s.writes(), 0); });
test('expired lease is reclaimed and completed after a crash', async () => { const s = setup(); s.events.push({ stripe_event_id: 'evt_fixture', processing_status: 'processing', processing_started_at: new Date(Date.now() - 600000).toISOString() }); const e = event(); assert.deepEqual(await s.service.webhook(e.raw, e.signature), { received: true }); assert.equal(s.events[0]!.processing_status, 'processed'); });
