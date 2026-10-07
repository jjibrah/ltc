import { useEffect, useId, useRef, useState } from 'react';
import { Copy, X } from 'lucide-react';
import PageInfo from './PageInfo';

export function PageHeader({ title, description, action, help, subtitle }) {
  return <header className="admin-page-header"><div className="admin-page-heading"><div className="admin-title-row"><h1>{title}</h1>{help && <PageInfo title={title}>{help}</PageInfo>}</div>{(subtitle || description) && <p>{subtitle || description}</p>}</div>{action && <div className="admin-page-actions">{action}</div>}</header>;
}

export function AdminCard({ children, className = '' }) { return <section className={`admin-card ${className}`}>{children}</section>; }

export function AdminBadge({ children, tone = '' }) { return <span className={`admin-badge${tone ? ` admin-badge--${tone}` : ''}`}>{children}</span>; }

export function AdminEmptyState({ title, description, action }) { return <div className="admin-empty"><h3>{title}</h3><p>{description}</p>{action}</div>; }

export function AdminUnavailable({ title, description }) { return <div className="admin-unavailable"><h3>{title}</h3><p>{description}</p></div>; }

export function AdminModal({ open, title, description, onClose, children, actions, className = '', guardChanges = true }) {
  const dirtyRef = useRef(false);
  const snapshotRef = useRef('');
  const requestClose = () => { if (guardChanges && dirtyRef.current && !window.confirm('Discard unsaved changes in this dialog?')) return; dirtyRef.current = false; onClose(); };
  const id = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    const snapshot = () => JSON.stringify([...dialog.querySelectorAll('input,select,textarea')].map(field => [field.type, field.checked, field.value]));
    dirtyRef.current = false; snapshotRef.current = snapshot();
    const changed = () => { dirtyRef.current = snapshot() !== snapshotRef.current; };
    const warn = event => { if (guardChanges && dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } };
    dialog.addEventListener('input', changed); dialog.addEventListener('change', changed); window.addEventListener('beforeunload', warn);
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.removeEventListener('input', changed); dialog.removeEventListener('change', changed); window.removeEventListener('beforeunload', warn);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
      previousFocusRef.current = null;
    };
  }, [open, guardChanges]);
  if (!open) return null;
  return <dialog ref={dialogRef} className={`admin-modal${className ? ` ${className}` : ''}`} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} onClickCapture={event => { const button = event.target.closest?.('button'); if (guardChanges && dirtyRef.current && button?.textContent.trim() === 'Cancel') { if (!window.confirm('Discard unsaved changes in this dialog?')) { event.preventDefault(); event.stopPropagation(); } else dirtyRef.current = false; } }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); requestClose(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), iframe, [tabindex="0"]')].filter(element => element.getClientRects().length && !element.closest('[inert]'));
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); requestClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) requestClose();
  }}>
      <div className="admin-modal__header"><div><h2 id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div><button ref={closeRef} className="admin-modal__close" type="button" aria-label="Close dialog" onClick={requestClose}><X size={16} aria-hidden="true" /></button></div>
      <div className="admin-modal__body">{children}</div>
      {actions && <div className="admin-modal__actions">{actions}</div>}
  </dialog>;
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'primary', loading = false, onClose, onConfirm }) {
  return <AdminModal open={open} title={title} description={description} onClose={loading ? () => {} : onClose} actions={<><button className="admin-secondary-button" type="button" onClick={onClose} disabled={loading}>{cancelLabel}</button><button className={`admin-primary-button${variant === 'danger' ? ' admin-confirm-danger' : ''}`} type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Working…' : confirmLabel}</button></>} />;
}

export function Identifier({ value, label = 'identifier' }) {
  const [feedback, setFeedback] = useState('');
  if (!value) return <span>Not recorded</span>;
  const full = String(value);
  const copy = async () => { try { await navigator.clipboard.writeText(full); setFeedback('Copied'); } catch { setFeedback('Copy unavailable. Select the full identifier.'); } };
  return <span className="admin-identifier"><code title={full} aria-label={full}>{full.length > 18 ? `${full.slice(0, 8)}…${full.slice(-6)}` : full}</code><button className="admin-icon-button" type="button" onClick={copy} aria-label={`Copy full ${label}`}><Copy size={14} aria-hidden="true" /></button><span className="operations-detail" role="status">{feedback}</span>{feedback.startsWith('Copy unavailable') && <code className="admin-identifier__full">{full}</code>}</span>;
}
