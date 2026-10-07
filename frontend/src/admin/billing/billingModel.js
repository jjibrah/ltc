export const serviceTemplates = [
  { name: 'AWS', category: 'hosting', cycle: 'usage_based' },
  { name: 'Resend', category: 'email', cycle: 'monthly' },
  { name: 'Domain registration', category: 'domain', cycle: 'annual' },
  { name: 'Google Workspace', category: 'workspace', cycle: 'monthly' },
  { name: 'Supabase', category: 'hosting', cycle: 'monthly' },
];
export const blankService = { name: '', category: 'other', owner: '', amount: '', currency: 'USD', cycle: 'monthly', next_due_date: '', portal_url: '', notes: '', active: true };
export const todayDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function dueState(service, today = todayDate()) {
  if (!service.active) return { label: 'Archived', tone: '' };
  if (!service.next_due_date) return { label: 'Date needed', tone: 'warning' };
  const days = Math.round((Date.parse(service.next_due_date) - Date.parse(today)) / 86400000);
  if (days < 0) return { label: 'Overdue', tone: 'danger' };
  if (days === 0) return { label: 'Due today', tone: 'warning' };
  if (days <= 30) return { label: `Due in ${days} days`, tone: 'warning' };
  return { label: 'Upcoming', tone: '' };
}
export const costLabel = service => service.amount === null || service.amount === '' ? 'Cost not entered' : new Intl.NumberFormat(undefined, { style: 'currency', currency: service.currency }).format(Number(service.amount));
export const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not entered';
export function billingTotals(services, today = todayDate()) {
  return services.filter(s => s.active && s.next_due_date && Math.round((Date.parse(s.next_due_date) - Date.parse(today)) / 86400000) <= 30).reduce((totals, s) => { if (s.amount !== null && s.amount !== '') totals[s.currency] = (totals[s.currency] || 0) + Math.round(Number(s.amount) * 100); return totals; }, {});
}
