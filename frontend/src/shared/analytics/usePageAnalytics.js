import { useEffect } from 'react';
import { createGa4Tracker } from './ga4Tracker';
let tracker;
export function usePageAnalytics(pathname) {
  useEffect(() => {
    tracker ||= createGa4Tracker({ enabled: import.meta.env.VITE_GA4_ENABLED === 'true', measurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID || '', hostnames: (import.meta.env.VITE_ANALYTICS_HOSTNAMES || '').toLowerCase().split(',').map(v => v.trim()).filter(Boolean) }, window, document);
    const consent = () => { try { return localStorage.getItem('ltc-analytics-consent') || 'denied'; } catch { return 'denied'; } };
    const track = () => tracker.track(pathname, consent());
    track(); window.addEventListener('ltc:analytics-consent', track); window.addEventListener('storage', track);
    return () => { window.removeEventListener('ltc:analytics-consent', track); window.removeEventListener('storage', track); };
  }, [pathname]);
}
