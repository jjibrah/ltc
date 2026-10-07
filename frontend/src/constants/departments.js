import { teamMembers } from '../site/team/team.data';

export const DEFAULT_DEPARTMENTS = [
  'Leadership',
  'Operations',
  'Communications',
  'Technology',
  'Partnerships',
  'Research',
];

export const PROFILE_DEPARTMENTS = [
  ...new Set([
    ...DEFAULT_DEPARTMENTS,
    ...teamMembers.map((member) => member.department).filter(Boolean),
  ]),
];
