import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AdminBadge, AdminCard, AdminEmptyState, AdminModal, Identifier, PageHeader } from '../components/AdminPrimitives';
import { auditService } from '../../services/audit/audit.service';

const PAGE_SIZE = 5;
const label = (value = '') => value ? value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—';
const timestamp = (value) => value ? new Date(value).toLocaleString() : '—';
const identity = (person, fallback) => person ? `${person.name || person.email} (${person.email})` : fallback || 'System';
const actionTone = (action) => {
  if (['USER_DELETED', 'INVITATION_REVOKED', 'INVITATION_CLEANUP_DELETED', 'INVITATION_CLEANUP_FAILED', 'TEST_DATA_PURGE_ACCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGE_FAILED'].includes(action)) return 'danger';
  if (['USER_DISABLED', 'PERMISSION_DENIED', 'SENSITIVE_AUTHORIZATION_DENIED', 'ROLE_CHANGED', 'LOGIN_DENIED'].includes(action)) return 'warning';
  if (['PERMISSION_GRANTED', 'USER_ENABLED', 'USER_ACTIVATED', 'LOGIN_SUCCESS', 'PASSWORD_CHANGED', 'PASSWORD_SET'].includes(action)) return 'success';
  return 'info';
};
const eventExplanation = (event) => {
  const actor = identity(event.actor, event.actor_user_id);
  const target = identity(event.target, event.target_user_id || event.entity_id || 'the selected record');
  const descriptions = {
    USER_DELETED: `${actor} permanently deleted the application account for ${target}.`,
    USER_INVITED: `${actor} invited ${target} to access the application.`,
    USER_ACTIVATED: `${target} completed account activation.`,
    USER_DISABLED: `${actor} disabled ${target} and revoked application access.`,
    USER_ENABLED: `${actor} restored application access for ${target}.`,
    ROLE_CHANGED: `${actor} changed the application role assigned to ${target}.`,
    ROLE_PERMISSIONS_CHANGED: `${actor} changed the permissions inherited by the ${event.entity_id} group.`,
    PERMISSION_GRANTED: `${actor} explicitly granted a permission to ${target}.`,
    PERMISSION_DENIED: `${actor} explicitly denied a permission for ${target}.`,
    PERMISSIONS_RESET: `${actor} reset ${target} to the permissions inherited from their role.`,
    SENSITIVE_AUTHORIZATION_DENIED: `${actor} attempted a sensitive action without the required authorization.`,
    LOGIN_SUCCESS: `${actor} successfully signed in to the administration portal.`,
    LOGIN_FAILED: `A sign-in attempt failed because the supplied credentials were invalid.`,
    LOGIN_DENIED: `A sign-in attempt was denied because the account is not active or authorized.`,
    PASSWORD_CHANGED: `${actor} changed their administration portal password.`,
    PASSWORD_CHANGE_FAILED: `${actor} attempted to change their password, but verification failed.`,
    PASSWORD_SET: `${target} completed the password setup required for account activation.`,
    PASSWORD_RESET_REQUESTED: `A password reset flow was requested. The account identity is intentionally not disclosed.`,
    PASSWORD_RESET_LINK_GENERATED: `${actor} generated a password recovery link for ${target}.`,
    USER_UPDATED: `${actor} updated the application account details for ${target}.`,
    INVITATION_RESENT: `${actor} sent a new secure activation link to ${target}.`,
    INVITATION_REVOKED: `${actor} revoked the pending invitation for ${target}.`,
    INVITATION_EXPIRED: `The secure invitation for ${target} expired before activation.`,
    INVITATION_CLEANUP_DELETED: `An expired invitation and its unused authentication identity were deleted.`,
    INVITATION_CLEANUP_FAILED: `Automatic cleanup could not remove an expired invitation; it remains queued for retry.`,
  };
  return descriptions[event.action] || `${actor} performed ${label(event.action)} on ${target}.`;
};

function StatePanel({ title, value }) {
  return <section className="audit-state"><h3>{title}</h3>{value && Object.keys(value).length ? <pre tabIndex={0} aria-label={`${title} details`}>{JSON.stringify(value, null, 2)}</pre> : <p>No state recorded.</p>}</section>;
}

