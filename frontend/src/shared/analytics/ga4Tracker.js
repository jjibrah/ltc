// Intentionally restricted to public, static paths: never pass query/hash or form data.
export const trackedPages = { '/': 'Home', '/about': 'About', '/mission': 'Mission', '/impact': 'Impact', '/stories': 'Stories', '/team': 'Team', '/donate': 'Donate', '/mentor': 'Mentorship' };
export function publicPage(pathname) { const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname; return Object.hasOwn(trackedPages, path) ? path : null; }
export function safeReferrer(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.origin : ''; } catch { return ''; } }
export function createGa4Tracker({ enabled, measurementId, hostnames }, win, doc) {
  let initialized = false, lastPath = null, previousPage = '';
  const valid = enabled === true && /^G-[A-Z0-9]{4,20}$/.test(measurementId || '') && hostnames.includes(win.location.hostname.toLowerCase()) && !['localhost', '127.0.0.1', '[::1]'].includes(win.location.hostname);
  const privacySignal = () => win.navigator.globalPrivacyControl === true || win.navigator.doNotTrack === '1';
  const call = (...args) => { win.dataLayer ||= []; win.dataLayer.push(args); };
  return {
    track(pathname, consent) {
      const path = publicPage(pathname);
      const allowed = valid && consent === 'granted' && !privacySignal() && Boolean(path);
      win[`ga-disable-${measurementId}`] = !allowed;
      if (!allowed) { lastPath = null; if (initialized) call('consent', 'update', { analytics_storage: consent === 'granted' && !privacySignal() ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); return; }
      if (lastPath === path) return;
      const location = `${win.location.origin}${path}`;
      if (!initialized) {
        initialized = true; win.gtag = (...args) => call(...args);
        call('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
        call('js', new Date());
        call('config', measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: location, page_referrer: safeReferrer(doc.referrer), page_title: trackedPages[path] });
        const script = doc.createElement('script'); script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`; script.id = 'ltc-ga4-script'; doc.head.appendChild(script);
      } else call('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      call('event', 'page_view', { send_to: measurementId, page_location: location, page_title: trackedPages[path], page_referrer: previousPage || safeReferrer(doc.referrer) });
      lastPath = path; previousPage = location;
    },
  };
}
