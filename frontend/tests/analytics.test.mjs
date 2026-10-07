import test from 'node:test';
import assert from 'node:assert/strict';
import { createGa4Tracker, publicPage, safeReferrer } from '../src/shared/analytics/ga4Tracker.js';
function setup(options = {}) {
  const scripts = [];
  const win = { location: { hostname: 'example.org', origin: 'https://example.org' }, navigator: {} };
  const doc = { referrer: 'https://search.example/path?email=private#secret', createElement: () => ({}), head: { appendChild: s => scripts.push(s) } };
  const tracker = createGa4Tracker({ enabled: true, measurementId: 'G-TEST1234', hostnames: ['example.org'], ...options }, win, doc);
  return { tracker, win, scripts };
}
test('off, missing consent, localhost and privacy signals never load a script or send events', () => {
  for (const options of [{ enabled: false }, { hostnames: [] }, { measurementId: 'bad' }]) { const f = setup(options); f.tracker.track('/', 'granted'); assert.equal(f.scripts.length, 0); assert.equal(f.win.dataLayer, undefined); }
  const f = setup(); f.tracker.track('/', 'denied'); assert.equal(f.scripts.length, 0);
  f.win.navigator.globalPrivacyControl = true; f.tracker.track('/', 'granted'); assert.equal(f.scripts.length, 0);
  f.win.navigator.globalPrivacyControl = false; f.win.navigator.doNotTrack = '1'; f.tracker.track('/', 'granted'); assert.equal(f.scripts.length, 0);
  const local = setup({ hostnames: ['localhost'] }); local.win.location.hostname = 'localhost'; local.tracker.track('/', 'granted'); assert.equal(local.scripts.length, 0);
});
test('private/token/confirmation paths never initialize tracking; query/hash and external paths are stripped', () => {
  for (const path of ['/admin/dashboard', '/login', '/set-password/uid/token', '/profile/submit/token', '/unsubscribe/token', '/donation-success', '/portal/student']) { const f = setup(); f.tracker.track(path, 'granted'); assert.equal(f.scripts.length, 0); assert.equal(publicPage(path), null); }
  assert.equal(safeReferrer('https://search.example/private?email=secret#token'), 'https://search.example');
  assert.equal(safeReferrer('javascript:alert(1)'), '');
});
test('manual SPA page views are deduplicated, sanitized, and stop immediately on private entry/revocation', () => {
  const f = setup(); f.tracker.track('/', 'granted'); f.tracker.track('/', 'granted'); f.tracker.track('/stories/', 'granted');
  assert.equal(f.scripts.length, 1); let events = f.win.dataLayer.filter(a => a[0] === 'event'); assert.equal(events.length, 2);
  assert.equal(events[0][2].page_referrer, 'https://search.example'); assert.equal(events[1][2].page_location, 'https://example.org/stories');
  f.tracker.track('/admin/users', 'granted'); assert.equal(f.win['ga-disable-G-TEST1234'], true);
  f.tracker.track('/team', 'denied'); assert.equal(f.win.dataLayer.filter(a => a[0] === 'event').length, 2);
  f.tracker.track('/team', 'granted'); assert.equal(f.win.dataLayer.filter(a => a[0] === 'event').length, 3);
  assert.equal(f.win.dataLayer.find(a => a[0] === 'config')[2].send_page_view, false);
  assert.ok(!JSON.stringify(f.win.dataLayer).includes('email='));
});
