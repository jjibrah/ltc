import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDonationSession } from '../../services/donations/donations.service';
import Donate from './Donate';

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 1500;
const SAFE_SESSION_ID = /^(cs_[A-Za-z0-9_]+|[0-9a-fA-F]{8}-[0-9a-fA-F-]{27})$/;

const STATE_COPY = {
  completed: {
    symbol: '✓',
    title: 'Donation confirmed',
    message: 'Stripe has confirmed your payment. Thank you for supporting Living the Charge.',
  },
  processing: {
    symbol: '…',
    title: 'Payment still processing',
    message: 'Your payment has not been confirmed yet. You can refresh this page or return later.',
  },
  failed: {
    symbol: '!',
    title: 'Payment failed',
    message: 'Stripe could not complete this payment. Please return to the donation page and try again.',
  },
  expired: {
    symbol: '–',
    title: 'Checkout expired',
    message: 'This Stripe Checkout Session expired before payment was confirmed.',
  },
  cancelled: {
    symbol: '×',
    title: 'Donation cancelled',
    message: 'This donation is cancelled and has not been counted as collected.',
  },
  error: {
    symbol: '!',
    title: 'Unable to verify payment',
    message: 'We could not reach the payment status service. No success has been assumed. Please refresh shortly.',
  },
  invalid: {
    symbol: '!',
    title: 'Invalid confirmation link',
    message: 'This link does not contain a valid donation session identifier.',
  },
};

export default function DonationSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id') || '';
  const isValidSessionId = sessionId.length <= 255 && SAFE_SESSION_ID.test(sessionId);
  const dismissalKey = isValidSessionId ? `ltc:donation-status-dismissed:${sessionId}` : '';
  const [viewState, setViewState] = useState(isValidSessionId ? 'verifying' : 'invalid');
  const [donation, setDonation] = useState(null);
  const [isVisible, setIsVisible] = useState(() => !dismissalKey || window.sessionStorage.getItem(dismissalKey) !== 'true');

  useEffect(() => {
    if (!isValidSessionId || !isVisible) return undefined;
    let cancelled = false;
    let timerId;

    const poll = async (attempt) => {
      try {
        const data = await getDonationSession(sessionId);
        if (cancelled) return;
        setDonation(data);
        if (data.status === 'completed') { setViewState('completed'); return; }
        if (['failed', 'expired', 'cancelled'].includes(data.status)) { setViewState(data.status); return; }
        if (data.status !== 'pending') { setViewState('error'); return; }
        if (attempt >= MAX_ATTEMPTS) { setViewState('processing'); return; }
      } catch {
        if (cancelled) return;
        if (attempt >= MAX_ATTEMPTS) { setViewState('error'); return; }
      }
      timerId = window.setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
    };

    poll(1);
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [isValidSessionId, isVisible, sessionId]);

  useEffect(() => {
    if (!isVisible) {
      navigate('/donate', { replace: true });
      return undefined;
    }
    if (viewState === 'verifying') return undefined;
    if (dismissalKey) window.sessionStorage.setItem(dismissalKey, 'true');
    const dismissTimer = window.setTimeout(() => {
      setIsVisible(false);
      navigate('/donate', { replace: true });
    }, 6000);
    return () => window.clearTimeout(dismissTimer);
  }, [dismissalKey, isVisible, navigate, viewState]);

  const formattedAmount = useMemo(() => {
    if (!donation) return null;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: String(donation.currency || 'usd').toUpperCase(),
      }).format(Number(donation.amount) || 0);
    } catch {
      return `${donation.amount} ${String(donation.currency || 'usd').toUpperCase()}`;
    }
  }, [donation]);

  const content = STATE_COPY[viewState];

  return (
    <div className="donation-status-page">
      <Donate />
      {isVisible && <section className={`donation-status-card donation-status-card--${viewState}`} role="status" aria-live="polite" aria-busy={viewState === 'verifying'}>
        {viewState === 'verifying' ? (
          <>
            <div className="donation-status-spinner" aria-hidden="true" />
            <h1>Confirming your donation…</h1>
            <p>We are waiting for secure confirmation from the LTC payment service.</p>
          </>
        ) : (
          <>
            <div className="donation-status-heading">
              <div className={`donation-status-symbol donation-status-symbol--${viewState}`} aria-hidden="true">{content.symbol}</div>
              <div>
                <h1>{content.title}</h1>
                <p>{content.message}</p>
              </div>
            </div>
            {donation && (
              <dl className="donation-status-details">
                <div><dt>Amount</dt><dd>{formattedAmount}</dd></div>
                <div><dt>Frequency</dt><dd>{donation.frequency === 'monthly' ? 'Monthly' : 'One-time'}</dd></div>
                <div><dt>Status</dt><dd>{donation.status}</dd></div>
              </dl>
            )}
            {viewState === 'processing' && <button type="button" className="donation-status-refresh" onClick={() => window.location.reload()}>Check again</button>}
          </>
        )}
      </section>}
      <style>{`
        .donation-status-page { min-height: 100vh; background: #F4F5F6; color: #1D1D31; }
        .donation-status-card { position: fixed; z-index: 1500; top: 104px; right: 24px; width: min(390px, calc(100vw - 48px)); padding: 20px; border: 1px solid #D7D9DE; border-radius: 4px; background: rgba(250,250,248,.98); box-shadow: 0 16px 40px rgba(8,15,30,.14); text-align: left; animation: donationStatusEnter .28s ease-out both; }
        .donation-status-heading { display: grid; grid-template-columns: 34px minmax(0,1fr); gap: 12px; align-items: start; }
        .donation-status-card h1 { margin: 1px 0 5px; font-family: var(--display-sans); font-size: 1rem; font-weight: 700; line-height: 1.3; }
        .donation-status-card p { margin: 0; color: #62636B; font-size: .82rem; line-height: 1.45; }
        .donation-status-symbol { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: #1D1D31; color: #fff; font-size: 1rem; font-weight: 700; }
        .donation-status-symbol--failed, .donation-status-symbol--error, .donation-status-symbol--invalid { background: #8A3434; }
        .donation-status-symbol--processing, .donation-status-symbol--expired, .donation-status-symbol--cancelled { background: #62636B; }
        .donation-status-spinner { width: 28px; height: 28px; margin: 0 0 12px; border: 2px solid #DFE0E4; border-top-color: #1D1D31; border-radius: 50%; animation: donationStatusSpin .8s linear infinite; }
        .donation-status-details { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; margin: 16px 0 0; border: 1px solid #DFE0E4; border-radius: 4px; overflow: hidden; background: #DFE0E4; }
        .donation-status-details div { min-width: 0; padding: 10px 8px; background: #fff; }
        .donation-status-details dt { color: #777982; font-size: .58rem; font-weight: 650; letter-spacing: .07em; text-transform: uppercase; }
        .donation-status-details dd { margin: 3px 0 0; overflow-wrap: anywhere; font-family: var(--display-sans); font-size: .76rem; font-weight: 650; text-transform: capitalize; }
        .donation-status-refresh { min-height: 38px; margin-top: 14px; padding: 0 15px; border: 0; border-radius: 4px; background: #1D1D31; color: #fff; font-size: .78rem; font-weight: 650; cursor: pointer; }
        @keyframes donationStatusEnter { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes donationStatusSpin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .donation-status-card { top: 76px; right: 12px; left: 12px; width: auto; padding: 16px; }
          .donation-status-details { grid-template-columns: repeat(3,minmax(0,1fr)); }
        }
        @media (prefers-reduced-motion: reduce) { .donation-status-card, .donation-status-spinner { animation: none; } }
      `}</style>
    </div>
  );
}
