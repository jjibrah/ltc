import ListPagination from '../components/ListPagination';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { AdminBadge, AdminCard, AdminEmptyState, AdminModal, PageHeader } from '../components/AdminPrimitives';
import { createManualDonation, getDonationSummary, getAdminDonations, getAdminPledges, updatePledgeStatus, updateSupporterPublication } from '../../services/donations/donations.service';
import { useAuth } from '../../app/providers/AuthProvider';

const statusLabels = { pending: 'Pending', completed: 'Completed', expired: 'Expired', failed: 'Failed', cancelled: 'Cancelled' };
const pledgeStatusLabels = { pending: 'Pending', approved: 'Approved', fulfilled: 'Fulfilled', withdrawn: 'Withdrawn' };
const statusTone = (status) => status === 'completed' ? 'success' : status === 'pending' ? 'warning' : ['failed', 'cancelled'].includes(status) ? 'danger' : '';
const money = (amount, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(Number(amount || 0));
const blankManualDonation = () => ({ donor_name: '', donor_email: '', amount: '', frequency: 'one_time', donated_at: new Date().toISOString().slice(0, 16), anonymous: true, message: '', manual_reference: '' });

export default function DonationsPage() {
  const { user, can } = useAuth();
  const [page, setPage] = useState(0);
  const [pledgePage, setPledgePage] = useState(0);
  const [summary, setSummary] = useState(null);
  const [pledgeError, setPledgeError] = useState('');
  const mayViewPledges = can('pledges.view');
  const [donations, setDonations] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState(blankManualDonation);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');
  const requestInFlight = useRef(0);
  const lastRefreshAt = useRef(0);

  const load = useCallback(async ({ initial = false } = {}) => {
    const requestVersion = ++requestInFlight.current;
    if (initial) setLoading(true);
    try {
      const results = await Promise.allSettled([
        getAdminDonations({ limit: 50, offset: page * 50, search, status }),
        mayViewPledges ? getAdminPledges({ limit: 50, offset: pledgePage * 50 }) : Promise.resolve([]),
        getDonationSummary(),
      ]);
      if (requestVersion !== requestInFlight.current) return;
      if (results[0].status === 'rejected') throw results[0].reason;
      setDonations(results[0].value);
      if (results[1].status === 'fulfilled') { setPledges(results[1].value); setPledgeError(''); }
      else setPledgeError(results[1].reason.message);
      setSummary(results[2].status === 'fulfilled' ? results[2].value : null);
      lastRefreshAt.current = Date.now();
      setLastUpdated(new Date());
      setError('');
    } catch (requestError) {
      if (initial) setError(requestError.message);
    } finally {
      if (initial && requestVersion === requestInFlight.current) setLoading(false);
    }
  }, [page, pledgePage, search, status, mayViewPledges]);

  useEffect(() => {
    load({ initial: true });
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible' && Date.now() - lastRefreshAt.current > 5000) load(); };
    const intervalId = window.setInterval(refreshWhenVisible, 60000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [load]);

  const filtered = useMemo(() => donations.filter((donation) => {
    const matchesSearch = `${donation.donor_name} ${donation.donor_email}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === 'all' || donation.status === status);
  }), [donations, search, status]);
  const total = summary?.total_collected;
  const monthly = summary?.monthly;
  const updateManual = (key, value) => setManualForm((current) => ({ ...current, [key]: value }));
  const saveManual = async (event) => {
    event.preventDefault(); setManualSaving(true); setManualError('');
    try {
      await createManualDonation({ ...manualForm, amount: Number(manualForm.amount), donated_at: new Date(manualForm.donated_at).toISOString(), message: manualForm.message || null, manual_reference: manualForm.manual_reference || null });
      setManualOpen(false); setManualForm(blankManualDonation()); await load({ initial: true });
    } catch (requestError) { setManualError(requestError.message); }
    finally { setManualSaving(false); }
  };
  const changePledgeStatus = async (id, nextStatus) => {
    try { const updated = await updatePledgeStatus(id, nextStatus); setPledges((current) => current.map((pledge) => pledge.id === id ? updated : pledge)); }
    catch (requestError) { setError(requestError.message); }
  };
  const changeVisibility = async (donation, nextStatus) => {
    try {
      await updateSupporterPublication(donation.id, nextStatus, undefined);
      setDonations((current) => current.map((item) => item.id === donation.id ? {
        ...item,
        supporter_publication_status: nextStatus,

      } : item));
    } catch (requestError) { setError(requestError.message); }
  };

  return <div className="admin-page">
    <PageHeader title="Donations" help="Review the donation ledger and pledge submissions you have permission to access. Pledges are not collected payments." action={<div className="admin-action-row">{user?.role === 'super_admin' && <button className="admin-primary-button" type="button" onClick={() => { setManualError(''); setManualOpen(true); }} >Add historical donation</button>}<button className="admin-secondary-button" type="button" onClick={() => load({ initial: true })}><RefreshCw size={14} /> Refresh</button></div>} />
    {lastUpdated && <p className="admin-last-updated">Last updated {lastUpdated.toLocaleTimeString()}</p>}
    <div className="profile-summary-grid"><div><strong>{summary ? money(total, 'usd') : '—'}</strong><span>Completed total</span></div><div><strong>{summary?.completed ?? '—'}</strong><span>Completed</span></div><div><strong>{monthly ?? '—'}</strong><span>Monthly donors</span></div><div><strong>{summary?.attempts ?? '—'}</strong><span>Total attempts</span></div></div>
    
    <AdminCard><div className="admin-card__body">
      <div className="admin-toolbar"><div className="admin-search-wrap"><Search size={15} aria-hidden="true" /><input className="admin-search" aria-label="Search donations" placeholder="Search donor name or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></div><select className="admin-select" aria-label="Filter donations by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="admin-count">{filtered.length} donations · Auto-updates</span></div>
      {loading ? <div className="admin-state" role="status">Loading donations…</div> : error ? <AdminEmptyState title="We couldn't load donations" description={error} action={<button className="admin-secondary-button" type="button" onClick={() => load({ initial: true })}>Try again</button>} /> : filtered.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Donor</th><th className="admin-numeric">Amount</th><th>Frequency</th><th>Source</th><th>Status</th><th>Visibility</th><th>Date</th></tr></thead><tbody>{filtered.map((donation) => <tr key={donation.id}><td><div className="admin-identity-name">{donation.donor_name}</div><div className="admin-identity-sub">{donation.donor_email}</div></td><td className="admin-numeric"><strong>{money(donation.requested_amount, donation.currency)}</strong></td><td>{donation.frequency === 'monthly' ? 'Monthly' : 'One-time'}</td><td>{donation.payment_source === 'manual' ? 'Historical' : 'Stripe'}</td><td><AdminBadge tone={statusTone(donation.status)}>{statusLabels[donation.status] || donation.status}</AdminBadge></td><td><select className="admin-select" value={donation.supporter_publication_status || 'pending'} aria-label={`Change public visibility for ${donation.donor_name}`} onChange={(event) => changeVisibility(donation, event.target.value)}><option value="pending">Private / pending</option><option value="approved">Publish publicly</option><option value="rejected">Keep hidden</option></select><small className="admin-visibility-note">{donation.anonymous ? 'Anonymous' : 'Named supporter'}</small></td><td>{donation.donated_at ? new Date(donation.donated_at).toLocaleString() : '—'}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="No donations found" description={search || status !== 'all' ? 'Try changing the search or status filter.' : 'Donation attempts will appear here after someone begins Stripe Checkout.'} />}
    </div></AdminCard><ListPagination page={page} setPage={setPage} count={donations.length} loading={loading} label="donations" />
    {mayViewPledges && <>{pledgeError && <p role="alert">{pledgeError}</p>}<AdminCard><div className="admin-card__body"><div className="admin-toolbar"><strong> Pledge submissions</strong><span className="admin-count">{pledges.length} pledges · Private until approved</span></div>{pledges.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Contact</th><th className="admin-numeric">Amount</th><th>Frequency</th><th>Consent</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{pledges.map((pledge) => <tr key={pledge.id}><td><div className="admin-identity-name">{pledge.full_name}</div><div className="admin-identity-sub">{pledge.organization || '—'} · {pledge.email}</div></td><td className="admin-numeric"><strong>{money(pledge.amount, pledge.currency)}</strong></td><td>{pledge.frequency === 'monthly' ? 'Monthly' : 'One-time'}</td><td>{pledge.consent_to_publish ? 'Yes' : 'No'}</td><td><select className="admin-select" aria-label={`Update pledge from ${pledge.full_name}`} value={pledge.status} onChange={(event) => changePledgeStatus(pledge.id, event.target.value)}>{Object.entries(pledgeStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td>{pledge.created_at ? new Date(pledge.created_at).toLocaleString() : '—'}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="No pledge submissions" description="Public pledge interest submissions will appear here for follow-up." />}</div></AdminCard><ListPagination page={pledgePage} setPage={setPledgePage} count={pledges.length} loading={loading} label="pledges" /></>}
    <AdminModal open={manualOpen} title="Add historical donation" description="Record a prior donation in the completed ledger. This does not create a Stripe payment." onClose={() => { if (!manualSaving) setManualOpen(false); }} actions={<><button className="admin-secondary-button" type="button" disabled={manualSaving} onClick={() => setManualOpen(false)}>Cancel</button><button className="admin-primary-button" type="submit" form="manual-donation-form" disabled={manualSaving}>{manualSaving ? 'Saving…' : 'Save donation'}</button></>}>
      <form id="manual-donation-form" className="manual-donation-form" onSubmit={saveManual}>
        <div className="admin-form-field"><label htmlFor="manual-donor-name">Donor name</label><input id="manual-donor-name" required value={manualForm.donor_name} onChange={(event) => updateManual('donor_name', event.target.value)} /></div>
        <div className="admin-form-field"><label htmlFor="manual-donor-email">Donor email</label><input id="manual-donor-email" type="email" required value={manualForm.donor_email} onChange={(event) => updateManual('donor_email', event.target.value)} /></div>
        <div className="admin-form-field"><label htmlFor="manual-amount">Amount (USD)</label><input id="manual-amount" type="number" min="0.01" step="0.01" required value={manualForm.amount} onChange={(event) => updateManual('amount', event.target.value)} /></div>
        <div className="admin-form-field"><label htmlFor="manual-frequency">Frequency</label><select id="manual-frequency" value={manualForm.frequency} onChange={(event) => updateManual('frequency', event.target.value)}><option value="one_time">One-time</option><option value="monthly">Monthly</option></select></div>
        <div className="admin-form-field"><label htmlFor="manual-date">Original donation date</label><input id="manual-date" type="datetime-local" required value={manualForm.donated_at} onChange={(event) => updateManual('donated_at', event.target.value)} /></div>
        <div className="admin-form-field"><label htmlFor="manual-reference">Historical reference</label><input id="manual-reference" placeholder="Receipt, transfer or ledger reference" value={manualForm.manual_reference} onChange={(event) => updateManual('manual_reference', event.target.value)} /></div>
        <div className="admin-form-field manual-donation-form__full"><label htmlFor="manual-message">Message or notes</label><textarea id="manual-message" rows="3" value={manualForm.message} onChange={(event) => updateManual('message', event.target.value)} /></div>
        <label className="manual-donation-form__checkbox"><input type="checkbox" checked={manualForm.anonymous} onChange={(event) => updateManual('anonymous', event.target.checked)} /> Keep this donor anonymous on the public supporters list</label>
        {manualError && <p className="admin-form-error manual-donation-form__full" role="alert">{manualError}</p>}
      </form>
    </AdminModal>
  </div>;
}