export default function AuditLogPage() {
  const [events, setEvents] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await auditService.list({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
      setEvents(result.results || []); setCount(result.count || 0); setLastUpdated(new Date());
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const openEvent = async (id) => {
    setDetailLoading(true); setError('');
    try { setSelected(await auditService.getById(id)); }
    catch (requestError) { setError(requestError.message); }
    finally { setDetailLoading(false); }
  };

  return <div className="admin-page"><PageHeader title="Audit Log" help="Review recorded administration and security events. Open an event for its actor, reason and recorded changes." action={<button className="admin-secondary-button" type="button" onClick={load}><RefreshCw size={14} /> Refresh</button>} />
    {lastUpdated && <p className="admin-last-updated">Last updated {lastUpdated.toLocaleTimeString()}</p>}
    <AdminCard><div className="admin-card__body">
      {error && <p className="permission-message permission-message--error" role="alert">{error}</p>}
      {loading ? <div className="admin-state" role="status">Loading audit events…</div> : events.length ? <><div className="admin-table-wrap"><table className="admin-table audit-table"><thead><tr><th>When</th><th>What happened</th><th>Performed by</th><th>Action</th></tr></thead><tbody>{events.map((event) => <tr className="audit-event-row" key={event.id} tabIndex={0} aria-label={`Open details for ${label(event.action)}`} onClick={() => openEvent(event.id)} onKeyDown={(keyEvent) => { if (keyEvent.key === 'Enter' || keyEvent.key === ' ') { keyEvent.preventDefault(); openEvent(event.id); } }}><td><button className="admin-table-action" type="button" onClick={click => { click.stopPropagation(); openEvent(event.id); }} aria-label={`Open ${label(event.action)} details from ${timestamp(event.created_at)}`}>{timestamp(event.created_at)}</button></td><td>{eventExplanation(event)}</td><td>{identity(event.actor, event.actor_user_id)}</td><td><AdminBadge tone={actionTone(event.action)}>{label(event.action)}</AdminBadge></td></tr>)}</tbody></table></div><div className="audit-pagination"><span>{count} events</span><div><button className="admin-secondary-button" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>{page} / {totalPages}</span><button className="admin-secondary-button" type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div></> : <AdminEmptyState title="No audit events" description="Security and administration events will appear here." />}
    </div></AdminCard>
    <AdminModal className="audit-detail-modal" open={Boolean(selected)} title={selected ? label(selected.action) : 'Audit event'} description={selected ? timestamp(selected.created_at) : 'Read-only event details'} onClose={() => setSelected(null)} actions={<button className="admin-secondary-button" type="button" onClick={() => setSelected(null)}>Close</button>}>{selected && <div className="audit-detail"><div className={`audit-explanation audit-explanation--${actionTone(selected.action)}`}><AdminBadge tone={actionTone(selected.action)}>{label(selected.action)}</AdminBadge><strong>What happened</strong><p>{eventExplanation(selected)}</p></div><dl className="user-detail-list"><div><dt>Event ID</dt><dd>{selected.id}</dd></div><div><dt>Timestamp</dt><dd>{timestamp(selected.created_at)}</dd></div><div><dt>Actor</dt><dd>{identity(selected.actor, selected.actor_user_id)}</dd></div><div><dt>Target</dt><dd>{identity(selected.target, selected.target_user_id || '—')}</dd></div><div><dt>Entity</dt><dd>{label(selected.entity_type)} · <Identifier value={selected.entity_id} label="entity ID" /></dd></div><div><dt>Reason</dt><dd>{selected.reason || 'No reason recorded'}</dd></div><div><dt>Request ID</dt><dd><Identifier value={selected.request_id} label="request ID" /></dd></div><div><dt>Sensitive event</dt><dd>{selected.is_sensitive ? 'Yes' : 'No'}</dd></div></dl><div className="audit-state-grid"><StatePanel title="State before" value={selected.before_state} /><StatePanel title="State after" value={selected.after_state} /></div><p className="audit-integrity-note">This is an immutable audit record. Secrets and authentication credentials are redacted before storage.</p></div>}</AdminModal>
  </div>;
}
