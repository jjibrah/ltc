import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { createApp } from '../src/app.js';
import { donationServices } from '../src/modules/donations.js';
import { loadConfig } from '../src/config/env.js';
import type { Providers } from '../src/shared/providers.js';
import type { Row } from '../src/shared/data.js';
const config = loadConfig({ APP_ENV: 'test', SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture', STRIPE_SECRET_KEY: 'sk_test_fixture' });
function database() {
  const tables: Record<string, Row[]> = { donation_sessions: [], pledges: [], donation_payments: [] };
  let failWrite = false;
  let race: (() => void) | undefined;
  const rpcCalls: Row[] = [];
  const db = {
    storage: { from: () => ({}) },
    rpc: async (name: string, values: Row) => { rpcCalls.push({ name, ...values }); return { data: [{ id: 'payment' }], error: null }; },
    from: (table: string) => {
      let operation = 'read'; let values: Row = {}; const filters: ((r: Row) => boolean)[] = [];
      const query = {
        select: () => query, limit: () => query, order: () => query, range: () => query,
        eq: (key: string, value: unknown) => { filters.push(r => r[key] === value); return query; },
        insert: (value: Row) => { operation = 'insert'; values = value; return query; },
        update: (value: Row) => { operation = 'update'; values = value; return query; },
        then: (resolve: (value: unknown) => unknown) => {
          if (operation !== 'read' && failWrite) return Promise.resolve({ data: null, error: { code: 'connection_failure' } }).then(resolve);
          if (operation === 'update' && race) { const run = race; race = undefined; run(); }
          if (operation === 'insert') tables[table]!.push({ ...values });
          const rows = tables[table]!.filter(row => filters.every(f => f(row)));
          if (operation === 'update') rows.forEach(row => Object.assign(row, values));
          return Promise.resolve({ data: rows.map(row => ({ ...row })), error: null }).then(resolve);
        },
      }; return query;
    },
  };
  return { tables, db: db as unknown as Providers['db'], rpcCalls, fail: () => { failWrite = true; }, race: (run: () => void) => { race = run; } };
}
test('checkout uses exact cents, private consent, monthly metadata and a stable Stripe retry key after an unknown outcome', async () => {
  const fixture = database(); let calls = 0; const sent: { params: Stripe.Checkout.SessionCreateParams; key: string | undefined }[] = [];
  const stripe = { checkout: { sessions: { create: async (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
    sent.push({ params, key: options.idempotencyKey }); if (++calls === 1) throw new Error('Unknown timeout'); return { id: 'cs_fixture', url: 'https://checkout.stripe.com/c/pay/fixture' };
  }, retrieve: async () => ({ id: 'cs_fixture', url: 'https://checkout.stripe.com/c/pay/fixture' }) } } } as unknown as Stripe;
  const service = donationServices({ db: fixture.db } as Providers, config, stripe);
  const body = { amount: '21.29', currency: 'usd', frequency: 'monthly', donor_name: 'Fixture Donor', donor_email: 'fixture@example.invalid', anonymous: true, message: null } as const;
  await assert.rejects(service.createCheckout(body, 'fixture_key'), { status: 502 });
  const result = await service.createCheckout(body, 'fixture_key');
  assert.equal(fixture.tables.donation_sessions!.length, 1);
  assert.equal(sent[0]!.key, sent[1]!.key); assert.equal(sent[1]!.params.line_items![0]!.price_data!.unit_amount, 2129);
  assert.equal(sent[1]!.params.mode, 'subscription'); assert.deepEqual(sent[1]!.params.subscription_data!.metadata, { donation_session_id: result.session_id });
  assert.equal(fixture.tables.donation_sessions![0]!.anonymous, true);
  await assert.rejects(service.createCheckout({ ...body, amount: '42.00' }, 'fixture_key'), { status: 409 });
  assert.equal(sent.length, 2);
});
test('late failure/expiry cannot overwrite a concurrent confirmed donation', async () => {
  for (const type of ['invoice.payment_failed', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'customer.subscription.updated']) {
    const fixture = database(); const session = { id: 'fixture', status: 'pending', requested_amount: '21.00', anonymous: true };
    fixture.tables.donation_sessions!.push(session);
    fixture.race(() => { session.status = 'completed'; });
    const service = donationServices({ db: fixture.db } as Providers, config, {} as Stripe);
    await service.dispatch(type, { id: 'fixture_subscription', object: type.startsWith('invoice') ? 'invoice' : type.startsWith('customer') ? 'subscription' : 'checkout.session', status: 'past_due', metadata: { donation_session_id: 'fixture' }, amount_due: 2100, currency: 'usd' });
    assert.equal(session.status, 'completed', type);
  }
});
test('public pledges validate, retain private consent, and never acknowledge a failed database write', async () => {
  const fixture = database(); const rateLimits: unknown[][] = [];
  const providers = { db: fixture.db, rateLimit: async (...args: unknown[]) => { rateLimits.push(args); } } as unknown as Providers;
  const server = createApp(config, providers).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve)); const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/donations/pledges/`;
  const body = { full_name: 'Fixture Donor', pledge_type: 'organization', organization: 'Fixture Org', email: 'fixture@example.invalid', amount: 42.29, consent_to_publish: false };
  const send = (value: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  try {
    assert.equal((await send({ ...body, organization: null })).status, 422); assert.equal(fixture.tables.pledges!.length, 0);
    const response = await send(body); assert.equal(response.status, 201); assert.equal((await response.json() as Row).status, 'pending');
    assert.equal(fixture.tables.pledges![0]!.amount, '42.29'); assert.equal(fixture.tables.pledges![0]!.consent_to_publish, false); assert.equal(rateLimits.length, 1);
    fixture.fail(); assert.equal((await send(body)).status, 503); assert.equal(fixture.tables.pledges!.length, 1);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
