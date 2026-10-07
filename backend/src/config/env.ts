import { z } from 'zod';
const schema = z.object({
    APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8000),
    SUPABASE_URL: z.url(), SUPABASE_ANON_KEY: z.string().min(1), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    FRONTEND_URL: z.url().default('http://localhost:5173'), AUTH_REDIRECT_URL: z.url().optional(),
    CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
    REDIS_URL: z.string().default('redis://localhost:6379/0'),
    SUPABASE_TIMEOUT_SECONDS: z.coerce.number().positive().max(60).default(15),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
    STRIPE_API_VERSION: z.string().default('2026-08-26.dahlia'), STRIPE_SECRET_KEY: z.string().default(''), STRIPE_WEBHOOK_SECRET: z.string().default(''),
    ORG_MAILING_ADDRESS: z.string().default(''), RESEND_FROM_ADDRESS: z.string().default('Living The Charge <news@livingthecharge.org>'), RESEND_API_KEY: z.string().default(''), SQS_QUEUE_URL: z.string().default(''),
    GA4_PROPERTY_ID: z.string().regex(/^\d+$/).default('0'),
    GA4_CLIENT_EMAIL: z.string().default(''), GA4_PRIVATE_KEY: z.string().default(''),
    GA4_HOSTNAMES: z.string().default(''), GA4_ENABLED: z.enum(['true', 'false']).default('false'),
    PRIMARY_SUPER_ADMIN_ID: z.string().default(''),
    PROFILE_IMAGE_BUCKET: z.string().default('team-profile-images'), STORY_IMAGE_BUCKET: z.string().default('story-images'),
    NEWSLETTER_ASSETS_BUCKET: z.string().default('newsletter-assets'),
});
export type Config = z.infer<typeof schema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
    const config = schema.parse(Object.fromEntries(Object.entries(env).filter(([, value]) => value !== '')));
    const origins = config.CORS_ORIGINS.split(',').map(s => s.trim());
    if (origins.some(s => s === '*' || !/^https?:\/\/[^/]+$/.test(s)))
        throw new Error('Explicit CORS origins required');
    if (['production', 'staging'].includes(config.APP_ENV)) {
        if (!config.FRONTEND_URL.startsWith('https://') || origins.some(s => !s.startsWith('https://') || s.includes('localhost')))
            throw new Error('HTTPS frontend/CORS required');
        if (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET || !config.RESEND_API_KEY || !config.SQS_QUEUE_URL)
            throw new Error('Provider and queue configuration required');
    }
    return config;
}
