import { Link } from 'react-router-dom';
import { AdminBadge } from '../components/AdminPrimitives';

export function DashboardMetricCard({ metric }) {
  const { Icon } = metric;
  const Component = metric.accessible ? Link : 'div';
  return <Component to={metric.accessible ? metric.path : undefined} className="dashboard-metric-card"><div className="dashboard-metric-card__top"><span className="dashboard-metric-card__label">{metric.label}</span><span className="dashboard-metric-card__icon"><Icon size={17} aria-hidden="true" /></span></div><strong>{metric.value}</strong><span className="dashboard-metric-card__detail">{metric.description} · {metric.detail}</span></Component>;
}

export function QuickActionCard({ action }) { const { Icon } = action; return <Link to={action.path} className="dashboard-quick-action"><span className="dashboard-quick-action__icon"><Icon size={17} aria-hidden="true" /></span><span><strong>{action.title}</strong><small>{action.description}</small></span></Link>; }

export function AttentionItem({ item }) { const { Icon } = item; return <div className="dashboard-attention-item"><span className={`dashboard-attention-item__icon dashboard-attention-item__icon--${item.tone}`}><Icon size={15} aria-hidden="true" /></span><div><strong>{item.title}</strong><p>{item.description}</p></div><Link to={item.path}>{item.action}</Link></div>; }

export function RecentActivityItem({ activity }) { const { Icon } = activity; return <li className="dashboard-activity-item"><span className="dashboard-activity-item__icon"><Icon size={14} aria-hidden="true" /></span><div><strong>{activity.title}</strong><time>{activity.time}</time></div></li>; }

export function DashboardSectionHeader({ title, count }) { return <div className="dashboard-section-header"><h2>{title}</h2>{count && <AdminBadge>{count}</AdminBadge>}</div>; }
