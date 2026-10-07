import { importPKCS8, SignJWT } from 'jose';
import type { Express } from 'express';
import { z } from 'zod';
import type { Config } from '../config/env.js';
import type { Authorization } from './auth.js';
import { HttpError } from '../shared/errors.js';
const paths = ['/', '/about', '/mission', '/impact', '/stories', '/team', '/donate', '/mentor'];
const reportSchema = z.object({ metricHeaders: z.array(z.object({ name: z.string() })), dimensionHeaders: z.array(z.object({ name: z.string() })).optional(), rows: z.array(z.object({ dimensionValues: z.array(z.object({ value: z.string() })).optional(), metricValues: z.array(z.object({ value: z.string().regex(/^\d+(\.\d+)?$/) })) })).optional(), metadata: z.object({ timeZone: z.string().optional(), subjectToThresholding: z.boolean().optional(), dataLossFromOtherRow: z.boolean().optional(), samplingMetadatas: z.array(z.unknown()).optional() }).optional() });
export function createAnalyticsReader(c: Config, fetcher: typeof fetch = fetch, now = () => Date.now()) {
    const hosts = c.GA4_HOSTNAMES.toLowerCase().split(',').map(h => h.trim()).filter(Boolean);
    const configured = c.GA4_ENABLED === 'true' && c.GA4_PROPERTY_ID !== '0' && !!c.GA4_CLIENT_EMAIL && !!c.GA4_PRIVATE_KEY && hosts.length > 0 && hosts.every(h => /^[a-z0-9.-]+$/.test(h));
    let token = '', expiresAt = 0, tokenFlight: Promise<string> | undefined;
    const cached = new Map<number, { until: number; data: unknown }>();
    const flights = new Map<number, Promise<unknown>>();
    const failures = new Map<number, number>();
    const status = () => ({ provider: 'google_analytics', status: c.GA4_ENABLED !== 'true' ? 'not_configured' : configured ? 'configured' : 'configuration_incomplete', hostnames: hosts, collection: 'Frontend measurement and visitor consent must also be configured separately.' });
    async function accessToken() {
        if (token && expiresAt > now() + 60000) return token;
        if (tokenFlight) return tokenFlight;
        tokenFlight = (async () => {
            const key = await importPKCS8(c.GA4_PRIVATE_KEY.replaceAll('\\n', '\n'), 'RS256');
            const issued = Math.floor(now() / 1000);
            const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/analytics.readonly' }).setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).setIssuer(c.GA4_CLIENT_EMAIL).setAudience('https://oauth2.googleapis.com/token').setIssuedAt(issued).setExpirationTime(issued + 3600).sign(key);
            const r = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
            if (!r.ok) throw new HttpError(503, 'Analytics authorization failed. Check the backend service account configuration.');
            const body = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() }).parse(await r.json()); token = body.access_token; expiresAt = now() + Math.min(body.expires_in, 3600) * 1000; return token;
        })().finally(() => { tokenFlight = undefined; }); return tokenFlight;
    }
    async function summary(days: number) {
        if (![7, 30, 90].includes(days)) throw new HttpError(422, 'Choose 7, 30 or 90 days');
        if (!configured) return status();
        if ((cached.get(days)?.until || 0) > now()) return cached.get(days)!.data;
        if (flights.has(days)) return flights.get(days)!;
        if ((failures.get(days) || 0) > now()) throw new HttpError(503, 'Analytics is temporarily unavailable. Try again shortly.', 30);
        const flight = (async () => {
            try {
                const authorization = await accessToken();
                const base = { dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }], dimensionFilter: { andGroup: { expressions: [{ filter: { fieldName: 'hostName', inListFilter: { values: hosts } } }, { filter: { fieldName: 'pagePath', inListFilter: { values: paths } } }] } } };
                const report = (dimension: string, metrics: string[], limit: string, descending = true) => ({ ...base, ...(dimension ? { dimensions: [{ name: dimension }] } : {}), metrics: metrics.map(name => ({ name })), limit, ...(dimension ? { orderBys: descending ? [{ metric: { metricName: metrics[0] }, desc: true }] : [{ dimension: { dimensionName: dimension } }] } : {}) });
                const r = await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${c.GA4_PROPERTY_ID}:batchRunReports`, { method: 'POST', signal: AbortSignal.timeout(8000), headers: { Authorization: `Bearer ${authorization}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: [report('', ['totalUsers', 'screenPageViews', 'sessions'], '1'), report('date', ['screenPageViews'], '90', false), report('pagePath', ['screenPageViews'], '5'), report('sessionSourceMedium', ['sessions'], '5'), report('country', ['totalUsers'], '5')] }) });
                if (!r.ok) { if (r.status === 401) expiresAt = 0; throw new HttpError(503, r.status === 403 ? 'Analytics access denied. Enable the Data API and grant the service account Viewer access to the property.' : 'Analytics is temporarily unavailable. Try again shortly.', 30); }
                const { reports } = z.object({ reports: z.array(reportSchema).length(5) }).parse(await r.json());
                const metricNames = [['totalUsers', 'screenPageViews', 'sessions'], ['screenPageViews'], ['screenPageViews'], ['sessions'], ['totalUsers']];
                reports.forEach((value, i) => { if (value.metricHeaders.map(h => h.name).join(',') !== metricNames[i]!.join(',') || (value.rows || []).some(row => row.metricValues.length !== metricNames[i]!.length || row.metricValues.some(v => !Number.isSafeInteger(Number(v.value))) || (i > 0 && row.dimensionValues?.length !== 1))) throw new Error('Unexpected metrics'); });
                const metrics = reports[0]!.rows?.[0]?.metricValues.map(v => Number(v.value)) || [0, 0, 0];
                const series = (index: number) => (reports[index]!.rows || []).map(row => ({ label: row.dimensionValues?.[0]?.value || '(not set)', value: Number(row.metricValues[0]?.value || '0') }));
                const data = { provider: 'google_analytics', status: 'ready', days, period: `Last ${days} complete days`, timezone: reports[0]!.metadata?.timeZone || 'Property timezone', fetched_at: new Date(now()).toISOString(), totals: { visitors: metrics[0], page_views: metrics[1], sessions: metrics[2] }, daily: series(1), pages: series(2), sources: series(3), countries: series(4), limited: reports.some(value => value.metadata?.subjectToThresholding || value.metadata?.dataLossFromOtherRow || value.metadata?.samplingMetadatas?.length) };
                cached.set(days, { until: now() + 300000, data }); return data;
            } catch (error) { failures.set(days, now() + 30000); if (error instanceof HttpError) throw error; throw new HttpError(503, 'Analytics is unavailable. Check configuration and retry shortly.', 30); }
        })().finally(() => { flights.delete(days); }); flights.set(days, flight); return flight;
    }
    return { status, summary };
}
export function registerAnalytics(app: Express, c: Config, a: Authorization, reader = createAnalyticsReader(c)) {
    app.get('/api/admin/analytics/status', async (req, res) => { await a.user(req); res.setHeader('Cache-Control', 'no-store'); res.json(reader.status()); });
    app.get('/api/admin/analytics', async (req, res) => { await a.require(req, 'dashboard.view'); const days = z.coerce.number().refine(v => [7, 30, 90].includes(v)).default(30).parse(req.query.days); res.setHeader('Cache-Control', 'private, no-store'); res.json(await reader.summary(days)); });
}
