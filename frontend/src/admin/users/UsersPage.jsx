import { Link } from 'react-router-dom';
import ListPagination from '../components/ListPagination';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Plus, Save, Search, ShieldCheck } from 'lucide-react';
import { AdminCard, AdminEmptyState, AdminModal, PageHeader, AdminBadge } from '../components/AdminPrimitives';
import { usersService } from '../../services/users/users.service';

const ROLE_LABELS = { super_admin: 'Super admin', admin: 'Admin', staff: 'Staff', viewer: 'Viewer' };
const ROLE_EXAMPLES = { super_admin: 'John', admin: 'Jane', staff: 'Sofia', viewer: 'Alex' };
const PRIMARY_SUPER_ADMIN_EMAIL = 'ibrabdi109@gmail.com';
const initials = (name = '') => name.split(' ').map((part) => part[0]).join('').slice(0, 2);
const label = (value = '') => value ? value[0].toUpperCase() + value.slice(1).replaceAll('_', ' ') : 'Unknown';
const dateLabel = (value) => value ? new Date(value).toLocaleString() : 'Never';

export default function UsersPage() {
  const loadVersion = useRef(0);
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [module, setModule] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState('details');
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' });
  const [invite, setInvite] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('admin');
  const [roleDraft, setRoleDraft] = useState([]);
  const [roleReason, setRoleReason] = useState('');
  const [roleSaveOpen, setRoleSaveOpen] = useState(false);
  const [roleNotice, setRoleNotice] = useState('');
  const [roleError, setRoleError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [userRoleSaving, setUserRoleSaving] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true); setError('');
    try {
      const [baseUsers, matrix, permissions, roleDefaults] = await Promise.all([
        usersService.getAll({ limit: 50, offset: page * 50, search, status, role }),
        usersService.getAuthorizationMatrix(),
        usersService.getCatalogue(),
        usersService.getRolePermissions(),
      ]);
      if (version !== loadVersion.current) return;
      const enriched = baseUsers.map((item) => ({ ...item, permissions: matrix[item.id] || [] }));
      setUsers(enriched); setCatalogue(permissions); setRolePermissions(roleDefaults.roles || {});
    } catch (requestError) { if (version === loadVersion.current) setError(requestError.message); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [page, search, status, role]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setRoleDraft(rolePermissions[selectedRole] || []); }, [selectedRole, rolePermissions]);

  const modules = useMemo(() => [...new Set(users.flatMap((item) => (item.permissions || []).map((code) => code.split('.')[0])))].sort(), [users]);
  const filtered = useMemo(() => users.filter((item) => {
    const textMatch = `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase());
    const moduleMatch = module === 'all' || item.permissions?.some((code) => code.startsWith(`${module}.`));
    return textMatch && moduleMatch && (status === 'all' || item.status === status) && (role === 'all' || item.role === role);
  }), [users, search, status, role, module]);
  const groupedPermissions = useMemo(() => catalogue.reduce((groups, permission) => ({ ...groups, [permission.module]: [...(groups[permission.module] || []), permission] }), {}), [catalogue]);
  const selectedPermissionCodes = useMemo(() => new Set(roleDraft), [roleDraft]);
  const selectedRoleUserCount = users.filter((item) => item.role === selectedRole).length;
  const roleIsLocked = selectedRole === 'super_admin';
  const permissionUnavailable = (permission) => roleIsLocked || permission.is_system_only || (selectedRole === 'viewer' && permission.action !== 'view');
  const toggleRolePermission = (code) => setRoleDraft((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code].sort());
  const selectPermissionRole = (nextRole) => {
    setSelectedRole(nextRole); setRoleReason(''); setRoleError(''); setRoleNotice('');
  };

  const createInvitation = async () => {
    setSaving(true); setError('');
    try { const result = await usersService.invite(form); setInvite(result); setInviteStep('sent'); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const changeUserRole = async (user, nextRole) => {
    if (nextRole === user.role) return;
    if (String(user.email).toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL && nextRole !== 'super_admin') {
      setError('The primary super admin account cannot be assigned another role.');
      return;
    }
    setUserRoleSaving(user.id); setError('');
    try {
      const result = await usersService.changeRole(user.id, nextRole, `Role changed from ${user.role} to ${nextRole}`);
      setUsers((current) => current.map((item) => item.id === user.id ? {
        ...item,
        role: result.user?.role || nextRole,
        permissions: result.effective_permissions || item.permissions,
      } : item));
    } catch (requestError) { setError(requestError.message); }
    finally { setUserRoleSaving(null); }
  };
  const close = () => { setInviteOpen(false); setInvite(null); setInviteStep('details'); setForm({ name: '', email: '', role: 'staff' }); setError(''); };
  const requestRoleSave = () => {
    if (roleReason.trim().length < 3) { setRoleError('Enter a reason of at least 3 characters.'); return; }
    setRoleError(''); setRoleSaveOpen(true);
  };
  const saveRolePermissions = async () => {
    setRoleSaving(true); setRoleError('');
    try {
      const result = await usersService.saveRolePermissions(selectedRole, roleDraft, roleReason.trim());
      setRolePermissions((current) => ({ ...current, [selectedRole]: result.permissions || [] }));
      setRoleNotice(`${ROLE_LABELS[selectedRole]} permissions updated for all assigned users.`);
      setRoleReason(''); setRoleSaveOpen(false); await load();
    } catch (requestError) { setRoleError(requestError.message); setRoleSaveOpen(false); }
    finally { setRoleSaving(false); }
  };

  return <div className="admin-page users-page"><PageHeader title="Users & Permissions" help="Manage existing accounts and access. A role name and effective permissions can differ." action={<button className="admin-primary-button users-invite-button" type="button" onClick={() => setInviteOpen(true)}><Plus size={15} /> Invite user</button>} />
    
    <AdminCard><div className="admin-card__body">
      <div className="admin-toolbar"><div className="admin-search-wrap"><Search size={15} aria-hidden="true" /><input className="admin-search" aria-label="Search users" placeholder="Search users…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></div>
        <select className="admin-select" aria-label="Filter by role" value={role} onChange={(event) => { setRole(event.target.value); setPage(0); }}><option value="all">All roles</option>{Object.entries(ROLE_LABELS).map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select>
        <select className="admin-select" aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="all">All statuses</option><option value="active">Active</option><option value="invited">Invited</option><option value="disabled">Disabled</option></select>
        <select className="admin-select" aria-label="Filter module access on this page" value={module} onChange={(event) => setModule(event.target.value)}><option value="all">All modules</option>{modules.map((value) => <option value={value} key={value}>{label(value)}</option>)}</select><span className="admin-count">{filtered.length} users</span></div>
      {error && !loading && users.length > 0 && <p className="permission-message permission-message--error" role="alert">{error}</p>}
      {loading && !users.length ? <div className="admin-state" role="status">Loading users…</div> : error && users.length === 0 ? <AdminEmptyState title="We couldn't load users" description={error} action={<button className="admin-secondary-button" type="button" onClick={load}>Try again</button>} /> : filtered.length ? <div className="admin-table-wrap"><table className="admin-table users-table"><thead><tr><th>User</th><th>Status</th><th>Accessible modules</th><th>Role</th><th>Invitation</th></tr></thead><tbody>{filtered.map((item) => { const accessible = [...new Set((item.permissions || []).map((code) => code.split('.')[0]))]; const isPrimarySuperAdmin = String(item.email).toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL; return <tr key={item.id}><td><div className="admin-table__identity"><span className="admin-avatar">{initials(item.name)}</span><div><div className="admin-identity-name"><Link to={`/admin/users/${item.id}`}>{item.name}</Link></div><div className="admin-identity-sub">{item.email}</div></div></div></td><td><AdminBadge tone={item.status === 'active' ? 'success' : item.status === 'invited' ? 'warning' : 'danger'}>{label(item.status)}</AdminBadge></td><td><div className="user-module-list">{accessible.length ? accessible.slice(0, 4).map((value) => <span key={value}>{value}</span>) : <span>None</span>}{accessible.length > 4 && <span>+{accessible.length - 4}</span>}</div></td><td><select className="user-role-select" aria-label={`Role for ${item.name}`} title={isPrimarySuperAdmin ? 'Protected primary super admin account' : undefined} value={item.role} disabled={userRoleSaving !== null || isPrimarySuperAdmin} onChange={(event) => changeUserRole(item, event.target.value)}>{Object.entries(ROLE_LABELS).map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select>{isPrimarySuperAdmin && <small className="protected-account-note">Protected account</small>}</td><td>{item.status === 'invited' ? `Sent ${dateLabel(item.invitedAt)}` : item.activatedAt ? `Accepted ${dateLabel(item.activatedAt)}` : '—'}</td></tr>; })}</tbody></table></div> : <AdminEmptyState title="No users found" description="Try changing the search or filters." />}
    </div></AdminCard><ListPagination page={page} setPage={setPage} count={users.length} loading={loading} label="users" />
    <AdminCard className="role-permissions-card"><div className="admin-card__body role-permissions-section">
      <div className="role-permissions-header"><div><h2>Group permissions</h2><p>Changes apply to every user assigned to the selected role. Individual exceptions configured on a user remain in effect.</p></div><div className="admin-form-field"><label htmlFor="permission-role">User group</label><select id="permission-role" value={selectedRole} onChange={(event) => selectPermissionRole(event.target.value)}>{Object.entries(ROLE_LABELS).map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select><small>{selectedRoleUserCount} assigned users on this page</small></div></div>
      {roleError && <p className="permission-message permission-message--error" role="alert">{roleError}</p>}
      {roleNotice && <p className="permission-message" role="status">{roleNotice}</p>}
      {roleIsLocked && <div className="permission-warning"><ShieldCheck size={17} /><div><strong>Super admin access is locked</strong><p>Super admins always inherit every permission and this group cannot be edited.</p></div></div>}
      {selectedRole === 'viewer' && <div className="permission-warning"><AlertTriangle size={17} /><div><strong>Viewer access is read-only</strong><p>Management actions are unavailable for this group.</p></div></div>}
      <div className="admin-table-wrap"><table className="admin-table role-permissions-table"><thead><tr><th>Permission</th><th>Description</th><th>Assigned</th></tr></thead>{Object.entries(groupedPermissions).map(([moduleName, permissions]) => <tbody key={moduleName}><tr className="role-permissions-module"><th colSpan="3">{label(moduleName)}</th></tr>{permissions.map((permission) => { const unavailable = permissionUnavailable(permission); const isChecked = roleIsLocked || selectedPermissionCodes.has(permission.code); return <tr key={permission.code}><td><strong>{label(permission.action)}</strong><code>{permission.code}</code></td><td>{permission.description}{permission.is_sensitive && <span className="role-permission-flag">Sensitive</span>}{permission.is_system_only && <span className="role-permission-flag">System only</span>}</td><td><label className="role-permission-toggle"><input type="checkbox" checked={isChecked} disabled={unavailable} onChange={() => toggleRolePermission(permission.code)} /><span>{isChecked ? 'Assigned' : unavailable ? 'Unavailable' : 'Not assigned'}</span></label></td></tr>; })}</tbody>)}</table></div>
      {!roleIsLocked && <div className="permission-save-bar role-permissions-save"><div className="admin-form-field"><label htmlFor="role-permission-reason">Reason for change</label><input id="role-permission-reason" value={roleReason} onChange={(event) => setRoleReason(event.target.value)} placeholder="Required for the audit log" /></div><div><button className="admin-primary-button" type="button" disabled={roleSaving} onClick={requestRoleSave}><Save size={14} /> Save group permissions</button></div></div>}
    </div></AdminCard>
    <AdminModal open={inviteOpen} title={inviteStep === 'sent' ? 'Invitation sent' : inviteStep === 'review' ? 'Review invitation' : 'Invite user'} description="Invited users remain blocked until they accept the secure Supabase invitation." onClose={close} actions={inviteStep === 'sent' ? <button className="admin-primary-button" type="button" onClick={close}>Done</button> : inviteStep === 'review' ? <><button className="admin-secondary-button" type="button" onClick={() => setInviteStep('details')}>Back</button><button className="admin-primary-button" type="button" disabled={saving} onClick={createInvitation}>{saving ? 'Sending…' : 'Send invitation'}</button></> : <><button className="admin-secondary-button" type="button" onClick={close}>Cancel</button><button className="admin-primary-button" type="submit" form="invite-user-form">Review</button></>}>
      {inviteStep === 'details' && <form id="invite-user-form" onSubmit={(event) => { event.preventDefault(); setError(''); setInviteStep('review'); }}><div className="admin-form-field"><label htmlFor="invite-name">Full name</label><input id="invite-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="admin-form-field"><label htmlFor="invite-email">Email address</label><input id="invite-email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div className="admin-form-field"><label htmlFor="invite-role">Role</label><select id="invite-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{Object.entries(ROLE_LABELS).map(([value, title]) => <option value={value} key={value}>{title} ({ROLE_EXAMPLES[value]})</option>)}</select></div></form>}
      {inviteStep === 'review' && <div className="invitation-review"><ShieldCheck size={24} /><dl className="user-detail-list"><div><dt>Name</dt><dd>{form.name}</dd></div><div><dt>Email</dt><dd>{form.email}</dd></div><div><dt>Role</dt><dd>{ROLE_LABELS[form.role]}</dd></div><div><dt>Initial state</dt><dd>Invited — no access yet</dd></div></dl><p>A secure activation link will be emailed to the user. They will create their own password and have 7 days to activate.</p></div>}
      {inviteStep === 'sent' && <div className="invitation-review"><ShieldCheck size={24} /><p><strong>{invite?.name}</strong> was invited as {ROLE_LABELS[invite?.role]}. A secure activation link was sent by email. They must create a password within 7 days.</p></div>}
      {error && <p className="admin-form-error" role="alert">{error}</p>}
    </AdminModal>
    <AdminModal open={roleSaveOpen} title={`Update ${ROLE_LABELS[selectedRole]} permissions?`} description="This changes the inherited access of every user assigned to this role. Individual permission exceptions will remain in effect." onClose={() => { if (!roleSaving) setRoleSaveOpen(false); }} actions={<><button className="admin-secondary-button" type="button" disabled={roleSaving} onClick={() => setRoleSaveOpen(false)}>Cancel</button><button className="admin-primary-button" type="button" disabled={roleSaving} onClick={saveRolePermissions}>{roleSaving ? 'Saving…' : 'Confirm changes'}</button></>}><p className="admin-modal-copy"><strong>Audit reason:</strong> {roleReason}</p></AdminModal>
  </div>;
}
