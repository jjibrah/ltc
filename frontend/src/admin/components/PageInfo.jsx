import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function PageInfo({ title, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef(null);
  const trigger = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const dismiss = event => {
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      } else if (!container.current?.contains(event.target)) setOpen(false);
    };
    const otherOpened = event => { if (event.detail !== id) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('admin:info-open', otherOpened);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('admin:info-open', otherOpened);
    };
  }, [open, id]);

  return <div className="admin-page-info" ref={container}>
    <button ref={trigger} className="admin-info-button" type="button" aria-label={`About ${title.toLowerCase()}`} aria-expanded={open} aria-controls={id} onClick={() => {
      if (!open) document.dispatchEvent(new CustomEvent('admin:info-open', { detail: id }));
      setOpen(value => !value);
    }}><Info size={17} aria-hidden="true" /></button>
    <div id={id} className="admin-info-panel" hidden={!open}>{children}</div>
  </div>;
}
