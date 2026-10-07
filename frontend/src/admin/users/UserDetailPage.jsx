import { useUnsavedChanges } from '../components/useUnsavedChanges';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, History, RotateCcw, Save, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminBadge, AdminCard, AdminEmptyState, AdminModal, ConfirmDialog, PageHeader } from '../components/AdminPrimitives';
import { usersService } from '../../services/users/users.service';
import { useAuth } from '../../app/providers/AuthProvider';

const ROLE_LABELS = { super_admin: 'Super admin', admin: 'Admin', staff: 'Staff', viewer: 'Viewer' };
const label = (value = '') => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—';
const dateLabel = (value) => value ? new Date(value).toLocaleString() : '—';

export default function UserDetailPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState('account');
  const [authorization, setAuthorization] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [activity, setActivity] = useState([]);
  const [draft, setDraft] = useState({});
  const [reason, setReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [authz, permissions] = await Promise.all([
        usersService.getAuthorization(userId), usersService.getCatalogue(),
      ]);
      setAuthorization(authz); setCatalogue(permissions);
      setDraft(Object.fromEntries((authz.overrides || []).map((item) => [item.permissions?.code, item.effect]).filter(([code]) => code)));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab !== 'activity') return undefined;
    let cancelled = false;
    usersService.getActivity(userId).then((events) => { if (!cancelled) setActivity(events.results || []); }).catch(() => { if (!cancelled) setActivity([]); });
    return () => { cancelled = true; };
  }, [tab, userId]);

  const savedOverrides = Object.fromEntries((authorization?.overrides || []).map(item => [item.permissions?.code, item.effect]).filter(([code]) => code));
  const permissionsDirty = Boolean(authorization) && (JSON.stringify(Object.entries(draft).sort()) !== JSON.stringify(Object.entries(savedOverrides).sort()) || Boolean(reason));
  const permissionDraft = useUnsavedChanges({ key: `${currentUser?.id}:user-permissions:${userId}`, dirty: permissionsDirty, draft: { draft, reason }, restore: value => { setDraft(value.draft); setReason(value.reason); }, ready: !loading && Boolean(authorization) });
  const grouped = useMemo(() => catalogue.reduce((groups, permission) => ({ ...groups, [permission.module]: [...(groups[permission.module] || []), permission] }), {}), [catalogue]);
  if (loading) return <div className="admin-page"><div className="admin-state" role="status">Loading user permissions…</div></div>;
  if (!authorization) return <div className="admin-page"><AdminCard><AdminEmptyState title="User not found" description={error || 'This user may have been removed.'} action={<Link className="admin-secondary-button" to="/admin/users">Back to users</Link>} /></AdminCard></div>;

  const user = authorization.user;
  const inherited = new Set(authorization.role_default_permissions || []);
  const isSuperAdmin = user.role === 'super_admin';
  const permissionState = (code) => isSuperAdmin ? 'inherited' : draft[code] || (inherited.has(code) ? 'inherited' : 'none');
  const checked = (code) => isSuperAdmin || draft[code] === 'grant' || (inherited.has(code) && draft[code] !== 'deny');
  const permissionDisabled = (permission) => isSuperAdmin || permission.is_system_only || (user.role === 'viewer' && permission.action !== 'view');
  const toggle = (code) => setDraft((current) => {
    const next = { ...current };
    if (checked(code)) {
      if (inherited.has(code)) next[code] = 'deny'; else delete next[code];
    } else {
      if (inherited.has(code)) delete next[code]; else next[code] = 'grant';
    }
    return next;
  });
  const savePermissions = async () => {
    if (reason.trim().length < 3) { setError('Enter a reason of at least 3 characters.'); return; }
    setSaving(true); setError('');
    try {
      await usersService.savePermissions(user.id, Object.keys(draft).filter((code) => draft[code] === 'grant'), Object.keys(draft).filter((code) => draft[code] === 'deny'), reason.trim());
      permissionDraft.discard(); setNotice('Permissions saved. Revoked access takes effect on the next request.'); setReason(''); await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const resetPermissions = async () => {
    setSaving(true); setError('');
    try { await usersService.resetPermissions(user.id, reason.trim() || 'Reset to role defaults'); permissionDraft.discard(); setNotice('Custom permissions removed.'); setReason(''); setConfirm(null); await load(); }
    catch (requestError) { setError(requestError.message); setConfirm(null); }
    finally { setSaving(false); }
  };
  const changeRole = async (role) => {
    setSaving(true); setError('');
    try { await usersService.changeRole(user.id, role, `Role changed from ${user.role} to ${role}`); setNotice('Role updated.'); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const changeStatus = async (status) => {
    setSaving(true); setError('');
    try { await usersService.changeStatus(user.id, status, `Account status changed from ${user.status} to ${status}`); setNotice('Account status updated.'); setConfirm(null); await load(); }
    catch (requestError) { setError(requestError.message); setConfirm(null); }
    finally { setSaving(false); }
  };
  const removeUser = async () => {
    if (deleteReason.trim().length < 3) { setError('Enter a deletion reason of at least 3 characters.'); return; }
    setSaving(true); setError('');
    try {
      const result = await usersService.delete(user.id, deleteReason.trim());
      navigate('/admin/users', { replace: true, state: { notice: result.auth_cleanup_pending ? 'Portal access was deleted. Supabase Auth cleanup requires administrator attention.' : 'User deleted successfully.' } });
    } catch (requestError) { setError(requestError.message); setSaving(false); }
  };

  return <div className="admin-page">{permissionDraft.restored && <p role="status">Unsaved permission draft restored for this user. Review before saving.</p>}<Link className="admin-back-link" to="/admin/users">Users & Permissions</Link><PageHeader title={user.name} subtitle={user.email} action={<AdminBadge tone={user.status === 'active' ? 'success' : user.status === 'invited' ? 'warning' : 'danger'}>{label(user.status)}</AdminBadge>} />
    {error && <p className="permission-message permission-message--error" role="alert">{error}</p>}{notice && <p className="permission-message" role="status">{notice}</p>}
    <div className="admin-tabs" role="tablist"><button className={tab === 'account' ? 'active' : ''} type="button" onClick={() => setTab('account')}><UserRound size={15} /> Account</button><button className={tab === 'permissions' ? 'active' : ''} type="button" onClick={() => setTab('permissions')}><ShieldCheck size={15} /> Permissions</button><button className={tab === 'activity' ? 'active' : ''} type="button" onClick={() => setTab('activity')}><History size={15} /> Activity</button></div>
    {tab === 'account' && <div className="user-detail-grid"><AdminCard><div className="admin-card__body"><div className="user-detail-heading"><span className="admin-avatar user-detail-avatar">{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><h2>{user.name}</h2><p>{user.email}</p></div></div><dl className="user-detail-list"><div><dt>Role</dt><dd>{ROLE_LABELS[user.role]}</dd></div><div><dt>Status</dt><dd>{label(user.status)}</dd></div><div><dt>Invited</dt><dd>{dateLabel(user.invitedAt)}</dd></div><div><dt>Activated</dt><dd>{dateLabel(user.activatedAt)}</dd></div><div><dt>Last active</dt><dd>{dateLabel(user.lastActiveAt)}</dd></div></dl></div></AdminCard><AdminCard><div className="admin-card__body"><div className="admin-form-field"><label htmlFor="user-role">Application role</label><select id="user-role" value={user.role} disabled={saving} onChange={(event) => changeRole(event.target.value)}>{Object.entries(ROLE_LABELS).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></div><p className="admin-section-copy">Changing a role immediately changes its inherited permission set.</p><div className="user-detail-actions">{user.status === 'active' && <button className="admin-secondary-button admin-danger-outline" type="button" onClick={() => setConfirm('disabled')}>Disable user</button>}{user.status === 'disabled' && <button className="admin-primary-button" type="button" onClick={() => setConfirm('active')}>Enable user</button>}{String(currentUser?.id) !== String(user.id) && <button className="admin-secondary-button admin-danger-outline" type="button" onClick={() => setConfirm('delete')}><Trash2 size={14} /> Delete user</button>}</div></div></AdminCard></div>}
    {tab === 'permissions' && <><div className="permission-legend"><span className="permission-indicator inherited">Inherited</span><span className="permission-indicator grant">Explicit grant</span><span className="permission-indicator deny">Explicit deny</span></div>{isSuperAdmin && <div className="permission-warning"><AlertTriangle size={17} /><div><strong>Super admin permissions are locked</strong><p>Super admins always receive every permission. Individual overrides cannot change this access.</p></div></div>}{user.role === 'viewer' && <div className="permission-warning"><AlertTriangle size={17} /><div><strong>Viewer access is read-only</strong><p>Only permissions with the View action can be assigned to this role.</p></div></div>}<div className="permission-groups">{Object.entries(grouped).map(([moduleName, permissions]) => <AdminCard key={moduleName}><div className="admin-card__body"><h2>{label(moduleName)}</h2>{permissions.map((permission) => <label className={`permission-row permission-row--${permissionState(permission.code)}`} key={permission.code}><input type="checkbox" checked={checked(permission.code)} disabled={permissionDisabled(permission)} onChange={() => toggle(permission.code)} /><span><strong>{label(permission.action)}</strong><small>{permission.description}</small><em>{permissionState(permission.code) === 'none' ? 'Not assigned' : label(permissionState(permission.code))}{permission.is_sensitive ? ' · Sensitive' : ''}{permission.is_system_only ? ' · System only' : ''}{user.role === 'viewer' && permission.action !== 'view' ? ' · Not available to viewers' : ''}</em></span>{permission.is_sensitive && <AlertTriangle size={15} aria-label="Sensitive permission" />}</label>)}</div></AdminCard>)}</div>{!isSuperAdmin && <div className="permission-save-bar"><div className="admin-form-field"><label htmlFor="permission-reason">Reason for change</label><input id="permission-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for the audit log" /></div><div><button className="admin-secondary-button" type="button" disabled={saving} onClick={() => setConfirm('reset')}><RotateCcw size={14} /> Reset to defaults</button><button className="admin-primary-button" type="button" disabled={saving} onClick={savePermissions}><Save size={14} /> {saving ? 'Saving…' : 'Save permissions'}</button></div></div>}</>}
    {tab === 'activity' && <AdminCard><div className="admin-card__body">{activity.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>Reason</th><th>Request ID</th></tr></thead><tbody>{activity.map((event) => <tr key={event.id}><td>{dateLabel(event.created_at)}</td><td><strong>{label(event.action)}</strong></td><td>{label(event.entity_type)}</td><td>{event.reason || '—'}</td><td><code>{event.request_id || '—'}</code></td></tr>)}</tbody></table></div> : <AdminEmptyState title="No recorded activity" description="Role, permission, invitation, and account changes will appear here." />}</div></AdminCard>}
    <ConfirmDialog open={confirm === 'reset'} title="Reset permissions?" description="All explicit grants and denies will be removed. The user will receive only their role defaults." confirmLabel="Reset permissions" onClose={() => setConfirm(null)} onConfirm={resetPermissions} />
    <ConfirmDialog open={confirm === 'disabled'} title={`Disable ${user.name}?`} description="They will immediately lose access to protected application functionality." confirmLabel="Disable user" variant="danger" onClose={() => setConfirm(null)} onConfirm={() => changeStatus('disabled')} />
    <ConfirmDialog open={confirm === 'active'} title={`Enable ${user.name}?`} description="Their effective permissions will become active again." confirmLabel="Enable user" onClose={() => setConfirm(null)} onConfirm={() => changeStatus('active')} />
    <AdminModal open={confirm === 'delete'} title={`Permanently delete ${user.name}?`} description="Portal access and the Supabase Auth identity will be removed. The security audit record will remain." onClose={() => { if (!saving) { setConfirm(null); setDeleteReason(''); } }} actions={<><button className="admin-secondary-button" type="button" disabled={saving} onClick={() => { setConfirm(null); setDeleteReason(''); }}>Cancel</button><button className="admin-primary-button admin-confirm-danger" type="button" disabled={saving || deleteReason.trim().length < 3} onClick={removeUser}>{saving ? 'Deleting…' : 'Delete user permanently'}</button></>}><div className="admin-form-field"><label htmlFor="delete-user-reason">Reason for deletion</label><textarea id="delete-user-reason" value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} placeholder="Required for the audit log" /></div><p className="admin-modal-copy">This action cannot be undone. Historical audit events will not be deleted.</p></AdminModal>
  </div>;
}
