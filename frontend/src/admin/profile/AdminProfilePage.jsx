import { useUnsavedChanges } from '../components/useUnsavedChanges';
import { ExternalLink, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { AdminBadge, AdminCard, AdminEmptyState, PageHeader } from '../components/AdminPrimitives';
import { teamProfilesService } from '../../services/teamProfiles/teamProfiles.service';
import { PROFILE_DEPARTMENTS } from '../../constants/departments';

const roleLabels = { super_admin: 'Super admin', admin: 'Admin', staff: 'Staff', viewer: 'Viewer' };
const statusLabels = { active: 'Active', invited: 'Invited', disabled: 'Disabled' };
const PRIMARY_SUPER_ADMIN_EMAIL = 'ibrabdi109@gmail.com';
const initials = (name = '') => name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';

export default function AdminProfilePage() {
  const { user, can } = useAuth();
  const isProtectedPrimaryAdmin = String(user?.email || '').toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL;
  const [teamProfile, setTeamProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    teamProfilesService.getMine()
      .then((profile) => {
        if (!active) return;
        setTeamProfile(profile);
        setForm(profile);
      })
      .catch((requestError) => { if (active) { setTeamProfile(null); setForm({ name: user?.name || '', email: user?.email || '', role: '', department: '', quote: '', bio: '' }); setError(requestError?.status === 404 ? '' : requestError?.message || 'Unable to load your team profile.'); } })
      .finally(() => { if (active) setLoadingProfile(false); });
    return () => { active = false; };
  }, [user?.email, user?.name]);

  const profileDraft = useUnsavedChanges({ key: `${user?.id}:my-profile`, dirty: Boolean(form) && JSON.stringify(form) !== JSON.stringify(teamProfile || { name: user?.name || '', email: user?.email || '', role: '', department: '', quote: '', bio: '' }), draft: form, restore: setForm, ready: !loadingProfile && Boolean(form) && !isProtectedPrimaryAdmin });
  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const choosePortrait = (event) => {
    const file = event.target.files?.[0];
    if (file) updateField('image', { file });
    event.target.value = '';
  };
  const save = async (event) => {
    event.preventDefault();
    if (isProtectedPrimaryAdmin) {
      setError('The primary super admin profile can only be managed by the LTC team.');
      return;
    }
    setSaving(true); setNotice(''); setError('');
    try {
      const saved = teamProfile ? await teamProfilesService.updateMine(form) : await teamProfilesService.createMine(form);
      profileDraft.discard(); setTeamProfile(saved); setForm(saved); setNotice('Your team profile was updated successfully.');
    } catch (saveError) { setError(saveError?.message || 'Unable to update your team profile.'); }
    finally { setSaving(false); }
  };

  if (!user) return <div className="admin-page"><AdminCard><AdminEmptyState title="Profile unavailable" description="Your account details could not be loaded." /></AdminCard></div>;

  return <div className="admin-page">
    {profileDraft.restored && <p role="status">Unsaved profile draft restored. Review before saving.</p>}
    <PageHeader title="My profile" help="Update your account details and the linked team profile available on this page." />
    <div className="admin-profile-grid">
      <AdminCard>
        <div className="admin-card__body">
          <div className="admin-profile-identity">
            <span className="admin-avatar admin-profile-avatar">{initials(user.name)}</span>
            <div><h2>{user.name}</h2><p>{user.email}</p></div>
          </div>
          <dl className="user-detail-list">
            <div><dt>Role</dt><dd>{roleLabels[user.role] || user.role || '—'}</dd></div>
            <div><dt>Status</dt><dd><AdminBadge tone={user.status === 'active' ? 'success' : user.status === 'disabled' ? 'danger' : 'warning'}>{statusLabels[user.status] || user.status || '—'}</AdminBadge></dd></div>
          </dl>
        </div>
      </AdminCard>
      <AdminCard>
        <div className="admin-card__body">
          <div className="admin-profile-section-heading"><UserRound size={18} /><div><h2>Team profile</h2><p>Matched securely using your account email address.</p></div></div>
          {loadingProfile && <p className="admin-section-copy">Checking for a matching team profile…</p>}
          {!loadingProfile && teamProfile && <div className="admin-linked-profile">
            <div className="admin-profile-identity"><span className="admin-avatar admin-profile-avatar">{initials(teamProfile.name)}</span><div><h3>{teamProfile.name}</h3><p>{teamProfile.role} · {teamProfile.department}</p><span><Mail size={13} /> {teamProfile.email}</span></div></div>
            {can('profiles.view') && <Link className="admin-secondary-button" to={`/admin/profiles/${teamProfile.id}`}>Manage profile <ExternalLink size={14} /></Link>}
          </div>}
          {!loadingProfile && !teamProfile && <AdminEmptyState title="No linked team profile" description="Create your team profile below. It will be submitted for review and linked to your account email." />}
        </div>
      </AdminCard>
    </div>
    {!loadingProfile && form && <AdminCard>
      <div className="admin-card__body">
        <div className="admin-profile-section-heading"><UserRound size={18} /><div><h2>{teamProfile ? 'Edit your team profile' : 'Create your team profile'}</h2><p>{teamProfile ? 'Update the information displayed on your team profile. Your account email keeps this profile linked to you.' : 'Add your information to the team profile page. Your submission will be created as pending and linked to your account email.'}</p></div></div>
        {notice && <p className="permission-message" role="status">{notice}</p>}
        {error && <p className="permission-message permission-message--error" role="alert">{error}</p>}
        {isProtectedPrimaryAdmin && <div className="permission-warning profile-read-only-notice"><ShieldCheck size={17} /><div><strong>Profile managed by the LTC team</strong><p>Your primary super admin profile is read-only here. Contact the LTC team if these details need to be updated.</p></div></div>}
        <form className="admin-self-profile-form" onSubmit={save}>
          <div className="admin-form-field"><label htmlFor="self-profile-name">Name</label><input id="self-profile-name" value={form.name || ''} onChange={(event) => updateField('name', event.target.value)} required disabled={isProtectedPrimaryAdmin} /></div>
          <div className="admin-form-field"><label htmlFor="self-profile-email">Email address</label><input id="self-profile-email" type="email" value={form.email || ''} readOnly /></div>
          <div className="admin-form-field"><label htmlFor="self-profile-role">Role / position</label><input id="self-profile-role" value={form.role || ''} onChange={(event) => updateField('role', event.target.value)} required disabled={isProtectedPrimaryAdmin} /></div>
          <div className="admin-form-field"><label htmlFor="self-profile-department">Department</label><select id="self-profile-department" value={form.department || ''} onChange={(event) => updateField('department', event.target.value)} required disabled={isProtectedPrimaryAdmin}><option value="">Select a department</option>{PROFILE_DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}</select></div>
          <div className="admin-form-field"><label htmlFor="self-profile-quote">Quote</label><input id="self-profile-quote" value={form.quote || ''} onChange={(event) => updateField('quote', event.target.value)} maxLength={500} disabled={isProtectedPrimaryAdmin} /></div>
          <div className="admin-form-field admin-self-profile-form__full"><label htmlFor="self-profile-bio">Bio</label><textarea id="self-profile-bio" value={form.bio || ''} onChange={(event) => updateField('bio', event.target.value)} maxLength={5000} rows={6} disabled={isProtectedPrimaryAdmin} /></div>
          <div className="admin-form-field admin-self-profile-form__full"><label htmlFor="self-profile-image">Portrait</label><input id="self-profile-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePortrait} disabled={isProtectedPrimaryAdmin} /><small className="admin-form-help">Choose a JPEG, PNG, or WebP image under 5 MB. Leave blank to keep the current portrait.</small></div>
          {!isProtectedPrimaryAdmin && <button className="admin-primary-button admin-self-profile-form__submit" type="submit" disabled={saving}><Save size={14} /> {saving ? 'Saving…' : teamProfile ? 'Save profile changes' : 'Create profile'}</button>}
        </form>
      </div>
    </AdminCard>}
    <AdminCard>
      <div className="admin-card__body admin-profile-security"><ShieldCheck size={18} /><div><h2>Account security</h2><p>Keep your login details private and sign out when you finish using the admin portal.</p></div></div>
    </AdminCard>
  </div>;
}
