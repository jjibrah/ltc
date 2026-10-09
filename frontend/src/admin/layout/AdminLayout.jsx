import { clearAdminDrafts } from '../components/useUnsavedChanges';
import { CircleDollarSign, LogOut, LayoutDashboard, Users, IdCard, Handshake, Mail, FileText, ScrollText, PanelLeft, PanelLeftClose, CreditCard, Settings, Moon, Sun, X } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../app/providers/AuthProvider';
import '../styles/admin.css';

const navGroups = [
  { label: 'Overview', items: [{ to: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard, permission: 'dashboard.view' }] },
  { label: 'Fundraising', items: [{ to: '/admin/donations', label: 'Donations', Icon: CircleDollarSign, permission: 'donations.view' }] },
  { label: 'People', items: [{ to: '/admin/users', label: 'Users & Permissions', Icon: Users, permission: 'users.manage_permissions' }, { to: '/admin/profiles', label: 'Team Profiles', Icon: IdCard, permission: 'profiles.view' }, { to: '/admin/mentors', label: 'Mentors', Icon: Handshake, permission: 'mentors.view' }] },
  { label: 'Communications', items: [{ to: '/admin/newsletters', label: 'Newsletter', Icon: Mail, permission: 'newsletters.view' }] },
  { label: 'Content', items: [{ to: '/admin/stories', label: 'Stories', Icon: FileText, permission: 'stories.view' }] },
  { label: 'Workspace', items: [{ to: '/admin/billing', label: 'Billing', Icon: CreditCard, billing: true }, { to: '/admin/settings', label: 'Settings', Icon: Settings }] },
  { label: 'Security', items: [{ to: '/admin/audit', label: 'Audit Log', Icon: ScrollText, permission: 'audit.view' }] },
];
export default function AdminLayout() {
  const { logout, can, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('ltc-admin-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } });
  const toggleTheme = () => { const root = document.querySelector('.admin-portal'); root?.classList.add('admin-theme-changing'); requestAnimationFrame(() => requestAnimationFrame(() => root?.classList.remove('admin-theme-changing'))); setTheme(previous => { const next = previous === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('ltc-admin-theme', next); } catch { /* Theme still works when storage is blocked. */ } return next; }); };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('ltc-sidebar-collapsed') === 'true'; } catch { return false; } });
  const toggleCollapsed = () => setCollapsed(previous => { const next = !previous; try { localStorage.setItem('ltc-sidebar-collapsed', String(next)); } catch { /* Navigation remains usable when storage is blocked. */ } return next; });
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const sidebarRef = useRef(null);
  const menuRef = useRef(null);
  const visibleGroups = navGroups.map((group) => ({ ...group, items: group.items.filter((item) => item.billing ? user?.role === 'super_admin' || can('donations.view') : !item.permission || can(item.permission)) })).filter((group) => group.items.length);
  const workspaceHome = visibleGroups[0]?.items[0]?.to || '/admin/profile';
  const initials = (user?.name || 'My account').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('');
  const currentItem = navGroups.flatMap((group) => group.items).find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
  const currentLabel = location.pathname === '/admin/profile' ? 'My profile' : location.pathname === '/admin/first-login/change-password' ? 'Account security' : currentItem?.label || 'Dashboard';
  const detailLabel = currentItem && location.pathname !== currentItem.to ? currentItem.to === '/admin/users' ? 'User details' : 'Profile review' : null;
  const signOut = () => { if (!window.dispatchEvent(new Event('ltc:confirm-navigation', { cancelable: true }))) return; clearAdminDrafts(); logout(); navigate('/admin/login', { replace: true }); };
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap'; link.id = 'ltc-admin-fonts'; document.head.appendChild(link); return () => link.remove();
  }, []);
  useEffect(() => { closeSidebar(); }, [location.pathname]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => { setMobile(query.matches); closeSidebar(); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const menu = menuRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current.querySelector('.admin-sidebar-close')?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeSidebar();
      if (event.key !== 'Tab') return;
      const controls = [...sidebarRef.current.querySelectorAll('a, button:not(:disabled)')].filter(element => element.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      menu?.focus();
    };
  }, [sidebarOpen]);

  return <div className="admin-portal" data-theme={theme}><a className="admin-skip-link" href="#admin-content">Skip to content</a><div className={`admin-shell${collapsed && !mobile ? ' admin-shell--collapsed' : ''}`}>
    {sidebarOpen && <button className="admin-sidebar-backdrop" type="button" tabIndex={-1} aria-label="Close navigation" onClick={closeSidebar} />}
    <aside ref={sidebarRef} id="admin-navigation" inert={mobile && !sidebarOpen} role={mobile && sidebarOpen ? 'dialog' : undefined} aria-modal={mobile && sidebarOpen ? true : undefined} aria-label={mobile && sidebarOpen ? 'Admin navigation' : undefined} className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}>
      <div className="admin-brand"><NavLink to={workspaceHome} className="admin-brand-link" onClick={closeSidebar}><img src={theme === 'dark' ? '/brand/ltc-logo-white.svg' : '/brand/ltc-logo-navy.svg'} alt="" width="512" height="512" /><span><strong>Living the Charge</strong><small>Staff workspace</small></span></NavLink><button className="admin-sidebar-close" type="button" aria-label="Close navigation" onClick={closeSidebar}><X size={18} aria-hidden="true" /></button></div>
      <nav aria-label="Admin navigation">{visibleGroups.map((group) => <div className="admin-nav-section" key={group.label}><div className="admin-nav-group">{group.label}</div>{group.items.map(({ to, label, Icon }) => <NavLink key={to} to={to} aria-label={label} title={collapsed && !mobile ? label : undefined} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} onClick={closeSidebar}><Icon size={18} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></NavLink>)}</div>)}</nav>
      <div className="admin-sidebar__bottom"><NavLink to="/admin/profile" aria-label={`My profile: ${user?.name || 'My account'}`} className={({ isActive }) => `admin-sidebar-account${isActive ? ' active' : ''}`} onClick={closeSidebar}><span className="admin-account-avatar" aria-hidden="true">{initials}</span><span className="admin-sidebar-account__text"><span>{user?.name || 'My account'}</span><small>My profile · {user?.role?.replaceAll('_', ' ')}</small></span></NavLink><button className="admin-sidebar-logout" aria-label="Sign out" title={collapsed && !mobile ? 'Sign out' : undefined} type="button" onClick={signOut}><LogOut size={16} strokeWidth={1.6} aria-hidden="true" />Sign out</button></div>
    </aside>
    <div className="admin-main" inert={mobile && sidebarOpen}>
      <header className="admin-topbar">
        {!mobile && <button className="admin-collapse-button admin-secondary-button" type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} aria-controls="admin-navigation" onClick={toggleCollapsed}>{collapsed ? <PanelLeft size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}</button>}
        <button ref={menuRef} className="admin-menu-button" type="button" aria-label="Open navigation" aria-controls="admin-navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}><PanelLeft size={18} aria-hidden="true" /></button>
        <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
          <ol><li className="admin-breadcrumbs__workspace"><NavLink to={workspaceHome} end>Workspace</NavLink></li><li className="admin-breadcrumbs__separator" aria-hidden="true">/</li>
            {detailLabel ? <><li><NavLink to={currentItem.to}>{currentLabel}</NavLink></li><li className="admin-breadcrumbs__separator" aria-hidden="true">/</li><li><span className="admin-topbar__title" aria-current="page">{detailLabel}</span></li></> : <li><span className="admin-topbar__title" aria-current="page">{currentLabel}</span></li>}
          </ol>
        </nav>
        <button className="admin-theme-button admin-secondary-button" type="button" aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} title={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}</button>
        <NavLink to="/admin/profile" className="admin-account-link admin-topbar-account" aria-label={`My profile: ${user?.name || 'My account'}`}>
          <span className="admin-account-avatar" aria-hidden="true">{initials}</span>
          <span className="admin-topbar-account__identity"><span>{user?.name || 'My account'}</span><small>{user?.role?.replaceAll('_', ' ')}</small></span>
        </NavLink>
      </header>
      <section id="admin-content" aria-label={currentLabel} tabIndex={-1}><Outlet /></section>
    </div>
  </div><Toaster position="bottom-right" toastOptions={{ className: 'admin-toast', error: { duration: 6000 } }} /></div>;
}
