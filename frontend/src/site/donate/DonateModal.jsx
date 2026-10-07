import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, LoaderCircle, X } from 'lucide-react';
import { checkoutAttempt, createCheckoutSession } from '../../services/donations/donations.service';

const amounts = [21, 42, 210, 420];
const MIN_DONATION = 1;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function DonateModal({ isOpen, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const checkoutAttemptRef = useRef('');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [frequency, setFrequency] = useState('one_time');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [formError, setFormError] = useState('');
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const amount = customAmount === '' ? selectedAmount : Number(customAmount);
  const amountLabel = Number.isFinite(amount) && amount > 0 ? money.format(amount) : 'your contribution';

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background = [];
    let modalBranch = dialogRef.current?.parentElement;
    while (modalBranch && modalBranch !== document.body) {
      for (const sibling of modalBranch.parentElement.children) {
        if (sibling !== modalBranch && sibling instanceof HTMLElement) {
          background.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      modalBranch = modalBranch.parentElement;
    }
    setCurrentStep(1);
    setSelectedAmount(null);
    setCustomAmount('');
    setIsPublic(true);
    setFormError('');
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === stepHeadingRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach(([element, wasInert]) => { element.inert = wasInert; });
      document.removeEventListener('keydown', handleKeyDown);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
      if (stepHeadingRef.current?.parentElement) stepHeadingRef.current.parentElement.scrollTop = 0;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (formError) dialogRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [formError]);

  const chooseAmount = (value) => { setSelectedAmount(value); setCustomAmount(''); setFormError(''); };
  const changeCustomAmount = (event) => { setCustomAmount(event.target.value); setSelectedAmount(null); setFormError(''); };
  const continueToDetails = () => {
    if (!Number.isFinite(amount) || amount < MIN_DONATION) {
      setFormError(`Please enter an amount of $${MIN_DONATION} or more.`);
      return;
    }
    setFormError('');
    setCurrentStep(2);
  };
  const continueToCheckout = () => {
    if (!donorName.trim()) { setFormError('Please enter your full name.'); return; }
    if (!EMAIL_PATTERN.test(donorEmail.trim())) { setFormError('Please enter a valid email address.'); return; }
    if (message.length > 250) { setFormError('Keep your message under 250 characters.'); return; }
    setFormError('');
    setCurrentStep(3);
  };
  const handoffToStripe = async () => {
    if (isCreatingCheckout) return;
    setIsCreatingCheckout(true);
    setFormError('');
    try {
      const payload = {
        amount,
        currency: 'usd',
        frequency,
        donor_name: donorName.trim(),
        donor_email: donorEmail.trim().toLowerCase(),
        anonymous: !isPublic,
        message: message.trim() || null,
      };
      checkoutAttemptRef.current = checkoutAttempt(checkoutAttemptRef.current, payload, () => globalThis.crypto?.randomUUID?.()
        || `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      const checkout = await createCheckoutSession(payload, checkoutAttemptRef.current.key);
      if (!checkout?.checkout_url || !checkout.checkout_url.startsWith('https://checkout.stripe.com/')) {
        throw new Error('The payment provider returned an invalid checkout link.');
      }
      window.location.assign(checkout.checkout_url);
    } catch (error) {
      setFormError(error?.message || 'We could not start secure checkout. Please try again.');
      setIsCreatingCheckout(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="donation-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="donation-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="donation-modal-title">
        <header className="donation-modal__header">
          <span className="donation-modal__eyebrow">Living the Charge <span> / Give with purpose</span></span>
          <button ref={closeRef} type="button" className="donation-modal__close" onClick={onClose} aria-label="Close donation dialog"><X size={17} strokeWidth={1.75} aria-hidden="true" /></button>
        </header>
        <ol className="donation-modal__progress" aria-label={`Step ${currentStep} of 3`}>
          {['Amount', 'Details', 'Checkout'].map((label, index) => (
            <li key={label} aria-current={currentStep === index + 1 ? 'step' : undefined} className={currentStep > index + 1 ? 'is-complete' : currentStep === index + 1 ? 'is-active' : ''}>
              <span className="donation-modal__step-number" aria-hidden="true">{currentStep > index + 1 ? <Check size={12} strokeWidth={2} /> : `0${index + 1}`}</span>
              {label}
            </li>
          ))}
        </ol>
        <form className="donation-modal__form" noValidate onSubmit={(event) => {
          event.preventDefault();
          if (currentStep === 1) continueToDetails();
          else if (currentStep === 2) continueToCheckout();
          else handoffToStripe();
        }}>
        <div className={`donation-modal__step donation-modal__step--${currentStep}`} key={currentStep}>
          {currentStep === 1 && <>
            <h2 id="donation-modal-title" ref={stepHeadingRef} tabIndex="-1">Choose your contribution</h2>
            <p className="donation-modal__intro">Support the Living the Charge permanent fund.</p>
            <fieldset className="donation-modal__fieldset"><legend>Donation frequency</legend><div className="donation-modal__frequency">
              <button type="button" aria-pressed={frequency === 'one_time'} className={frequency === 'one_time' ? 'is-selected' : ''} onClick={() => setFrequency('one_time')}>One-time</button>
              <button type="button" aria-pressed={frequency === 'monthly'} className={frequency === 'monthly' ? 'is-selected' : ''} onClick={() => setFrequency('monthly')}>Monthly</button>
            </div></fieldset>
            <fieldset className="donation-modal__fieldset"><legend>Amount <span>USD</span></legend><div className="donation-modal__amounts">{amounts.map((value) => <button key={value} type="button" aria-pressed={customAmount === '' && selectedAmount === value} className={customAmount === '' && selectedAmount === value ? 'is-selected' : ''} onClick={() => chooseAmount(value)}><Check size={12} strokeWidth={2} className="donation-modal__amount-check" aria-hidden="true" />{money.format(value)}</button>)}</div></fieldset>
            <label className="donation-modal__label" htmlFor="donation-custom-amount">Custom amount</label>
            <div className="donation-modal__currency"><span aria-hidden="true">$</span><input id="donation-custom-amount" type="number" inputMode="decimal" min={MIN_DONATION} step="0.01" aria-invalid={!!formError} aria-describedby={formError ? 'donation-error donation-amount-help' : 'donation-amount-help'} placeholder="Enter amount" value={customAmount} onChange={changeCustomAmount} /><span>USD</span></div>
            <p className="donation-modal__hint" id="donation-amount-help">Give any amount from $1{frequency === 'monthly' ? ' per month' : ''}.</p>
          </>}
          {currentStep === 2 && <>
            <h2 id="donation-modal-title" ref={stepHeadingRef} tabIndex="-1">Your details</h2>
            <p className="donation-modal__intro">A few details before secure checkout.</p>
            <div className="donation-modal__selected"><span>{frequency === 'monthly' ? 'Monthly contribution' : 'One-time contribution'}</span><strong>{amountLabel}</strong><button type="button" onClick={() => { setFormError(''); setCurrentStep(1); }} aria-label="Change contribution">Change</button></div>
            <label className="donation-modal__label" htmlFor="donor-name">Your full name</label>
            <input className="donation-modal__input" id="donor-name" type="text" required maxLength="150" autoComplete="name" aria-invalid={formError === 'Please enter your full name.'} aria-describedby={formError === 'Please enter your full name.' ? 'donation-error' : undefined} value={donorName} onChange={(event) => { setDonorName(event.target.value); setFormError(''); }} placeholder="Jane Doe" />
            <label className="donation-modal__label" htmlFor="donor-email">Email address</label>
            <input className="donation-modal__input" id="donor-email" type="email" required maxLength="320" autoComplete="email" spellCheck={false} aria-invalid={formError === 'Please enter a valid email address.'} aria-describedby={formError === 'Please enter a valid email address.' ? 'donation-error' : undefined} value={donorEmail} onChange={(event) => { setDonorEmail(event.target.value); setFormError(''); }} placeholder="jane@example.com" />
            <label className="donation-modal__label donation-modal__message-label" htmlFor="donor-message">Message <span>Optional</span><span className="donation-modal__counter" aria-label={`${message.length} of 250 characters`}>{message.length}/250</span></label>
            <textarea className="donation-modal__input donation-modal__textarea" id="donor-message" maxLength="250" aria-describedby="donation-privacy-note" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What inspires you to give?" rows="2" />
            <label className="donation-modal__privacy"><input type="checkbox" checked={!isPublic} onChange={(event) => setIsPublic(!event.target.checked)} aria-describedby="donation-privacy-note" /> Keep my contribution private</label>
            <p className="donation-modal__privacy-note" id="donation-privacy-note">{isPublic ? 'Your name and message will be public after payment. Select above to keep them private.' : 'Your name and message will not be displayed publicly.'}</p>
          </>}
          {currentStep === 3 && <>
            <h2 id="donation-modal-title" ref={stepHeadingRef} tabIndex="-1">Review your contribution</h2>
            <p className="donation-modal__intro">One more step toward lasting opportunity.</p>
            <div className="donation-modal__review">
              <span className="donation-modal__eyebrow">{frequency === 'monthly' ? 'Monthly contribution' : 'One-time contribution'}</span>
              <p className="donation-modal__checkout-amount">{amountLabel}<span>{frequency === 'monthly' ? 'USD / month' : 'USD'}</span></p>
              <p className="donation-modal__hint">Living the Charge permanent fund</p>
              <dl className="donation-modal__review-details"><dt>Name</dt><dd>{donorName}</dd><dt>Email</dt><dd>{donorEmail}</dd></dl>
            </div>
            <div className="donation-modal__checkout-note"><strong>{isPublic ? 'Public contribution' : 'Private contribution'}</strong><span>{isPublic ? 'Your name and message will appear after payment.' : 'Your name and message will not be displayed publicly.'}</span></div>
            <p className="donation-modal__hint">Next, you’ll enter your payment details on Stripe to complete your {frequency === 'monthly' ? 'monthly contribution' : 'donation'}.</p>
          </>}
        </div>
        <footer className="donation-modal__footer">
          {formError && <p className="donation-modal__error" id="donation-error" role="alert">{formError}{currentStep === 3 && <span> Try again, or go back to review your details.</span>}</p>}
          <div className="donation-modal__actions">
            {currentStep > 1 && <button type="button" className="donation-modal__back" disabled={isCreatingCheckout} onClick={() => { setFormError(''); setCurrentStep(currentStep - 1); }}><ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" /> Back</button>}
            <button type="submit" className="donation-modal__submit" disabled={isCreatingCheckout}>
              {isCreatingCheckout && <LoaderCircle size={15} strokeWidth={1.75} className="donation-modal__loader" aria-hidden="true" />}
              {currentStep === 1 ? 'Continue' : currentStep === 2 ? 'Continue to checkout' : 'Continue to Stripe'}
              {!isCreatingCheckout && <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />}
            </button>
          </div>
          <p className="donation-modal__trust" role="status"><LockKeyhole size={12} strokeWidth={1.75} aria-hidden="true" />{isCreatingCheckout ? 'Opening secure checkout…' : 'Secure checkout by Stripe'}</p>
        </footer>
        </form>
      </div>
      <style>{`
        .donation-modal-backdrop { position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; padding: 24px 16px; background: rgba(20, 20, 20, .52); backdrop-filter: blur(6px); }
        .donation-modal {
          --color-primary: #242424; --color-bg-deep: #161616; --color-text: #1c1c1c; --color-text-muted: #6f6f6f; --color-border: #dadada; --bg-surface: #fff; --color-bg: #f5f5f3;
          --radius-sm: 8px;
          --donation-space-xs: .5rem; --donation-space-sm: .75rem; --donation-space-md: 1rem; --donation-space-lg: 1.25rem; --donation-space-xl: 2.5rem;
          --donation-text-sm: .75rem; --donation-text-md: .875rem; --donation-text-lg: 1rem;
          --donation-error: #a12626;
          position: relative; display: flex; flex-direction: column; width: min(100%, 620px); max-height: calc(100dvh - 48px);
          border: 1px solid #e8e8e8; border-radius: 12px; background: var(--bg-surface); box-shadow: 0 20px 60px rgba(0, 0, 0, .14); color: var(--color-text); font-family: var(--body-sans); line-height: 1.5;
        }
        .donation-modal button, .donation-modal input, .donation-modal textarea { font-family: inherit; }
        .donation-modal input, .donation-modal textarea { transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease; }
        .donation-modal input.donation-modal__input, .donation-modal textarea.donation-modal__input { border: 1px solid #cbcbcb; border-radius: var(--radius-sm); background: var(--bg-surface); font-size: var(--donation-text-lg); }
        .donation-modal input:focus, .donation-modal textarea:focus { box-shadow: none !important; }
        .donation-modal button { cursor: pointer; box-shadow: none; transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease, box-shadow 150ms ease; }
        .donation-modal svg { flex-shrink: 0; }
        .donation-modal button:focus-visible, .donation-modal input:focus-visible, .donation-modal textarea:focus-visible { outline: 2px solid rgba(30, 30, 30, .18); outline-offset: 2px; }
        .donation-modal__header { display: flex; align-items: center; justify-content: space-between; gap: var(--donation-space-xs); padding: 16px 24px 0 var(--donation-space-xl); }
        .donation-modal__eyebrow { color: #222; font-size: .8125rem; font-weight: 600; }
        .donation-modal__header .donation-modal__eyebrow span { color: var(--color-text-muted); font-weight: 400; }
        .donation-modal__close { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border: 0; border-radius: 6px; background: transparent; color: #777; }
        .donation-modal__progress { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 12px var(--donation-space-xl) 0; padding: 0; list-style: none; }
        .donation-modal__progress li { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #e8e8e8; color: #8a8a8a; font-size: .8125rem; font-weight: 500; }
        .donation-modal__progress .is-active { border-color: var(--color-primary); color: var(--color-primary); font-weight: 600; }
        .donation-modal__progress .is-complete { color: var(--color-primary); }
        .donation-modal__step-number { display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid #dadada; border-radius: 6px; font-size: .6875rem; font-weight: 500; font-variant-numeric: tabular-nums; }
        .donation-modal__progress .is-active .donation-modal__step-number { background: var(--color-primary); border-color: var(--color-primary); color: var(--bg-surface); }
        .donation-modal__progress .is-complete .donation-modal__step-number { border-color: var(--color-primary); }
        .donation-modal__form { display: flex; flex-direction: column; min-height: 0; }
        .donation-modal__step { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 24px var(--donation-space-xl) 20px; scrollbar-gutter: stable; }
        .donation-modal h2 { margin: 0 0 6px; color: var(--color-text); font-family: var(--editorial-serif); font-size: clamp(1.75rem, 3vw, 2rem); font-weight: 400; line-height: 1.08; letter-spacing: -.02em; text-wrap: balance; }
        .donation-modal h2:focus { outline: none; }
        .donation-modal__intro { margin: 0 0 20px; color: var(--color-text-muted); font-size: .9375rem; line-height: 1.5; text-wrap: pretty; }
        .donation-modal__fieldset { min-width: 0; margin: 0 0 20px; padding: 0; border: 0; }
        .donation-modal legend, .donation-modal__label { display: block; width: 100%; margin-bottom: var(--donation-space-xs); color: var(--color-text); font-size: var(--donation-text-md); font-weight: 600; }
        .donation-modal legend span { float: right; }
        .donation-modal legend span, .donation-modal__label span { color: var(--color-text-muted); font-size: var(--donation-text-sm); font-weight: 400; }
        .donation-modal__frequency { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: var(--radius-sm); background: #f4f4f2; }
        .donation-modal__frequency button { min-height: 40px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--color-text-muted); font-size: var(--donation-text-md); font-weight: 500; }
        .donation-modal__frequency button.is-selected { border-color: #b8b8b8; background: var(--bg-surface); color: var(--color-text); box-shadow: 0 1px 2px rgba(0, 0, 0, .04); }
        .donation-modal__amounts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--donation-space-xs); }
        .donation-modal__amounts button { position: relative; min-height: 60px; border: 1px solid #d2d2d2; border-radius: var(--radius-sm); background: var(--bg-surface); color: #1f1f1f; font-size: 1.125rem; font-weight: 600; font-variant-numeric: tabular-nums; }
        .donation-modal__amounts button.is-selected { border: 1.5px solid var(--color-primary); background: #fafaf8; }
        .donation-modal__amount-check { position: absolute; top: 6px; right: 6px; visibility: hidden; }
        .donation-modal__amounts button.is-selected .donation-modal__amount-check { visibility: visible; }
        .donation-modal__currency { display: flex; align-items: center; gap: var(--donation-space-xs); min-height: 52px; padding-inline: 16px; border: 1px solid #cbcbcb; border-radius: var(--radius-sm); background: var(--bg-surface); transition: border-color 150ms ease, box-shadow 150ms ease; }
        .donation-modal__currency > span { color: var(--color-text-muted); font-size: var(--donation-text-md); }
        .donation-modal__currency:focus-within { border-color: #333; box-shadow: 0 0 0 2px rgba(30, 30, 30, .08); }
        .donation-modal__currency input { min-width: 0; width: 100%; min-height: 50px; border: 0; background: transparent; color: var(--color-text); font-size: var(--donation-text-lg); }
        .donation-modal__currency input:focus-visible { outline: none; }
        .donation-modal__input { display: block; width: 100%; min-height: 50px; margin-bottom: 12px; padding: 12px 14px; border: 1px solid #cbcbcb; border-radius: var(--radius-sm); background: var(--bg-surface); color: var(--color-text); font-size: var(--donation-text-lg); line-height: 1.5; }
        .donation-modal input::placeholder, .donation-modal textarea::placeholder { color: var(--color-text-muted); opacity: 1; }
        .donation-modal input[aria-invalid="true"] { border-color: var(--donation-error); }
        .donation-modal__currency:has([aria-invalid="true"]) { border-color: var(--donation-error); }
        .donation-modal__textarea { resize: vertical; min-height: 80px; }
        .donation-modal__message-label { display: flex; align-items: baseline; gap: var(--donation-space-xs); }
        .donation-modal__counter { margin-inline-start: auto; font-variant-numeric: tabular-nums; }
        .donation-modal__privacy { display: flex; align-items: center; gap: var(--donation-space-sm); min-height: 44px; color: var(--color-text); font-size: var(--donation-text-md); cursor: pointer; }
        .donation-modal__privacy input { flex-shrink: 0; width: 16px; height: 16px; accent-color: var(--color-primary); }
        .donation-modal__privacy-note { margin: 0; padding-inline-start: 30px; color: var(--color-text-muted); font-size: var(--donation-text-sm); line-height: 1.5; text-wrap: pretty; }
        .donation-modal__hint { margin: var(--donation-space-xs) 0 0; color: var(--color-text-muted); font-size: var(--donation-text-sm); line-height: 1.5; text-wrap: pretty; }
        .donation-modal__selected { display: flex; align-items: center; flex-wrap: wrap; gap: var(--donation-space-xs); margin: 0 0 var(--donation-space-lg); padding: 8px 12px; border-radius: var(--radius-sm); background: var(--color-bg); }
        .donation-modal__selected > span { color: var(--color-text-muted); font-size: var(--donation-text-sm); }
        .donation-modal__selected strong { margin-inline-start: auto; color: var(--color-primary); font-size: var(--donation-text-lg); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
        .donation-modal__selected button { min-height: 44px; padding-inline: var(--donation-space-xs); border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-primary); font-size: var(--donation-text-sm); text-decoration: underline; text-underline-offset: 3px; }
        .donation-modal__review { padding: 20px; border: 1px solid #e8e8e8; border-radius: var(--radius-sm); background: #fafaf8; }
        .donation-modal__checkout-amount { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--donation-space-xs); margin: var(--donation-space-xs) 0 0; color: var(--color-primary); font-size: clamp(2rem, 6vw, 3rem); font-weight: 600; line-height: 1.2; letter-spacing: -.03em; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
        .donation-modal__checkout-amount span { color: var(--color-text-muted); font-size: var(--donation-text-sm); font-weight: 400; letter-spacing: normal; }
        .donation-modal__review-details { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--donation-space-xs) var(--donation-space-md); margin-top: var(--donation-space-lg); padding-top: var(--donation-space-md); border-top: 1px solid var(--color-border); font-size: var(--donation-text-sm); }
        .donation-modal__review-details dt { color: var(--color-text-muted); }
        .donation-modal__review-details dd { margin: 0; text-align: end; overflow-wrap: anywhere; }
        .donation-modal__checkout-note { display: grid; gap: 4px; margin: var(--donation-space-lg) 0 var(--donation-space-md); }
        .donation-modal__checkout-note strong { font-size: var(--donation-text-md); font-weight: 600; }
        .donation-modal__checkout-note span { color: var(--color-text-muted); font-size: var(--donation-text-sm); }
        .donation-modal__footer { flex-shrink: 0; padding: 16px var(--donation-space-xl) 14px; border-top: 1px solid #e8e8e8; }
        .donation-modal__error { margin: 0 0 var(--donation-space-sm); color: var(--donation-error); font-size: var(--donation-text-sm); line-height: 1.5; overflow-wrap: anywhere; }
        .donation-modal__actions { display: flex; align-items: center; gap: 12px; }
        .donation-modal__back { display: inline-flex; align-items: center; justify-content: center; gap: var(--donation-space-xs); min-height: 48px; padding-inline: var(--donation-space-xs); border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-primary); font-size: var(--donation-text-md); font-weight: 600; }
        .donation-modal__submit { display: flex; flex: 1; align-items: center; justify-content: center; gap: 8px; min-width: 0; min-height: 52px; padding: 12px 16px; border: 1px solid var(--color-primary); border-radius: var(--radius-sm); background: var(--color-primary); color: var(--bg-surface); font-size: .9375rem; font-weight: 600; line-height: 1.5; }
        .donation-modal button:disabled { cursor: wait; opacity: .65; }
        .donation-modal__trust { display: flex; align-items: center; justify-content: center; gap: var(--donation-space-xs); margin: var(--donation-space-sm) 0 0; color: var(--color-text-muted); font-size: .75rem; line-height: 1.5; }
        @media (hover: hover) {
          .donation-modal__close:hover, .donation-modal__back:not(:disabled):hover, .donation-modal__selected button:hover { background: #f3f3f3; color: var(--color-primary); }
          .donation-modal__amounts button:hover, .donation-modal__frequency button:hover { border-color: var(--color-primary); }
          .donation-modal__submit:not(:disabled):hover { background: #171717; border-color: #171717; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .donation-modal__step { animation: donationStepIn var(--transition-fast) both; }
          .donation-modal__loader { animation: donationSpinner 1s linear infinite; }
          @keyframes donationStepIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes donationSpinner { to { transform: rotate(360deg); } }
        }
        @media (max-width: 767px) {
          .donation-modal { width: calc(100vw - 32px); }
        }
        @media (max-width: 480px) {
          .donation-modal-backdrop { padding: 8px; }
          .donation-modal { --donation-space-xl: 1rem; width: calc(100vw - 16px); max-height: calc(100dvh - 16px); border-radius: 10px; }
          .donation-modal__header { padding-inline: var(--donation-space-md) var(--donation-space-xs); }
          .donation-modal__header .donation-modal__eyebrow span { display: none; }
          .donation-modal__progress { gap: var(--donation-space-xs); }
          .donation-modal__progress li { gap: 4px; }
          .donation-modal__amounts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .donation-modal__step { padding-top: 20px; }
          .donation-modal__amounts button { min-height: 52px; }
          .donation-modal__footer { padding-bottom: max(var(--donation-space-md), env(safe-area-inset-bottom)); }
          .donation-modal__actions { gap: var(--donation-space-xs); }
        }
        @media (forced-colors: active) { .donation-modal button:focus-visible, .donation-modal input:focus-visible, .donation-modal textarea:focus-visible, .donation-modal__currency:focus-within { outline-color: Highlight; } }
      `}</style>
    </div>
  );
}
