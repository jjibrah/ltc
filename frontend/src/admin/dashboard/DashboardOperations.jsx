import TrafficPanel from './TrafficPanel';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { auditService } from '../../services/audit/audit.service';
import { billingService } from '../billing/billing.service';
import { dueState, dateLabel, costLabel } from '../billing/billingModel';
import { AdminBadge, AdminCard } from '../components/AdminPrimitives';
import { DashboardSectionHeader } from './DashboardParts';
export default function DashboardOperations() {
  const { user, can } = useAuth();
  const billingAccess = user?.role === 'super_admin' || can('donations.view'), auditAccess = can('audit.view');
  const [billing, setBilling] = useState({ loading: true }), [audit, setAudit] = useState({ loading: true });
  useEffect(() => { let active = true; const load = (promise, set) => promise.then(data => { if (active) set({ data }); }).catch(e => { if (active) set({ error: e.message || 'Temporarily unavailable.' }); });
    if (billingAccess) load(billingService.list(), setBilling); if (auditAccess) load(auditService.list({ limit: 5, offset: 0 }), setAudit); return () => { active = false; };
  }, [billingAccess, auditAccess]);
  const upcoming = billing.data?.results.filter(s => s.active).sort((a, b) => (a.next_due_date || '9999').localeCompare(b.next_due_date || '9999')).slice(0, 4) || [];
  return <div className="dashboard-workspace-grid">
    {billingAccess && <AdminCard><div className="admin-card__body"><DashboardSectionHeader title="Service deadlines" /><p className="operations-detail">Manually recorded bills and renewals</p>{billing.loading ? <p role="status">Loading deadlines…</p> : billing.error ? <p role="alert">{billing.error}</p> : !upcoming.length ? <p className="operations-message">No services recorded. Add costs and deadlines in Billing.</p> : <ul className="dashboard-activity-list">{upcoming.map(s => <li key={s.id}><div><Link to="/admin/billing">{s.name}</Link><small>{dateLabel(s.next_due_date)} · {costLabel(s)}</small></div><AdminBadge tone={dueState(s).tone}>{dueState(s).label}</AdminBadge></li>)}</ul>}<Link className="admin-secondary-button" to="/admin/billing">Open billing</Link></div></AdminCard>}
    <TrafficPanel />
    {auditAccess && <AdminCard className="dashboard-activity-card"><div className="admin-card__body"><DashboardSectionHeader title="Recent activity" count="Latest 5 events" />{audit.loading ? <p role="status">Loading activity…</p> : audit.error ? <p role="alert">{audit.error}</p> : !audit.data.results.length ? <p>No audit events recorded.</p> : <ul className="dashboard-activity-list">{audit.data.results.map(event => <li key={event.id}><div><Link to="/admin/audit">{event.action.replaceAll('_', ' ').toLowerCase()}</Link><small>{event.actor?.name || 'System'} · {event.entity_type?.replaceAll('_', ' ')}</small></div><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time></li>)}</ul>}<Link className="admin-secondary-button" to="/admin/audit">View audit log</Link></div></AdminCard>}
  </div>;
}
