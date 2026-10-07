import type { Providers } from './providers.js';
export function sanitizeState(value: unknown): unknown {
    if (Array.isArray(value))
        return value.slice(0, 100).map(sanitizeState);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /password|token|secret|service_role|authorization|api_key/i.test(key) ? '[REDACTED]' : sanitizeState(item)]));
    return typeof value === 'string' ? value.slice(0, 4000) : value;
}
export async function auditEvent(p: Providers, event: Record<string, unknown>) { try {
    const result = await p.db.from('audit_events').insert({ ...event, before_state: sanitizeState(event.before_state), after_state: sanitizeState(event.after_state) });
    if (result.error)
        console.error(JSON.stringify({ service: 'api', event: 'audit_write_failed', request_id: event.request_id }));
}
catch {
    console.error(JSON.stringify({ service: 'api', event: 'audit_write_failed', request_id: event.request_id }));
} }
