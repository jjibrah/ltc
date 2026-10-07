import { test } from 'node:test';import assert from 'node:assert/strict';import { listQuery } from '../src/shared/api/listQuery.js';
test('list query preserves pagination and safely encodes user filters',()=>{assert.equal(listQuery('/api/admin/donations',{limit:50,offset:100,status:'all',search:'a+b@example.invalid'}),'/api/admin/donations?limit=50&offset=100&search=a%2Bb%40example.invalid');});
