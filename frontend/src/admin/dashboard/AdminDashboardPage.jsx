import DashboardOperations from './DashboardOperations';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminCard, PageHeader } from '../components/AdminPrimitives';
import { dashboardQuickActions } from './dashboardData';
import { AttentionItem, DashboardMetricCard, DashboardSectionHeader, QuickActionCard } from './DashboardParts';
import { dashboardService } from '../../services/dashboard/dashboard.service';
import { AlertTriangle, BookOpen, CircleDollarSign, Handshake, IdCard, Mail, Users } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';

export default function AdminDashboardPage() {
  const { can, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    let active = true; setRefreshing(true); setError('');
    dashboardService.getSummary(reload > 0).then(result => { if (active) setSummary(result); }).catch(() => { if (active) setError('Unable to load dashboard. Try again.'); }).finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [reload]);
  if (error && !summary) return <div className="admin-page"><PageHeader title="Dashboard" /><AdminCard><div className="admin-card__body"><p role="alert">{error}</p><button className="admin-secondary-button" type="button" onClick={() => setReload(n => n + 1)}>Try again</button></div></AdminCard><DashboardOperations /></div>;
  if (!summary) return <div className="admin-page"><div className="admin-state" role="status">Loading dashboard…</div></div>;
  const metrics = [
    ...(summary.donations ? [{ label: 'Fund raised', value: new Intl.NumberFormat(undefined, { style: 'currency', currency: summary.donations.currency || 'USD' }).format(Number(summary.donations.total_collected || 0)), description: 'Completed donations', detail: `${summary.donations.completed} recorded payments`, permission: 'donations.view', path: '/admin/donations', Icon: CircleDollarSign }] : []),
    { label: 'Active users', value: String(summary.users.active), description: 'Team access', detail: `${summary.users.invited} invitation${summary.users.invited === 1 ? '' : 's'} pending`, permission: 'users.manage_permissions', path: '/admin/users', Icon: Users },
    { label: 'Team profiles', value: String(summary.team_profiles.published), description: 'Published profiles', detail: `${summary.team_profiles.pending + summary.team_profiles.changes_requested} need review`, permission: 'profiles.view', path: '/admin/profiles', Icon: IdCard },
    { label: 'Subscribers', value: String(summary.subscribers.active), description: 'Active subscribers', detail: `${summary.newsletters.sent} newsletter${summary.newsletters.sent === 1 ? '' : 's'} sent`, permission: 'newsletters.view', path: '/admin/newsletters', Icon: Mail },
  ];
  const attention = [
    summary.team_profiles.pending > 0 && { tone: 'warning', title: `${summary.team_profiles.pending} profile${summary.team_profiles.pending === 1 ? '' : 's'} awaiting review`, description: 'Check submitted team information before publishing.', action: 'Review', permission: 'profiles.view', path: '/admin/profiles', Icon: IdCard },
    (summary.mentors.pending + summary.mentors.under_review) > 0 && { tone: 'warning', title: `${summary.mentors.pending + summary.mentors.under_review} mentor request${summary.mentors.pending + summary.mentors.under_review === 1 ? '' : 's'} to review`, description: 'Respond to people interested in supporting students.', action: 'Open requests', permission: 'mentors.view', path: '/admin/mentors', Icon: Handshake },
    summary.users.invited > 0 && { tone: 'default', title: `${summary.users.invited} invitation${summary.users.invited === 1 ? '' : 's'} not accepted`, description: 'Follow up with new team members who have not activated access.', action: 'View users', permission: 'users.manage_permissions', path: '/admin/users', Icon: Users },
  ].filter(item => item && can(item.permission));
  return <div className="admin-page admin-dashboard-page">
    <PageHeader title="Dashboard" help="Review current totals and work that needs attention. Unavailable totals are marked rather than estimated." action={can('users.invite') && can('users.manage_permissions') ? <Link className="admin-primary-button" to="/admin/users">Invite user</Link> : null} />
    <div className="dashboard-heading-meta"><button className="admin-secondary-button" type="button" disabled={refreshing} onClick={() => setReload(n => n + 1)}>{refreshing ? 'Refreshing…' : 'Refresh totals'}</button>{summary.generated_at ? <span>Snapshot from {new Date(summary.generated_at).toLocaleString()}</span> : <span>Current operational snapshot</span>}</div>
    {error && <p role="alert">{error} Showing the previous snapshot.</p>}
    <nav className="dashboard-launchpad" aria-label="Workspace shortcuts">{[{ label: 'Billing', to: '/admin/billing', allowed: user?.role === 'super_admin' || can('donations.view') }, { label: 'Audit log', to: '/admin/audit', allowed: can('audit.view') }, { label: 'Settings', to: '/admin/settings', allowed: true }].filter(item => item.allowed).map(item => <Link className="admin-secondary-button" key={item.to} to={item.to}>{item.label}</Link>)}</nav>
    <section aria-label="Operational overview" className="dashboard-metric-grid">{metrics.map((metric) => <DashboardMetricCard key={metric.label} metric={{ ...metric, accessible: can(metric.permission) }} />)}</section>
    <div className="dashboard-operations-grid">
      <AdminCard><div className="admin-card__body"><DashboardSectionHeader title="Needs attention" count={attention.length ? `${attention.length} items` : 'All clear'} />{attention.length ? <div className="dashboard-attention-list">{attention.map((item) => <AttentionItem key={item.title} item={item} />)}</div> : <div className="dashboard-clear-state"><AlertTriangle size={17} /><span>No urgent reviews or pending invitations.</span></div>}</div></AdminCard>
      <AdminCard><div className="admin-card__body"><DashboardSectionHeader title="Content overview" /><div className="dashboard-overview-list">{can('newsletters.view') && <Link to="/admin/newsletters"><Mail size={16} /><span><strong>{summary.newsletters.draft} newsletter drafts</strong><small>{summary.newsletters.scheduled} scheduled · {summary.newsletters.sent} sent</small></span></Link>}{can('stories.view') && <Link to="/admin/stories"><BookOpen size={16} /><span><strong>{summary.stories.published} published stories</strong><small>{summary.stories.draft} drafts awaiting review</small></span></Link>}{can('mentors.view') && <Link to="/admin/mentors"><Handshake size={16} /><span><strong>{summary.mentors.total} mentor applications</strong><small>{summary.mentors.pending} new · {summary.mentors.under_review} under review</small></span></Link>}</div></div></AdminCard>
    </div>
    <DashboardOperations />
    <AdminCard><div className="admin-card__body"><DashboardSectionHeader title="Quick actions" /><div className="dashboard-quick-actions">{dashboardQuickActions.filter((action) => !action.permission || can(action.permission)).map((action) => <QuickActionCard key={action.title} action={action} />)}</div></div></AdminCard>
  </div>;
}
