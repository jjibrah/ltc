import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import RequireAuth from '../../auth/guards/RequireAuth';
import AdminLayout from '../../admin/layout/AdminLayout';
import { useAuth } from '../providers/AuthProvider';
import RequirePermission from '../../shared/permissions/RequirePermission';

const AdminDashboard = lazy(() => import('../../admin/dashboard/AdminDashboardPage'));
const StoriesPage = lazy(() => import('../../admin/stories/StoriesPage'));
const UserDetailPage = lazy(() => import('../../admin/users/UserDetailPage'));
const UsersPage = lazy(() => import('../../admin/users/UsersPage'));
const FirstLoginPasswordPage = lazy(() => import('../../admin/first-login/FirstLoginPasswordPage'));
const ProfilesPage = lazy(() => import('../../admin/profiles/ProfilesPage'));
const ProfileReviewPage = lazy(() => import('../../admin/profiles/ProfileReviewPage'));
const NewslettersPage = lazy(() => import('../../admin/newsletters/NewslettersPage'));
const MentorsPage = lazy(() => import('../../admin/mentors/MentorsPage'));
const DonationsPage = lazy(() => import('../../admin/donations/DonationsPage'));
const AuditLogPage = lazy(() => import('../../admin/audit/AuditLogPage'));
const AdminProfilePage = lazy(() => import('../../admin/profile/AdminProfilePage'));

const BillingPage = lazy(() => import('../../admin/billing/BillingPage'));
const SettingsPage = lazy(() => import('../../admin/settings/SettingsPage'));
function BillingAccess({ children }) { const { user, can } = useAuth(); return user?.role === 'super_admin' || can('donations.view') ? children : <Navigate to="/admin/dashboard" replace />; }

export const adminRoutes = [
  { path: '/admin', element: <RequireAuth><AdminLayout /></RequireAuth>, children: [
    { index: true, element: <Navigate to="/admin/dashboard" replace /> },
    { path: 'first-login/change-password', element: <FirstLoginPasswordPage /> },
    { path: 'billing', element: <BillingAccess><BillingPage /></BillingAccess> },
    { path: 'settings', element: <SettingsPage /> },
    { path: 'profile', element: <AdminProfilePage /> },
    { path: 'dashboard', element: <RequirePermission permission="dashboard.view"><AdminDashboard /></RequirePermission> },
    { path: 'users', element: <RequirePermission permission="users.manage_permissions"><UsersPage /></RequirePermission> },
    { path: 'users/:userId', element: <RequirePermission permission="users.manage_permissions"><UserDetailPage /></RequirePermission> },
    { path: 'profiles', element: <RequirePermission permission="profiles.view"><ProfilesPage /></RequirePermission> },
    { path: 'profiles/:profileId', element: <RequirePermission permission="profiles.view"><ProfileReviewPage /></RequirePermission> },
    { path: 'newsletters', element: <RequirePermission permission="newsletters.view"><NewslettersPage /></RequirePermission> },
    { path: 'mentors', element: <RequirePermission permission="mentors.view"><MentorsPage /></RequirePermission> },
    { path: 'donations', element: <RequirePermission permission="donations.view"><DonationsPage /></RequirePermission> },
    { path: 'stories', element: <RequirePermission permission="stories.view"><StoriesPage /></RequirePermission> },
    { path: 'audit', element: <RequirePermission permission="audit.view"><AuditLogPage /></RequirePermission> },
  ] },
];
