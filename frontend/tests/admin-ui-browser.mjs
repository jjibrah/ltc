// Production-build browser checks. All API requests are intercepted; no credentials or providers are used.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';

const baseline = process.argv.includes('--baseline');
const googleFonts = process.argv.includes('--google-fonts');
const root = resolve(process.argv.find(arg => arg.startsWith('--dist='))?.slice(7) || process.env.ADMIN_UI_DIST || 'dist');
const output = resolve(process.argv.find(arg => arg.startsWith('--output='))?.slice(9) || process.env.ADMIN_UI_OUTPUT || `/tmp/ltc-admin-redesign/${baseline ? 'before' : 'after'}`);
await mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.JPG': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://fixture.invalid').pathname;
    let file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + '/') || !extname(file)) file = resolve(root, 'index.html');
    const contents = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(contents);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const profileDirectory = await mkdtemp(resolve(tmpdir(), 'ltc-admin-browser-'));
const chrome = process.env.LTC_CHROMIUM || '/home/jjibrah/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = spawn(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profileDirectory}`, 'about:blank'], { stdio: 'ignore' });
browser.on('error', () => {});
const allPermissions = ['dashboard.view', 'users.manage_permissions', 'users.invite', 'users.view', 'profiles.view', 'profiles.update', 'profiles.delete', 'profiles.approve', 'profiles.publish', 'newsletters.view', 'newsletters.create', 'newsletters.update', 'newsletters.send', 'newsletters.delete', 'stories.view', 'stories.create', 'stories.update', 'stories.delete', 'stories.publish', 'mentors.view', 'mentors.update', 'donations.view', 'pledges.view', 'audit.view'];
let permissions = allPermissions;
const user = { id: 'fixture-user', name: 'Alex Communications', email: 'alex@example.invalid', role: 'super_admin', status: 'active' };
const profile = { id: 'fixture-profile', name: 'Casey Reviewer', email: 'casey@example.invalid', role: 'Team member', department: 'Communications', status: 'pending', bio: 'A longer synthetic biography to check wrapping and readability.', quote: 'Supporting the next generation.', created_at: '2026-10-07T09:00:00Z', display_order: 0 };
let newsletter = { id: 'fixture-newsletter', title: 'October community update', body_html: '<p>A synthetic newsletter draft for interface verification.</p>', status: 'draft', attachments: [], updated_at: '2026-10-07T09:00:00Z' };
const summary = { users: { total: 6, active: 5, invited: 1 }, team_profiles: { total: 3, published: 1, pending: 1, changes_requested: 1 }, subscribers: { active: 7, total: 8 }, newsletters: { draft: 1, scheduled: 0, sent: 3 }, stories: { draft: 1, published: 1, total: 2 }, mentors: { pending: 1, under_review: 1, total: 2 }, donations: { total_collected: 3469.8, completed: 33, attempts: 46, monthly: 0, currency: 'usd' } };
const billingId = '11111111-1111-4111-8111-111111111111';
let billingRecords = [{ id: billingId, name: 'AWS', category: 'hosting', owner: 'Finance', amount: '12.50', currency: 'USD', cycle: 'usage_based', next_due_date: '2026-10-01', portal_url: '', notes: '', active: true, updated_at: '2026-10-07T00:00:00Z' }];
let operationsSettings = { analytics_provider: 'none', analytics_dashboard_url: '' };
const auditEvent = { id: 'fixture-event', action: 'LOGIN_SUCCESS', actor: user, actor_user_id: user.id, created_at: '2026-10-07T09:00:00Z', entity_type: 'user', entity_id: user.id, before_state: {}, after_state: { status: 'active' } };
let acceptConfirm = false;
let analyticsMode = 'not_configured';
let failAnalytics = false;
let failBilling = false;
let failSave = false, failStatus = false, failPledges = false, failSummary = false, emptyNewsletters = false, delayLists = false, populatedStories = false;
let ws, send, requests = [], errors = [], unexpected = [];
const pages = [], checks = [], contrast = [];
const loadedDocuments = new Set();
function fixture(path, method, body) {
  if (path === '/api/auth/me') return { ...user, permissions };
  if (path.includes('/preview/')) return '<!doctype html><html><body><h1>October community update</h1><p>Synthetic email preview.</p></body></html>';
  if (path === '/api/admin/billing') { if (method === 'POST') { const record = { ...JSON.parse(body), id: crypto.randomUUID(), updated_at: '2026-10-07T00:00:00Z' }; billingRecords.push(record); return record; } return { results: billingRecords }; }
  if (path.endsWith('/payments')) { if (method === 'POST') { const record = billingRecords.find(s => path.includes(s.id)); record.next_due_date = JSON.parse(body).next_due_date; return { service: record, payment: { id: 'fixture-payment' } }; } return { results: [] }; }
  if (path.startsWith('/api/admin/billing/')) { const record = billingRecords.find(s => path.includes(s.id)); Object.assign(record, JSON.parse(body)); return record; }
  if (path === '/api/admin/operations-settings') { if (method === 'PUT') operationsSettings = JSON.parse(body); return operationsSettings; }
  if (path === '/api/admin/analytics/status') return { provider: 'google_analytics', status: 'not_configured', hostnames: [] };
  if (path === '/api/admin/analytics') return analyticsMode === 'ready' ? { status: 'ready', provider: 'google_analytics', days: 30, period: 'Last 30 complete days', timezone: 'Africa/Nairobi', fetched_at: '2026-10-07T00:00:00Z', totals: { visitors: 42, page_views: 120, sessions: 55 }, daily: [{ label: '20261001', value: 12 }], pages: [{ label: '/stories', value: 80 }], sources: [{ label: 'google / organic', value: 22 }], countries: [{ label: 'Kenya', value: 30 }], limited: true } : { provider: 'google_analytics', status: analyticsMode };
  if (path === '/api/admin/dashboard/') return summary;
  if (path.includes('/subscribers/count')) return { count: 7 };
  if (path.includes('/newsletters/')) {
    if (method === 'PATCH') { newsletter = { ...newsletter, ...JSON.parse(body) }; return newsletter; }
    if (path.endsWith('/send/')) return { status: 'sending' };
    if (path.endsWith('/status/')) return { status: 'sent', recipient_count: 7 };
    return method === 'POST' ? newsletter : emptyNewsletters ? [] : [newsletter];
  }
  if (path === '/api/admin/team-profiles') return [profile];
  if (path.startsWith('/api/admin/team-profiles/') || path === '/api/admin/my-team-profile') return profile;
  if (path === '/api/admin/profile-submission-links') return [];
  if (path === '/api/admin/users') return [user];
  if (path === '/api/admin/user-authorizations') return { [user.id]: allPermissions };
  if (path === '/api/admin/permissions') return allPermissions.map(code => ({ code, module: code.split('.')[0], action: code.split('.')[1], name: code, description: code, is_system_only: false }));
  if (path === '/api/admin/role-permissions') return { roles: { super_admin: allPermissions, admin: allPermissions, staff: ['newsletters.view'], viewer: ['dashboard.view'] } };
  if (path.endsWith('/permissions')) return { user, role_permissions: allPermissions, effective_permissions: allPermissions, grants: [], denies: [], overrides: [] };
  if (path.startsWith('/api/admin/users/')) return user;
  if (path === '/api/admin/mentors/applications') return [{ id: 'fixture-mentor', full_name: 'Morgan Mentor', email: 'morgan@example.invalid', professional_background: 'Education and community programmes', help_options: ['Mentoring'], status: 'pending', submitted_at: '2026-10-07T09:00:00Z' }];
  if (path === '/api/admin/donations/summary') return summary.donations;
  if (path === '/api/admin/donations') return [{ id: 'fixture-donation', donor_name: 'Private donor', donor_email: 'donor@example.invalid', requested_amount: '1234.56', currency: 'usd', frequency: 'one_time', payment_source: 'stripe', status: 'completed', anonymous: true, supporter_publication_status: 'pending', donated_at: '2026-10-07T09:00:00Z' }];
  if (path === '/api/admin/donations/pledges') return [{ id: 'fixture-pledge', full_name: 'Taylor Pledger', email: 'taylor@example.invalid', amount: '50', currency: 'usd', frequency: 'one_time', consent_to_publish: false, status: 'pending', created_at: '2026-10-07T09:00:00Z' }];
  if (path === '/api/audit') return { results: [auditEvent], count: 1 };
  if (path === '/api/audit/summary') return { total: 1, sensitive: 0, today: 1, actions: {} };
  if (path.startsWith('/api/audit/')) return auditEvent;
  if (path.includes('progress')) return { total_collected: 0, pledged_amount: 0, currency: 'usd', successful_payment_count: 0, pledge_count: 0 };
  if (path.includes('/session/')) return { session_id: 'fixture', status: 'pending', amount: 10, currency: 'usd', frequency: 'one_time' };
  if (path === '/api/admin/stories') return populatedStories ? [{ id: 'fixture-story', name: 'A student opportunity', excerpt: 'Synthetic excerpt', content: '<p>Synthetic story</p>', order: 1, is_published: true, published_date: '2026-10-07' }] : [];
  if (['/api/stories', '/api/team-profiles/published', '/api/donations/supporters/'].includes(path)) return [];
  if (path.startsWith('/api/profile-submission-links/')) return { valid: false, message: 'Synthetic expired submission link' };
  if (path.startsWith('/api/unsubscribe/')) return { message: 'Synthetic unsubscribe confirmation' };
  unexpected.push({ path, method });
  return [];
}
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(resolve(profileDirectory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  assert.ok(port, 'Chromium starts (set LTC_CHROMIUM to the installed binary)');
  const target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let sequence = 0; const pending = new Map();
  send = (method, params = {}) => new Promise((resolveCall, rejectCall) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); rejectCall(new Error(`Browser protocol timeout: ${method}`)); }, 15000);
    pending.set(id, { r: value => { clearTimeout(timer); resolveCall(value); }, j: error => { clearTimeout(timer); rejectCall(error); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.onmessage = async event => {
    const m = JSON.parse(event.data);
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (!p) return; if (m.error) p.j(new Error(m.error.message)); else p.r(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Page.lifecycleEvent' && m.params.name === 'load') loadedDocuments.add(m.params.loaderId);
    if (m.method === 'Page.javascriptDialogOpening') {
      // Navigation after the failed-save fixture deliberately discards synthetic edits.
      await send('Page.handleJavaScriptDialog', { accept: m.params.type === 'beforeunload' || acceptConfirm });
      return;
    }
    if (m.method !== 'Fetch.requestPaused') return;
    const request = m.params;
    try {
      const url = new URL(request.request.url);
      if (url.origin === origin && !url.pathname.startsWith('/api/')) await send('Fetch.continueRequest', { requestId: request.requestId });
      else if (url.pathname.startsWith('/api/')) {
        const { method, postData } = request.request;
        if (method !== 'OPTIONS') requests.push({ path: url.pathname + url.search, method, body: postData });
        if (delayLists && method === 'GET' && url.pathname.includes('/newsletters/')) await new Promise(r => setTimeout(r, 700));
        const failed = method !== 'OPTIONS' && (failAnalytics && url.pathname === '/api/admin/analytics' || failBilling && url.pathname === '/api/admin/billing' || failSave && method === 'PATCH' || failStatus && url.pathname.endsWith('/status/') || failPledges && url.pathname.endsWith('/donations/pledges') || failSummary && url.pathname.endsWith('/donations/summary'));
        const response = failed ? { detail: 'Synthetic provider unavailable' } : method === 'OPTIONS' ? {} : fixture(url.pathname, method, postData);
        await send('Fetch.fulfillRequest', { requestId: request.requestId, responseCode: failed ? 503 : 200, responseHeaders: [{ name: 'Content-Type', value: typeof response === 'string' ? 'text/html' : 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: '*' }], body: Buffer.from(typeof response === 'string' ? response : JSON.stringify(response)).toString('base64') });
      } else if (googleFonts && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) await send('Fetch.continueRequest', { requestId: request.requestId });
      else await send('Fetch.failRequest', { requestId: request.requestId, errorReason: 'BlockedByClient' });
    } catch (error) { errors.push(`Harness: ${error.message}`); }
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.setLifecycleEventsEnabled', { enabled: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('ltc_access_token','synthetic');localStorage.setItem('ltc_refresh_token','synthetic');localStorage.setItem('ltc_access_expires_at','4102444800');` });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = async (key, code = key, modifiers = 0) => {
    const virtualKey = { Enter: 13, Tab: 9, Escape: 27, Backspace: 8, ' ': 32 }[key];
    const params = { key, code, modifiers, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey };
    await send('Page.bringToFront');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params }); await wait(50);
  };
  const clickText = async text => {
    const bounds = await evaluate(`(() => {const modal=[...document.querySelectorAll('dialog[open]')].at(-1);const b=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&e.getClientRects().length&&!e.disabled&&(!modal||modal.contains(e)));if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    assert.ok(bounds, `Visible, available control exists: ${text}`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...bounds });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...bounds }); await wait(100);
  };
  const navigate = async (path, width = 1440, expectedPath = path) => {
    errors = []; requests = [];
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    const navigation = await send('Page.navigate', { url: origin + path });
    let ready = false;
    for (let i = 0; i < 200; i++) {
      ready = loadedDocuments.has(navigation.loaderId) && await evaluate(`location.pathname===${JSON.stringify(expectedPath)} && document.readyState==='complete' && !document.querySelector('.app-loading-screen') && ${path.startsWith('/admin') ? "Boolean(document.querySelector('.admin-page, .auth-page')) && !document.querySelector('.admin-state')" : "Boolean(document.querySelector('h1'))"}`);
      if (ready) break;
      await wait(50);
    }
    assert.ok(ready, `${path}: fixture content finishes loading`);
    await wait(100);
  };
  const snapshot = async name => {
    const state = await evaluate(`(() => {const visible=e=>e.getClientRects().length&&!e.closest('[inert]');const depth=e=>1+Math.max(0,...[...e.children].map(depth));return {title:document.querySelector('h1')?.textContent,text:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth,headerDepth:document.querySelector('.admin-page-header')?depth(document.querySelector('.admin-page-header')):null,fields:[...document.querySelectorAll('input,select,textarea')].filter(visible).map(e=>({tag:e.tagName,type:e.type,name:e.name,ariaLabel:e.getAttribute('aria-label')})),font:document.querySelector('h1')?getComputedStyle(document.querySelector('h1')).font:null}})()`);
    const shot = await send('Page.captureScreenshot', { captureBeyondViewport: false });
    await writeFile(resolve(output, name + '.png'), Buffer.from(shot.data, 'base64'));
    pages.push({ name, state, requests: [...requests], errors: [...errors] });
    assert.equal(errors.length, 0, `${name}: no runtime exceptions`);
    if (!baseline) assert.equal(state.overflow, false, `${name}: no global horizontal overflow`);
  };
  for (const width of (process.argv.includes('--interactions-only') ? [] : [320, 375, 768, 1024, 1440])) {
    for (const page of ['dashboard', 'billing', 'settings', 'newsletters', 'profiles', 'profiles/fixture-profile', 'stories', 'mentors', 'donations', 'users', 'users/fixture-user', 'audit', 'profile', 'first-login/change-password']) {
      await navigate('/admin/' + page, width); await snapshot(`${width}-${page.replaceAll('/', '-')}`);
    }
  }
  if (!baseline && !process.argv.includes('--interactions-only')) {
    await navigate('/admin/dashboard'); await evaluate(`document.querySelector('.admin-theme-button').focus()`); await key('Enter');
    for (const width of [320, 375, 1440]) for (const page of ['dashboard','billing','settings','newsletters','profiles','profiles/fixture-profile','stories','mentors','donations','users','users/fixture-user','audit','profile','first-login/change-password']) {
      await navigate('/admin/'+page,width); assert.equal(await evaluate(`document.querySelector('.admin-portal').dataset.theme`),'dark'); await snapshot(`dark-${width}-${page.replaceAll('/','-')}`);
    }
    await navigate('/admin/donations');
    const darkPairs = await evaluate(`['.admin-page-header h1','.admin-count','.admin-nav-link.active','.admin-primary-button','.admin-secondary-button','.admin-badge--success'].map(selector=>{const e=document.querySelector(selector);if(!e)return null;let p=e,bg='';while(p){bg=getComputedStyle(p).backgroundColor;if(!bg.endsWith(', 0)')&&bg!=='transparent')break;p=p.parentElement;}return {selector,foreground:getComputedStyle(e).color,background:bg}}).filter(Boolean)`);
    const lum = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    for(const pair of darkPairs){const a=lum(pair.foreground),b=lum(pair.background);const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,`Dark ${pair.selector} contrast >=4.5`);contrast.push({...pair,theme:'dark',ratio});}
    await evaluate(`document.querySelector('.admin-theme-button').focus()`); await key('Enter');
    checks.push('Graphite theme persists across all admin pages at desktop/mobile widths');
  }
  // A public control at every agreed width, with all outgoing requests blocked or fulfilled.
  for (const width of (process.argv.includes('--interactions-only') ? [] : [320, 375, 768, 1024, 1440])) { await navigate('/', width); await snapshot(`${width}-public-home`); }
  if (!baseline) {
    await navigate('/admin/dashboard');
    assert.ok(await evaluate(`document.body.innerText.includes('Not configured')&&document.body.innerText.includes('Recent activity')&&document.body.innerText.includes('Service deadlines')`), 'Dashboard shows real activity/deadlines and honest traffic availability');
    const beforeRefresh = requests.filter(r => r.path === '/api/admin/dashboard/').length; await clickText('Refresh totals'); await wait(150); assert.equal(requests.filter(r => r.path === '/api/admin/dashboard/').length, beforeRefresh + 1, 'Manual refresh bypasses cached dashboard totals');
    await evaluate(`document.querySelector('.admin-collapse-button').focus()`); await key('Enter');
    assert.ok(await evaluate(`document.querySelector('.admin-shell--collapsed')&&document.querySelector('.admin-collapse-button').getAttribute('aria-expanded')==='false'`), 'Keyboard collapse switches to icon rail');
    assert.equal(await evaluate(`document.querySelector('.admin-sidebar').getBoundingClientRect().width`), 64);
    assert.equal(await evaluate(`document.querySelector('.admin-nav-link').getAttribute('aria-label')`), 'Dashboard');
    await snapshot('dashboard-collapsed'); await navigate('/admin/billing');
    assert.ok(await evaluate(`!!document.querySelector('.admin-shell--collapsed')`), 'Collapsed preference survives navigation');
    await evaluate(`document.querySelector('.admin-collapse-button').focus()`); await key('Enter');
    await clickText('Add service');
    await evaluate(`(() => {const input=[...document.querySelectorAll('dialog input')].find(e=>e.closest('label').textContent.includes('Service name'));Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Domain renewal');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await clickText('Save service'); await wait(150);
    assert.ok(await evaluate(`document.body.innerText.includes('Domain renewal')&&!document.querySelector('dialog[open]')`), 'Service creation persists returned record');
    await snapshot('billing-added'); await clickText('Record payment');
    await evaluate(`(() => {const input=[...document.querySelectorAll('dialog input')].find(e=>e.closest('label').textContent.includes('Next due date'));Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'2026-12-01');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await clickText('Record payment'); await wait(150);
    assert.ok(await evaluate(`!document.querySelector('dialog[open]')`), 'Payment form closes after confirmed recording');
    assert.equal(requests.filter(r=>r.method==='POST'&&r.path.endsWith('/payments')).length,1, 'Payment recording submits once');
    await navigate('/admin/settings'); assert.ok(await evaluate(`document.body.innerText.includes('Public collection is disabled')`), 'Settings explains analytics limits');
    permissions = ['dashboard.view', 'donations.view']; user.role = 'staff'; await navigate('/admin/billing');
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(e=>['Add service','Edit','Record payment'].includes(e.textContent.trim()))`), false, 'Finance can view billing but cannot manage it');
    await navigate('/admin/settings'); await evaluate(`document.querySelector('.admin-disclosure').open=true`); assert.ok(await evaluate(`document.querySelector('select').disabled`), 'Finance cannot edit shared settings');
    permissions = ['dashboard.view']; await navigate('/admin/billing', 1440, '/admin/dashboard'); assert.equal(await evaluate(`document.querySelectorAll('.admin-nav-link[href="/admin/billing"]').length`),0,'Non-finance billing navigation and route are denied');
    permissions = allPermissions; user.role = 'super_admin'; failBilling = true; await navigate('/admin/billing'); assert.ok(await evaluate(`document.querySelector('[role="alert"]')&&[...document.querySelectorAll('.operations-summary strong')].every(e=>e.textContent==='—')`),'Unavailable billing never shows zero totals'); await snapshot('billing-unavailable'); failBilling = false;
    analyticsMode = 'ready'; await navigate('/admin/dashboard'); await wait(150); assert.ok(await evaluate(`document.body.innerText.includes('120')&&document.body.innerText.includes('google / organic')&&document.body.innerText.includes('Google marks this report')`),'Real-report fixtures show totals/breakdowns and limitations'); await snapshot('traffic-ready');
    failAnalytics = true; await navigate('/admin/dashboard'); await wait(150); assert.ok(await evaluate(`document.querySelector('.dashboard-traffic-card [role="alert"]')&&!document.querySelector('.traffic-totals')&&document.body.innerText.includes('Fund raised')`),'Traffic provider failures do not invent zero totals or hide operational metrics'); await snapshot('traffic-failure'); failAnalytics = false; analyticsMode = 'not_configured';
    assert.equal(await evaluate(`document.querySelectorAll('#ltc-ga4-script').length`), 0, 'Collection-off build never loads Google tracking');
    checks.push('Dashboard operations, keyboard collapse persistence, billing create/payment and settings');
  }
  if (!baseline) {
    await navigate('/admin/stories');
    await evaluate(`(()=>{const input=document.querySelector('#story-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Unsent story draft');input.dispatchEvent(new Event('input',{bubbles:true}));})()`); await wait(100);
    await clickText('Dashboard'); assert.equal(await evaluate(`location.pathname`),'/admin/stories','Rejected leave confirmation preserves editor');
    acceptConfirm=true; await clickText('Dashboard'); await wait(200); assert.equal(await evaluate(`location.pathname`),'/admin/dashboard');
    await clickText('Stories'); await wait(200); assert.equal(await evaluate(`document.querySelector('#story-name').value`),'Unsent story draft','SPA navigation restores in-tab unsaved draft'); await snapshot('story-draft-restored'); acceptConfirm=false;
    checks.push('Unsaved-change rejection and in-tab story draft restoration');
    populatedStories=true; await navigate('/admin/stories');
    assert.ok(await evaluate(`document.querySelector('.story-directory')?.innerText.includes('A student opportunity')`),'Populated story directory renders records'); await snapshot('stories-populated');
    await evaluate(`document.querySelector('.admin-portal').setAttribute('data-theme','dark')`); await wait(200); await snapshot('stories-populated-dark');
    populatedStories=false; await navigate('/admin/stories'); await evaluate(`document.querySelector('.admin-portal').setAttribute('data-theme','dark')`);
    await wait(200); const emptyColours=await evaluate(`(()=>{const e=document.querySelector('.admin-empty p');return {foreground:getComputedStyle(e).color,expected:getComputedStyle(document.querySelector('.admin-portal')).getPropertyValue('--admin-muted').trim()};})()`);
    assert.equal(emptyColours.foreground,await evaluate(`(()=>{const e=document.createElement('span');e.style.color='var(--admin-muted)';document.querySelector('.admin-portal').append(e);const value=getComputedStyle(e).color;e.remove();return value;})()`),'Dark empty-state copy uses readable muted token'); await snapshot('stories-empty-dark');
    checks.push('Populated and empty story directory in both themes');
  }
  await navigate('/admin/newsletters'); await clickText('Edit'); await snapshot('newsletter-compose');
  await clickText(baseline ? '🔍 Preview' : 'Preview'); await wait(500); await snapshot('newsletter-preview');
  if (!baseline) {
    assert.ok(await evaluate(`!!document.querySelector('dialog[open]')`), 'Preview is a native modal');
    await key('Tab'); assert.ok(await evaluate(`!!document.activeElement.closest('dialog[open]')`), 'Preview contains keyboard focus');
  }
  await key('Escape');
  if (!baseline) assert.equal(await evaluate(`document.querySelectorAll('dialog[open]').length`), 0, 'Preview Escape dismisses the dialog');
  await clickText(baseline ? '📬 Send Newsletter' : 'Send newsletter'); await snapshot('newsletter-send-confirm'); await key('Escape');
  if (!baseline) {
    await navigate('/admin/newsletters');
    await evaluate(`document.querySelector('.admin-info-button').focus()`); await key('Enter');
    assert.ok(await evaluate(`document.querySelector('.admin-info-button').getAttribute('aria-expanded')==='true'`), 'Help opens using keyboard');
    await snapshot('newsletter-help'); await key('Escape');
    assert.ok(await evaluate(`document.activeElement.matches('.admin-info-button')&&document.activeElement.getAttribute('aria-expanded')==='false'`), 'Help Escape restores focus'); checks.push('Info keyboard open / Escape / focus');
    await clickText('Edit');
    await evaluate(`document.querySelector('#newsletter-title').focus()`); await send('Input.insertText', { text: ' revised' }); await wait(1800);
    assert.ok(requests.some(r => r.method === 'PATCH' && JSON.parse(r.body).title.endsWith(' revised')), 'Title edit preserves autosave payload');
    failSave = true; await send('Input.insertText', { text: ' unsaved' }); await wait(1800);
    assert.ok(await evaluate(`document.querySelector('#newsletter-title').value.endsWith(' unsaved')`), 'Failed save retains typed input');
    await clickText('Send newsletter'); await clickText('Send now'); await wait(200);
    assert.equal(requests.filter(r => r.path.endsWith('/send/') && r.method === 'POST').length, 0, 'Failed save blocks send');
    assert.ok(await evaluate(`[...document.querySelectorAll('dialog[open] button')].some(e=>e.textContent.trim()==='Close'&&!e.disabled)&&document.querySelector('dialog[open]').textContent.includes('Save failed')`), 'Failed save exposes its reason and releases the dialog busy state');
    await snapshot('newsletter-save-failure'); await key('Escape'); failSave = false; checks.push('Autosave request parity, failed-save recovery and blocked send');
    assert.equal(await evaluate(`document.querySelectorAll('dialog[open]').length`), 0, 'Failed-save confirmation can be dismissed');
    await navigate('/admin/newsletters'); await clickText('Edit');
    await evaluate(`document.querySelector('#newsletter-title').focus();document.querySelector('#newsletter-title').select()`); await key('Backspace');
    await clickText('Send newsletter'); await clickText('Send now');
    assert.ok(await evaluate(`[...document.querySelectorAll('dialog[open] button')].some(e=>e.textContent.trim()==='Close'&&!e.disabled)&&document.querySelector('dialog[open]').textContent.includes('Add a title and body')`), 'Invalid title exposes its reason and releases the confirmation busy state');
    assert.equal(requests.filter(r => r.path.endsWith('/send/') && r.method === 'POST').length, 0, 'Invalid title does not submit send'); await key('Escape');
    newsletter = { ...newsletter, title: 'October community update' };
    await navigate('/admin/newsletters'); await clickText('Edit'); failStatus = true;
    await clickText('Send newsletter'); await clickText('Send now');
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`document.body.innerText.includes('Unable to verify send status')`)) break;
      await wait(50);
    }
    assert.equal(requests.filter(r => r.path.endsWith('/send/') && r.method === 'POST').length, 1, 'Verification failure never automatically resubmits a send');
    assert.ok(await evaluate(`document.body.innerText.includes('Unable to verify send status')`), 'Unknown verification status is explicit');
    await snapshot('newsletter-unknown-send-status'); failStatus = false; checks.push('Invalid input recovery and unknown send status without resubmission');
    await navigate('/admin/newsletters', 375); await evaluate(`document.querySelector('.admin-menu-button').focus();document.querySelector('.admin-menu-button').click()`); await wait(100);
    assert.ok(await evaluate(`document.querySelector('.admin-main').inert`), 'Drawer isolates main content');
    await key('Tab'); assert.ok(await evaluate(`!!document.activeElement.closest('.admin-sidebar')`), 'Drawer contains keyboard focus');
    await snapshot('mobile-navigation'); await key('Escape'); assert.ok(await evaluate(`document.activeElement.matches('.admin-menu-button')&&!document.querySelector('.admin-main').inert`), 'Drawer restores trigger focus');
    await key('Tab'); assert.equal(await evaluate(`!!document.activeElement.closest('.admin-sidebar')`), false, 'Closed drawer is not tabbable'); checks.push('Mobile drawer isolation / focus / Escape / restoration');
    await navigate('/admin/profiles'); assert.equal(await evaluate(`document.querySelector('.admin-topbar__title').textContent`), 'Team Profiles', 'Profile list label is accurate');
    await clickText('Create submission link'); await key('Tab', 'Tab', 8); assert.ok(await evaluate(`!!document.activeElement.closest('dialog[open]')`), 'Modal Shift+Tab contains focus'); await key('Escape'); checks.push('Shared dialog focus containment and restoration');
    permissions = ['newsletters.view', 'newsletters.update']; await navigate('/admin/newsletters');
    assert.equal(await evaluate(`document.querySelectorAll('.admin-nav-link[href="/admin/users"]').length`), 0, 'Communications permissions hide users navigation');
    await clickText('Edit'); assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(e=>e.textContent.trim()==='Send newsletter')`), false, 'No send action without send permission');
    await navigate('/admin/users', 1440, '/admin/dashboard'); assert.ok(await evaluate(`document.querySelector('.admin-permission-denied')?.textContent.includes('Access denied')`), 'Denied route remains denied'); checks.push('Communications / denied permission fixtures');
    permissions = allPermissions; failPledges = true; failSummary = true; await navigate('/admin/donations');
    await snapshot('donations-independent-failure');
    assert.ok(await evaluate(`document.body.innerText.includes('Private donor')&&document.querySelector('[role="alert"]')?.textContent.includes('Synthetic provider unavailable')`), 'HTTP 503 pledge/summary failures do not hide ledger and expose the provider error'); failPledges = false; failSummary = false;
    emptyNewsletters = true; await navigate('/admin/newsletters'); assert.ok(await evaluate(`document.body.innerText.includes('No drafts')`), 'Empty state renders'); emptyNewsletters = false;
    delayLists = true; await navigate('/admin/newsletters'); delayLists = false;
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.ok(await evaluate(`getComputedStyle(document.querySelector('.admin-nav-link')).transitionDuration==='0s'`), 'Reduced motion navigation is static'); checks.push('Independent failures, empty and reduced-motion states');
    await navigate('/admin/newsletters', 720); await send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 }); await snapshot('newsletter-zoom-200'); await send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await navigate('/admin/donations');
    const pairs = await evaluate(`['.admin-page-header h1','.admin-count','.admin-nav-link.active','.admin-nav-group','.admin-primary-button','.admin-secondary-button','.admin-badge--success'].map(selector=>{const e=document.querySelector(selector);if(!e)return null;let p=e,bg='';while(p){bg=getComputedStyle(p).backgroundColor;if(!bg.endsWith(', 0)')&&bg!=='transparent')break;p=p.parentElement;}return {selector,foreground:getComputedStyle(e).color,background:bg}}).filter(Boolean)`);
    const luminance = color => {
      const components = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
      return components.reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    };
    for (const pair of pairs) {
      const foreground = luminance(pair.foreground), background = luminance(pair.background);
      const ratio = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
      contrast.push({ ...pair, ratio: Number(ratio.toFixed(2)) });
      assert.ok(ratio >= 4.5, `${pair.selector}: rendered text contrast >= 4.5:1`);
    }
    const accessibility = await send('Accessibility.getFullAXTree');
    const controls = accessibility.nodes.filter(node => !node.ignored && ['button', 'link', 'textbox', 'combobox'].includes(node.role?.value));
    assert.ok(controls.length > 0 && controls.every(node => node.name?.value), 'Rendered donation controls have accessible names');
    assert.equal(await evaluate(`document.querySelectorAll('main').length`), 1, 'Admin has one main landmark');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.admin-nav-link:not(.active)')).fontWeight`), '400', 'Sidebar labels use regular weight');
    assert.ok(await evaluate(`getComputedStyle(document.querySelector('.admin-nav-link')).fontFamily.includes('Geist')`), 'Admin typography uses Geist');
    assert.ok(await evaluate(`document.querySelector('.admin-sidebar-account').textContent.includes('Alex Communications')`), 'Sidebar account identity stays visible');
    if (googleFonts) {
      await evaluate('document.fonts.ready');
      assert.ok(await evaluate(`[...document.fonts].some(font=>font.family.replaceAll('"','')==='Geist'&&font.status==='loaded')`), 'Google Geist is loaded, not just declared');
    }
    checks.push('Rendered contrast samples, accessible control names and one main landmark');
  }
  assert.deepEqual(unexpected, [], 'Every API request has an explicit fixture');
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ conditions: `Local production build; synthetic API fixtures; external requests blocked${googleFonts ? ' except Google Fonts CSS/font assets' : ''}; no real credentials, database, payments or email. Zoom screenshot uses page-scale emulation; real desktop text zoom/screen-reader testing remain manual.`, baseline, pages, checks, contrast, unexpected }, null, 2));
  console.log(`PASS: ${pages.length} screenshots/states; ${checks.length} interaction groups. Evidence: ${output}`);
} catch (error) {
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ error: error.stack, pages, checks, requests, errors, unexpected }, null, 2));
  throw error;
} finally {
  ws?.close();
  if (browser.exitCode === null) { const exited = new Promise(r => browser.once('exit', r)); browser.kill(); await exited; }
  await new Promise(r => server.close(r));
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
