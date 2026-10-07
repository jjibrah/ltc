import { test } from 'node:test';import assert from 'node:assert/strict';import { mergePageOrder } from '../src/shared/api/reorderPage.js';
test('moving a page item preserves records and positions outside that page',()=>{const all=['a','b','c','d'].map(id=>({id}));assert.deepEqual(mergePageOrder(all,[all[2],all[3]],[all[3],all[2]]).map(item=>item.id),['a','b','d','c']);});
test('invalid page order is rejected before any mutation',()=>{assert.throws(()=>mergePageOrder([{id:'a'}],[{id:'a'}],[{id:'outside'}]));});
