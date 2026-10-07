import test from 'node:test';
import assert from 'node:assert/strict';
import { dueState, billingTotals, costLabel, todayDate } from '../src/admin/billing/billingModel.js';
test('deadlines distinguish local today, overdue, unknown and archived across month/leap boundaries', () => {
  assert.equal(todayDate(new Date(2028, 1, 29, 23)), '2028-02-29');
  const service = { active: true, next_due_date: '2028-02-29' };
  assert.equal(dueState(service, '2028-02-29').label, 'Due today');
  assert.equal(dueState(service, '2028-03-01').label, 'Overdue');
  assert.equal(dueState({ ...service, next_due_date: null }).label, 'Date needed');
  assert.equal(dueState({ ...service, active: false }).label, 'Archived');
});
test('upcoming cost totals include overdue, exclude archived/unknown/far dates and never merge currencies', () => {
  const services = [
    { active: true, currency: 'USD', amount: '0.10', next_due_date: '2026-10-01' },
    { active: true, currency: 'USD', amount: '0.20', next_due_date: '2026-10-20' },
    { active: true, currency: 'KES', amount: '1500', next_due_date: '2026-10-20' },
    { active: false, currency: 'USD', amount: '99', next_due_date: '2026-10-20' },
    { active: true, currency: 'USD', amount: '99', next_due_date: null },
    { active: true, currency: 'USD', amount: null, next_due_date: '2026-10-20' },
    { active: true, currency: 'USD', amount: '99', next_due_date: '2026-12-20' },
  ];
  assert.deepEqual(billingTotals(services, '2026-10-07'), { USD: 30, KES: 150000 });
  assert.equal(costLabel({ currency: 'USD', amount: null }), 'Cost not entered');
  assert.match(costLabel({ currency: 'USD', amount: '0' }), /0\.00/);
});
