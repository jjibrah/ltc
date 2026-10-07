import { useEffect, useState } from 'react';
import { AdminModal } from '../components/AdminPrimitives';
import { apiRequest } from '../../shared/api/client';

export default function PreviewModal({ isOpen, onClose, previewPath }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  

  useEffect(() => {
    if (!isOpen || !previewPath) return undefined;
    let objectUrl;
    let cancelled = false;

    apiRequest(previewPath, { auth: true, responseType: 'blob' })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setError('');
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || 'Unable to load preview.');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
    };
  }, [isOpen, previewPath]);

  return (
    <AdminModal open={isOpen} title="Email preview" description="Preview the email content before sending." className="admin-modal--preview" onClose={onClose} actions={<button className="admin-secondary-button" type="button" onClick={onClose}>Close preview</button>}>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="Newsletter Preview"
              className="newsletter-preview-frame"
              sandbox="allow-same-origin"
              onLoad={event => {
                // Keyboard events inside an iframe do not bubble into the dialog.
                event.currentTarget.contentDocument?.addEventListener('keydown', keyEvent => {
                  if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); onClose(); }
                });
              }}
            />
          ) : error ? (
            <div className="newsletter-notice newsletter-notice--error" role="alert">{error}</div>
          ) : (
            <div className="admin-state" role="status">
              Loading preview…
            </div>
          )}
    </AdminModal>
  );
}
