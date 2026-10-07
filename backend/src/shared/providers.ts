import { recordSupabase } from './metrics.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';
import { createHash } from 'node:crypto';
import type { Config } from '../config/env.js';
import { HttpError } from './errors.js';
export type AppUser = {
    id: string;
    auth_user_id: string;
    email: string;
    name?: string;
    role: string;
    status: string;
    permissions_version?: number;
};
export interface Providers {
    db: SupabaseClient;
    authClient(): SupabaseClient;
    rateLimit(key: string, limit: number, seconds: number): Promise<void>;
    ready(): Promise<void>;
    close(): Promise<void>;
}
export function createProviders(config: Config): Providers {
    const boundedFetch: typeof fetch = async (input, init) => { const start = performance.now(); try {
        return await fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(config.SUPABASE_TIMEOUT_SECONDS * 1000)]) : AbortSignal.timeout(config.SUPABASE_TIMEOUT_SECONDS * 1000) });
    }
    finally {
        recordSupabase(performance.now() - start);
    } };
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: boundedFetch } };
    const db = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, options);
    const redis = createRedisClient({ url: config.REDIS_URL, socket: { connectTimeout: 2000, reconnectStrategy: false } });
    redis.on('error', () => { });
    let connecting: Promise<unknown> | undefined;
    async function connect() { if (!redis.isOpen) {
        connecting ??= redis.connect().finally(() => { connecting = undefined; });
        await connecting;
    } }
    return { db, authClient: () => createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, options),
        async rateLimit(key, limit, seconds) {
            try {
                await connect();
                const hashed = createHash('sha256').update(key).digest('hex');
                const count = await Promise.race([redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", { keys: [`ltc:limit:${hashed}`], arguments: [String(seconds)] }), new Promise<never>((_, reject) => { const t = setTimeout(() => reject(new Error('Redis deadline')), 2000); t.unref(); })]);
                if (Number(count) > limit)
                    throw new HttpError(429, 'Too many requests', seconds);
            }
            catch (e) {
                if (e instanceof HttpError)
                    throw e;
                throw new HttpError(503, 'Rate limiting is temporarily unavailable');
            }
        },
        async ready() { await connect(); await redis.ping(); const result = await db.from('application_users').select('id').limit(1); if (result.error)
            throw result.error; },
        async close() { if (redis.isOpen)
            await redis.quit(); },
    };
}
