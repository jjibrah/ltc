import { metricsSnapshot } from '../shared/metrics.js';
import type { Express } from 'express';
import { z } from 'zod';
import type { Providers } from '../shared/providers.js';
import type { Authorization } from './auth.js';
import { rows, one, page, type Row } from '../shared/data.js';
import { providerError } from '../shared/errors.js';
export function registerObservability(app: Express, p: Providers, a: Authorization) {
    app.get('/api/admin/dashboard/', async (req, res) => { const u = await a.require(req, 'dashboard.view'); const include = (await a.permissions(u)).includes('donations.view'); const r = await p.db.rpc('ltc_dashboard_summary', { include_donations: include }); providerError(r.error); res.json(r.data); });
    app.get('/api/admin/metrics', async (req, res) => { await a.require(req, undefined, 'super_admin'); res.json(metricsSnapshot()); });
    async function attach(events: Row[]) { const ids = [...new Set(events.flatMap(e => [e.actor_user_id, e.target_user_id]).filter(Boolean))]; const users = ids.length ? rows(await p.db.from('application_users').select('id,name,email').in('id', ids)) : []; return events.map(e => ({ ...e, actor: users.find(u => u.id === e.actor_user_id) || null, target: users.find(u => u.id === e.target_user_id) || null })); }
    app.get('/api/audit/summary', async (req, res) => { await a.require(req, 'audit.view'); const today = new Date().toISOString().slice(0, 10); async function count(actions?: string[], sensitive = false) { let q = p.db.from('audit_events').select('id', { count: 'exact', head: true }).gte('created_at', today); if (actions)
        q = q.in('action', actions); if (sensitive)
        q = q.eq('is_sensitive', true); const r = await q; providerError(r.error); return r.count || 0; } const [events_today, security_events, role_changes, permission_changes, user_management_events] = await Promise.all([count(), count(undefined, true), count(['ROLE_CHANGED']), count(['PERMISSION_GRANTED', 'PERMISSION_DENIED', 'PERMISSIONS_RESET', 'PERMISSIONS_CHANGED', 'ROLE_PERMISSIONS_CHANGED']), count(['USER_INVITED', 'USER_ACTIVATED', 'USER_DISABLED', 'USER_ENABLED', 'USER_DELETED', 'ROLE_CHANGED'])]); res.json({ events_today, security_events, role_changes, permission_changes, user_management_events }); });
    app.get('/api/audit', async (req, res) => { await a.require(req, 'audit.view'); const { limit, offset } = page(req.query); const filters = z.object({ actor_id: z.string().optional(), target_id: z.string().optional(), action: z.string().optional(), entity_type: z.string().optional(), sensitive_only: z.enum(['true', 'false', '1', '0']).optional(), date_from: z.iso.date().optional(), date_to: z.iso.date().optional() }).parse(req.query); let q = p.db.from('audit_events').select('id,actor_user_id,target_user_id,action,entity_type,entity_id,reason,request_id,is_sensitive,created_at', { count: 'exact' }); for (const [key, column] of [['actor_id', 'actor_user_id'], ['target_id', 'target_user_id'], ['action', 'action'], ['entity_type', 'entity_type']] as const)
        if (filters[key])
            q = q.eq(column, filters[key]); if (['true', '1'].includes(filters.sensitive_only || ''))
        q = q.eq('is_sensitive', true); if (filters.date_from)
        q = q.gte('created_at', filters.date_from); if (filters.date_to)
        q = q.lt('created_at', new Date(Date.parse(filters.date_to) + 86400000).toISOString()); const r = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1); res.json({ results: await attach(rows(r)), count: r.count || 0, limit, offset }); });
    app.get('/api/audit/:id', async (req, res) => { await a.require(req, 'audit.view'); res.json((await attach([one(await p.db.from('audit_events').select('*').eq('id', req.params.id).limit(1), 'Audit event not found')]))[0]); });
}
