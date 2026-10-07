import { useEffect, useRef, useState } from 'react';
import { createPledge } from '../../services/donations/donations.service';

export default function PledgeModal({ isOpen, onClose }) {
  const closeRef = useRef(null);
  const [form, setForm] = useState({ full_name: '', pledge_type: 'individual', organization: '', email: '', amount: '', frequency: 'one_time', message: '', publish_anonymously: false });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (isOpen) window.setTimeout(() => closeRef.current?.focus(), 0);
  }, [isOpen]);

  const submit = async (event) => {
    event.preventDefault(); setState('saving'); setError('');
    try {
      const { publish_anonymously, ...pledgeForm } = form;
      await createPledge({ ...pledgeForm, amount: Number(form.amount), organization: form.pledge_type === 'organization' ? form.organization : null, message: form.message || null, consent_to_publish: !publish_anonymously });
      setState('sent');
    } catch (requestError) { setError(requestError.message || 'We could not save your pledge. Please try again.'); setState('idle'); }
  };

  if (!isOpen) return null;
  return <div className="pledge-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="pledge-modal" role="dialog" aria-modal="true" aria-labelledby="pledge-modal-title">
      <button ref={closeRef} className="pledge-modal__close" type="button" onClick={onClose} aria-label="Close pledge form">×</button>
      {state === 'sent' ? <div className="pledge-modal__success"><h2 id="pledge-modal-title">Much appreciated</h2><p>Thank you for believing in Living the Charge. Our team will follow up with you concerning the payment.</p><button className="pledge-modal__submit" type="button" onClick={onClose}>Done</button></div> : <>
        <h2 id="pledge-modal-title">Make a pledge</h2>
        <p className="pledge-modal__intro">Share your commitment. Our team will follow up to confirm the details.</p>
        <form onSubmit={submit}>
          <div className="pledge-modal__grid">
            <label>Pledge type<select value={form.pledge_type} onChange={(event) => update('pledge_type', event.target.value)}><option value="individual">Individual</option><option value="organization">Organization</option></select></label>
            <label>Name<input required minLength="2" value={form.full_name} onChange={(event) => update('full_name', event.target.value)} /></label>
            {form.pledge_type === 'organization' && <label>Organization name<input required value={form.organization} onChange={(event) => update('organization', event.target.value)} /></label>}
            <label>Email<input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
            <label>Amount (USD)<input required type="number" min="1" step="0.01" value={form.amount} onChange={(event) => update('amount', event.target.value)} /></label>
          </div>
          <label>Commitment<select value={form.frequency} onChange={(event) => update('frequency', event.target.value)}><option value="one_time">One-time</option><option value="monthly">Monthly</option></select></label>
          <label>Message<textarea rows="3" maxLength="1000" placeholder="Why are you supporting this work?" value={form.message} onChange={(event) => update('message', event.target.value)} /></label>
          <label className="pledge-modal__check"><input type="checkbox" checked={form.publish_anonymously} onChange={(event) => update('publish_anonymously', event.target.checked)} /> Publish anonymously</label>
          {error && <p className="pledge-modal__error" role="alert">{error}</p>}
          <button className="pledge-modal__submit" type="submit" disabled={state === 'saving'}>{state === 'saving' ? 'Submitting…' : 'Submit pledge'}</button>
        </form>
      </>}
      <style>{`.pledge-modal-backdrop{position:fixed;inset:0;z-index:2100;display:grid;place-items:center;padding:16px;background:rgba(8,15,25,.58);backdrop-filter:blur(8px)}.pledge-modal{position:relative;width:min(560px,calc(100vw - 32px));max-height:90vh;overflow:auto;padding:28px;border:1px solid #dfe0e4;border-radius:4px;background:#fafaf8;color:#1d1d31}.pledge-modal__close{position:absolute;top:12px;right:14px;width:32px;height:32px;border:1px solid #dadce1;border-radius:4px;background:#fff;font-size:20px;cursor:pointer}.pledge-modal h2{margin:0 0 8px;font:600 2rem/1 var(--editorial-serif)}.pledge-modal__intro{margin:0 0 20px;color:#62636b;font-size:.86rem;line-height:1.5}.pledge-modal form{display:grid;gap:14px}.pledge-modal label{display:grid;gap:6px;color:#1d1d31;font-size:.78rem;font-weight:600}.pledge-modal input,.pledge-modal select,.pledge-modal textarea{width:100%;padding:10px 11px;border:1px solid #dadce1;border-radius:4px;background:#fff;color:#1d1d31;font:400 14px/1.4 var(--body-sans)}.pledge-modal__grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pledge-modal textarea{resize:vertical}.pledge-modal__check{display:flex!important;grid-template-columns:none;align-items:start;gap:8px;font-weight:400!important;line-height:1.4}.pledge-modal__check input{width:auto;margin-top:2px}.pledge-modal__submit{min-height:44px;padding:0 18px;border:0;border-radius:4px;background:#1d1d31;color:#fff;font:600 .85rem var(--display-sans);cursor:pointer}.pledge-modal__submit:disabled{opacity:.6;cursor:wait}.pledge-modal__error{margin:0;color:#a12626;font-size:.8rem}.pledge-modal__success p{color:#62636b;line-height:1.5}.pledge-modal__success .pledge-modal__submit{margin-top:12px}@media(max-width:560px){.pledge-modal{padding:24px 20px}.pledge-modal__grid{grid-template-columns:1fr}}`}</style>
      <style>{`.pledge-modal h2 { font-family: var(--display-sans); font-weight: 700; line-height: .98; }`}</style>
    </div>
  </div>;
}
