import { useState, useEffect } from 'react';
import { AdminModal } from '../components/AdminPrimitives';

export default function SendConfirmModal({ isOpen, onClose, onConfirm, subscriberCount, newsletterTitle }) {
  const [phase, setPhase] = useState('confirm'); // 'confirm' | 'sending' | 'done' | 'failed' | 'blocked'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) { setPhase('confirm'); setErrorMsg(''); }
  }, [isOpen]);

  const handleConfirm = async () => {
    setPhase('sending');
    try {
      const submitted = await onConfirm();
      // An editor validation/save failure means no send was submitted.
      // Keep its existing inline feedback visible and release this UI's busy state.
      if (submitted === false || submitted?.submitted === false) {
        setErrorMsg(submitted?.error || 'The newsletter was not submitted. Review your draft before sending.');
        setPhase('blocked');
      }
    } catch (err) {
      setPhase('failed');
      setErrorMsg(err.message || 'Send failed.');
    }
  };

  const renderBody = () => {
    if (phase === 'confirm') {
      return (
        <div className="newsletter-notice">
          This will send the newsletter to <strong>{subscriberCount} active subscriber{subscriberCount !== 1 ? 's' : ''}</strong>. This action cannot be undone.
        </div>
      );
    }
    if (phase === 'sending') {
      return (
        <div className="admin-state" role="status">
          <div>Sending… this may take a few minutes.</div>
          <div className="admin-form-help">Please keep this window open.</div>
        </div>
      );
    }
    if (phase === 'done') {
      return (
        <div className="newsletter-notice newsletter-notice--success" role="status">
          Newsletter sent.
        </div>
      );
    }
    if (phase === 'failed' || phase === 'blocked') {
      return (
        <div className="newsletter-notice newsletter-notice--error" role="alert">
          <strong>Error:</strong> {errorMsg || 'An unexpected error occurred.'}
        </div>
      );
    }
  };

  const renderActions = () => {
    if (phase === 'confirm') {
      return (
        <>
          <button className="admin-secondary-button" onClick={onClose}>Cancel</button>
          <button className="admin-primary-button" onClick={handleConfirm}>Send now</button>
        </>
      );
    }
    if (phase === 'done' || phase === 'failed' || phase === 'blocked') {
      return (
        <button className="admin-secondary-button" onClick={onClose}>Close</button>
      );
    }
    return null; // no actions when sending
  };

  const title = phase === 'confirm' ? 'Send newsletter?' :
                phase === 'sending' ? 'Sending newsletter…' :
                phase === 'done' ? 'Newsletter sent' : phase === 'blocked' ? 'Newsletter not submitted' : 'Send failed';

  return (
    <AdminModal 
      open={isOpen} 
      title={title} 
      description={newsletterTitle ? `"${newsletterTitle}"` : null}
      onClose={phase === 'sending' ? () => {} : onClose}
      actions={renderActions()}
    >
      {renderBody()}
    </AdminModal>
  );
}
