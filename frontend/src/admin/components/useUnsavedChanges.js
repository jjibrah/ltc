import { useEffect, useRef, useState } from 'react';
// In-memory only. Files, draft text and financial references never go into browser storage.
const drafts = new Map();
export const clearAdminDrafts = () => drafts.clear();
if (typeof window !== 'undefined') window.addEventListener('ltc:auth-logout', clearAdminDrafts);
export const discardAdminDraft = key => drafts.delete(key);
export function useUnsavedChanges({ key, dirty, draft, restore, ready = true }) {
  const restoredKey = useRef(null);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!ready) { restoredKey.current = null; return; }
    if (restoredKey.current === key) return;
    restoredKey.current = key;
    const saved = drafts.get(key);
    setRestored(Boolean(saved));
    if (saved) restore(saved);
  }, [key, ready, restore]);
  useEffect(() => { if (!ready) return; if (dirty) drafts.set(key, draft); else drafts.delete(key); }, [key, ready, dirty, draft]);
  useEffect(() => {
    if (!ready || !dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    const confirm = event => { if (!window.confirm('You have unsaved edits. Leave this page? They will be kept in this tab.')) event.preventDefault(); };
    const navigation = event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]'); if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href); if (url.pathname === location.pathname && url.search === location.search) return;
      if (!window.confirm('You have unsaved edits. Leave this page? They will be kept in this tab.')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', navigation, true); window.addEventListener('ltc:confirm-navigation', confirm);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', navigation, true); window.removeEventListener('ltc:confirm-navigation', confirm); };
  }, [ready, dirty]);
  return { restored: restored && dirty, discard: () => { discardAdminDraft(key); setRestored(false); } };
}
