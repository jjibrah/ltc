import { Handshake, IdCard, Mail, UserPlus, UserRound } from 'lucide-react';

export const dashboardQuickActions = [
  { title: 'View my profile', description: 'Review or update your personal team profile.', path: '/admin/profile', Icon: UserRound },
  { title: 'Invite user', description: 'Generate an invitation link for a new team member.', path: '/admin/users', Icon: UserPlus, permission: 'users.manage_permissions' },
  { title: 'Create profile link', description: 'Send a team member a link to complete their profile.', path: '/admin/profiles', Icon: IdCard, permission: 'profiles.view' },
  { title: 'Create newsletter', description: 'Start drafting a newsletter for subscribers.', path: '/admin/newsletters', Icon: Mail, permission: 'newsletters.view' },
  { title: 'Review mentor requests', description: 'Review people interested in mentoring LTC students.', path: '/admin/mentors', Icon: Handshake, permission: 'mentors.view' },
];
