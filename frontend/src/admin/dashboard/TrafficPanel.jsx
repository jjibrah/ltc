import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminCard } from '../components/AdminPrimitives';
import PageInfo from '../components/PageInfo';
import { analyticsService } from './analytics.service';
const count = value => Number(value).toLocaleString();
function Breakdown({ title, metric, records }) { return <section><h3>{title}<small>{metric}</small></h3>{records.length ? <ol className="traffic-breakdown">{records.map(row => <li key={row.label}><span>{row.label}</span><span>{count(row.value)}</span></li>)}</ol> : <p className="operations-detail">No recorded data.</p>}</section>; }
export default function TrafficPanel() {
  const [days, setDays] = useState(30), [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true });
  useEffect(() => { let active = true; setState({ loading: true }); analyticsService.summary(days).then(data => { if (active) setState({ data }); }).catch(e => { if (active) setState({ error: e.message || 'Traffic reports are temporarily unavailable.' }); }); return () => { active = false; }; }, [days, attempt]);
  const data = state.data;
  return <AdminCard className="dashboard-traffic-card"><div className="admin-card__body">
    <div className="dashboard-section-header"><div className="admin-title-row"><h2>Website traffic</h2><PageInfo title="Website traffic">GA4 reports visits to public pages from visitors who consent to analytics. Private and token routes are excluded. Users are GA4 identifiers, not a verified count of people. Reports cover complete days in the property timezone and may be delayed, filtered or limited by Google. Cached for up to five minutes.</PageInfo></div><label className="traffic-range">Period<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label></div>
    {state.loading ? <p role="status">Loading website traffic…</p> : state.error ? <div><p role="alert">{state.error}</p><button type="button" className="admin-secondary-button" onClick={() => setAttempt(n => n + 1)}>Retry traffic</button></div> : data.status !== 'ready' ? <><p className="operations-message">{data.status === 'configuration_incomplete' ? 'Setup incomplete' : 'Not configured'}</p><p className="operations-detail">Configure the GA4 property and backend reporting credentials in Settings. No visitor totals are estimated.</p></> : <>
      <p className="operations-detail">{data.period} · {data.timezone} · Updated {new Date(data.fetched_at).toLocaleTimeString()}</p>
      <dl className="traffic-totals"><div><dt>Visitors (GA4 users)</dt><dd>{count(data.totals.visitors)}</dd></div><div><dt>Page views</dt><dd>{count(data.totals.page_views)}</dd></div><div><dt>Sessions</dt><dd>{count(data.totals.sessions)}</dd></div></dl>
      {data.totals.page_views === 0 && <p className="operations-message">No recorded traffic in this period. Newly enabled tracking needs visits and processing time before reports appear.</p>}
      {data.limited && <p className="operations-message">Google marks this report as thresholded, sampled or limited. These counts may omit data.</p>}
      <div className="traffic-breakdowns"><Breakdown title="Top pages" metric="Page views" records={data.pages} /><Breakdown title="Top sources" metric="Sessions" records={data.sources} /><Breakdown title="Countries" metric="GA4 users" records={data.countries} /></div>
      <details className="traffic-daily"><summary>Daily page views</summary>{data.daily.length ? <ol className="traffic-breakdown">{data.daily.map(row => <li key={row.label}><time dateTime={`${row.label.slice(0, 4)}-${row.label.slice(4, 6)}-${row.label.slice(6, 8)}`}>{`${row.label.slice(0, 4)}-${row.label.slice(4, 6)}-${row.label.slice(6, 8)}`}</time><span>{count(row.value)}</span></li>)}</ol> : <p>No recorded daily page views.</p>}</details>
    </>}
    <Link className="operations-message" to="/admin/settings">Analytics settings</Link>
  </div></AdminCard>;
}
