import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeHtml, escapeHtml } from '../src/shared/html.js';
import { imageExtension, safeFilename } from '../src/shared/uploads.js';
import { processStorageCleanup, trackedBucket, type CleanupStore } from '../src/jobs/storageCleanup.js';
import type { Providers } from '../src/shared/providers.js';
test('HTML keeps editorial structure and removes executable markup', () => { const html = safeHtml('<h2>News</h2><p><strong>Update</strong><a href="javascript:alert(1)" onclick="bad()">Link</a><img src="https://example.invalid/photo.jpg" onerror="bad()"></p><script>bad()</script><iframe src="https://bad.invalid"></iframe>'); assert.match(html, /<h2>News<\/h2>/); assert.match(html, /<strong>Update<\/strong>/); assert.doesNotMatch(html, /javascript:|onclick|onerror|script|iframe/); });
test('subject and address cannot inject preview HTML', () => { assert.equal(escapeHtml('<img onerror="bad">'), '&lt;img onerror=&quot;bad&quot;&gt;'); });
test('image signatures reject MIME spoof and unrecognized files', () => { assert.throws(() => imageExtension('image/png', Buffer.from('not an image'))); assert.throws(() => imageExtension('image/svg+xml', Buffer.from('<svg/>'))); assert.equal(imageExtension('image/jpeg', Buffer.from([255, 216, 255, 0])), '.jpg'); assert.equal(safeFilename('../../unsafe file.pdf'), 'unsafe_file.pdf'); });

function cleanupFixture() {
    const events: string[]=[];
    const store: CleanupStore={ due:async()=>[{id:'fixture',attempts:0}],claim:async()=>true,referenced:async()=>false,remove:async()=>{events.push('remove');},finish:async(_job,_token,status)=>{events.push(status);},retry:async()=>{events.push('retry');} };
    return {store,events};
}
test('cleanup preserves referenced media, including frozen newsletter content',async()=>{
    const {store,events}=cleanupFixture();store.referenced=async()=>true;
    await processStorageCleanup(store);assert.deepEqual(events,['referenced']);
});
test('cleanup reference-check outage cannot remove an object',async()=>{
    const {store,events}=cleanupFixture();store.referenced=async()=>{throw new Error('Database outage');};
    assert.deepEqual(await processStorageCleanup(store),{failed:1});assert.deepEqual(events,['retry']);
});
test('cleanup storage outage remains retryable and a later run finishes',async()=>{
    const {store,events}=cleanupFixture();const remove=store.remove;store.remove=async()=>{throw new Error('Storage outage');};
    await processStorageCleanup(store);store.remove=remove;await processStorageCleanup(store);
    assert.deepEqual(events,['retry','remove','completed']);
});
test('cleanup duplicate active claim cannot remove concurrently',async()=>{
    const {store,events}=cleanupFixture();store.claim=async()=>false;
    await processStorageCleanup(store);assert.deepEqual(events,[]);
});
test('a missing durable intent prevents an upload from leaving an orphan',async()=>{
    let uploaded=false;
    const p={db:{from:()=>({upsert:async()=>({error:{code:'503'}})}),storage:{from:()=>({upload:async()=>{uploaded=true;return {error:null};}})}}} as unknown as Providers;
    await assert.rejects(trackedBucket(p,'fixture').upload('unique.jpg',Buffer.from('fixture')),{status:503});
    assert.equal(uploaded,false);
});
