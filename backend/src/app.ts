import { registerAnalytics } from './modules/analytics.js';
import { registerOperations } from './modules/operations.js';
import { recordRequest } from './shared/metrics.js';
import Stripe from 'stripe';
import { registerNewsletters } from './modules/newsletters.js';
import { registerObservability } from './modules/observability.js';
import { registerDonations, registerWebhook } from './modules/donations.js';
import { registerStoryWrites } from './modules/storyWrites.js';
import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import type { Config } from './config/env.js';
import type { Providers } from './shared/providers.js';
import { HttpError } from './shared/errors.js';
import { authorization, registerAuth } from './modules/auth.js';
import { registerAdministration } from './modules/administration.js';
import { registerProfileWrites } from './modules/profileWrites.js';
import { registerContent } from './modules/content.js';
export function createApp(config: Config, providers: Providers) {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', config.TRUST_PROXY_HOPS);
    const auth = authorization(providers, config);
    app.use((req, res, next) => { const started = performance.now(); const incoming = req.headers['x-request-id']; res.locals.requestId = typeof incoming === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(incoming) ? incoming : randomUUID(); res.setHeader('X-Request-ID', res.locals.requestId); res.on('finish', () => { recordRequest(performance.now() - started); console.log(JSON.stringify({ service: 'api', request_id: res.locals.requestId, method: req.method, route: req.route?.path || 'unmatched', status: res.statusCode, duration_ms: Math.round(performance.now() - started) })); }); next(); });
    const origins = config.CORS_ORIGINS.split(',').map(s => s.trim());
    app.use((req, res, next) => { const origin = req.headers.origin; if (origin && origins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Request-ID,Idempotency-Key');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    } if (req.method === 'OPTIONS') {
        res.sendStatus(origin && !origins.includes(origin) ? 403 : 204);
        return;
    } next(); });
    const stripe = new Stripe(config.STRIPE_SECRET_KEY || 'sk_test_unconfigured', { timeout: 30000, maxNetworkRetries: 2, ...(config.STRIPE_API_VERSION ? { apiVersion: config.STRIPE_API_VERSION as Stripe.LatestApiVersion } : {}) });
    registerWebhook(app, providers, config, stripe);
    app.use(express.json({ limit: '1mb' }));
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/api/ready', async (_req, res) => { try {
        await Promise.race([providers.ready(), new Promise<never>((_, reject) => { const t = setTimeout(() => reject(new Error('deadline')), 5000); t.unref(); })]);
        res.json({ status: 'ready' });
    }
    catch {
        throw new HttpError(503, 'A required dependency is unavailable');
    } });
    registerAuth(app, providers, config, auth);
    registerContent(app, providers, config, auth);
    registerAdministration(app, providers, config, auth);
    registerProfileWrites(app, providers, config, auth);
    registerStoryWrites(app, providers, config, auth);
    registerDonations(app, providers, config, auth, stripe);
    registerNewsletters(app, providers, config, auth);
    registerObservability(app, providers, auth);
    registerOperations(app, providers, auth);
    registerAnalytics(app, config, auth);
    app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));
    const errors: ErrorRequestHandler = (err, _req, res, _next) => {
        const status = err instanceof ZodError ? 422 : err instanceof HttpError ? err.status : err.type === 'entity.too.large' ? 413 : err.type === 'entity.parse.failed' ? 422 : 503;
        if (err instanceof HttpError && err.retryAfter)
            res.setHeader('Retry-After', err.retryAfter);
        res.status(status).json({ detail: err instanceof ZodError ? err.issues.map(i => ({ loc: ['body', ...i.path], msg: i.message, type: i.code })) : err instanceof HttpError ? err.message : status === 413 ? 'Request too large' : status === 422 ? 'Invalid JSON' : 'A required dependency is unavailable' });
    };
    app.use(errors);
    return app;
}
