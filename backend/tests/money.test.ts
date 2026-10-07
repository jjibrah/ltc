import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cents, decimal, providerAmount, mergePayment } from '../src/shared/money.js';
test('decimal conversion is exact and rejects fractional cents', () => { assert.equal(cents('1000000.01'), 100000001n); assert.equal(decimal(cents('0.29') + cents('0.01')), '0.30'); assert.throws(() => cents('1.001')); assert.throws(() => providerAmount('0.99')); });
test('delayed failure cannot downgrade a settled or refunded payment', () => { for (const status of ['succeeded', 'partially_refunded', 'refunded']) {
    const before = { status, gross_amount: '10.00', refunded_amount: '5.00' };
    assert.deepEqual(mergePayment(before, { status: 'failed', gross_amount: '0' }), before);
} });
test('replayed success cannot erase refund totals', () => { assert.deepEqual(mergePayment({ status: 'partially_refunded', refunded_amount: '3.00' }, { status: 'succeeded', gross_amount: '10.00' }), { status: 'partially_refunded', refunded_amount: '3.00', gross_amount: '10.00' }); });
