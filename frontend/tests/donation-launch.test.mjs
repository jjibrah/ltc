import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Import the real service with only its transport dependencies replaced.
const source = await readFile(new URL('../src/services/donations/donations.service.js', import.meta.url), 'utf8');
const service = await import(`data:text/javascript,${encodeURIComponent(`export const calls=[]; const apiRequest=(...args)=>calls.push(args); const endpoints={donations:{session:id=>'/session/'+id}};\n${source.replace(/^import .*;\n/gm, '')}`)}`);
const { checkoutAttempt } = service;
test('payment confirmation polls fresh status rather than replaying a cached pending response', () => {
  service.getDonationSession('cs_fixture'); service.getDonationSession('cs_fixture');
  assert.deepEqual(service.calls, [['/session/cs_fixture', { cacheTtl: 0 }], ['/session/cs_fixture', { cacheTtl: 0 }]]);
});
test('a failed/unknown checkout retries the same intent, but editing any contribution field creates a new key', () => {
  let keys = 0;
  const key = () => `fixture_${++keys}`;
  const payload = { amount: 21, currency: 'usd', frequency: 'one_time', donor_name: 'Fixture Donor', donor_email: 'fixture@example.invalid', anonymous: true, message: null };
  const original = checkoutAttempt(null, payload, key);
  assert.equal(checkoutAttempt(original, { ...payload }, key), original);
  for (const change of [{ amount: 42 }, { frequency: 'monthly' }, { donor_name: 'Changed' }, { donor_email: 'changed@example.invalid' }, { anonymous: false }, { message: 'Changed message' }]) {
    assert.notEqual(checkoutAttempt(original, { ...payload, ...change }, key).key, original.key);
  }
  assert.equal(keys, 7);
});
