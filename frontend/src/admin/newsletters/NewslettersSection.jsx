import { Eye, Link2, Paperclip, Send, X } from 'lucide-react';
import ListPagination from '../components/ListPagination';
import { listQuery } from '../../shared/api/listQuery';
import { createSaveQueue } from '../../shared/api/saveQueue';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import toast from 'react-hot-toast';
import DeleteModal from './DeleteModal';
import PreviewModal from './PreviewModal';
import SendConfirmModal from './SendConfirmModal';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';
import { AdminCard, AdminEmptyState, AdminBadge, PageHeader } from '../components/AdminPrimitives';
import { useAuth } from '../../app/providers/AuthProvider';

function ToolBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active === undefined ? undefined : Boolean(active)}
      className={`admin-icon-button ${active ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }) {
  if (!editor) return null;
  return (
    <div className="admin-toolbar newsletter-editor-toolbar" role="group" aria-label="Email formatting">
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><b>B</b></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><i>I</i></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">• List</ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">1. List</ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">"</ToolBtn>
      <ToolBtn
        onClick={() => {
          const url = window.prompt('URL:');
          if (url) editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
        }}
        active={editor.isActive('link')}
        title="Link"
      ><Link2 size={16} aria-hidden="true" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting"><X size={16} aria-hidden="true" /></ToolBtn>
    </div>
  );
}

export default function NewslettersSection() {
  const loadVersion = useRef(0);
  const [page, setPage] = useState(0);
  const { can } = useAuth();
  const [view, setView] = useState('list'); // 'list' | 'compose'
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('drafts'); // 'drafts' | 'sent'
  const [current, setCurrent] = useState(null); // newsletter being composed
  const [saveStatus, setSaveStatus] = useState('');
  const [bannerPreview, setBannerPreview] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const draftRevision = useRef(0);
  const saveQueues = useRef(new Map());
  const autosaveTimer = useRef(null);
  const pollTimer = useRef(null);
  const pollStartedAt = useRef(null);
  const pollInFlight = useRef(false);
  const pendingPatch = useRef({});
  const editorNewsletterId = useRef(null);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const items = await apiRequest(listQuery(endpoints.adminNewsletters.list, { limit: 50, offset: page * 50, group: filter }), { auth: true });
      if (version === loadVersion.current) setNewsletters(items);
    } catch (err) { if (version === loadVersion.current) toast.error(err.message); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Fetch subscriber count ─────────────────────────────────────────────────
  useEffect(() => {
    apiRequest(endpoints.subscriberCount, { auth: true })
      .then((data) => setSubscriberCount(data.count || 0)).catch(() => {});
  }, []);

  // ── TipTap editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: current?.body_html || '',
    editorProps: { attributes: { 'aria-label': 'Email body', role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: updatedEditor }) => {
      scheduleSave({ body_html: updatedEditor.getHTML() });
    },
  });

  // Keep editor content in sync when switching newsletters
  useEffect(() => {
    if (editor && current && editorNewsletterId.current !== current.id) {
      const html = current.body_html || '';
      editorNewsletterId.current = current.id;
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [current, editor]);

  // ── Autosave (1.5s debounce) ───────────────────────────────────────────────
  function scheduleSave(patch) {
    if (!current) return;
    draftRevision.current += 1;
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    clearTimeout(autosaveTimer.current);
    setSaveStatus('Saving…');
    autosaveTimer.current = setTimeout(() => {
      const nextPatch = pendingPatch.current;
      pendingPatch.current = {};
      void doSave(nextPatch).catch(() => {});
    }, 1500);
  }

  async function doSave(patch) {
    if (!current) throw new Error('No newsletter selected');
    setSaveStatus('Saving…');
    const id = current.id;
    const revision = draftRevision.current;
    if (!saveQueues.current.has(id)) saveQueues.current.set(id, createSaveQueue((values) => apiRequest(endpoints.adminNewsletters.detail(id), { method: 'PATCH', auth: true, body: JSON.stringify(values) })));
    try {
      const updated = await saveQueues.current.get(id).enqueue(patch);
      if (revision === draftRevision.current) {
        setCurrent((previous) => previous?.id === id ? { ...previous, ...updated, ...patch } : previous);
        setSaveStatus('Saved ✓');
      }
      return updated;
    } catch (error) {
      pendingPatch.current = { ...patch, ...pendingPatch.current };
      setSaveStatus('Save failed. Your changes are retained; try saving again.');
      throw error;
    }
  }

  async function leaveCompose() {
    clearTimeout(autosaveTimer.current);
    const patch = { ...pendingPatch.current, title: current.title, body_html: editor?.getHTML() || current.body_html || '' };
    pendingPatch.current = {};
    try {
      await doSave(patch);
      setView('list');
      await fetchList();
    } catch (error) { toast.error(error.message); }
  }

  useEffect(() => {
    const warn = (event) => {
      if (saveStatus === 'Saving…' || saveStatus.startsWith('Save failed')) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  // ── Create new draft ───────────────────────────────────────────────────────
  const createDraft = async () => {
    try {
      const draft = await apiRequest(endpoints.adminNewsletters.list, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ title: '', body_html: '' }),
      });
      setCurrent(draft);
      setBannerPreview(null); setAttachments([]);
      setView('compose');
      { setFilter('drafts'); setPage(0); };
    } catch (err) { toast.error(err.message); }
  };

  // ── Open compose for existing draft ───────────────────────────────────────
  const openDraft = (nl) => {
    setCurrent(nl);
    setBannerPreview(nl.banner_url || null);
    setAttachments(nl.attachments || []);
    setView('compose');
  };

  // ── Banner upload ──────────────────────────────────────────────────────────
  const handleBannerChange = async (file) => {
    if (!file || !current) return;
    setBannerPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append('banner', file);
    try {
      const updated = await apiRequest(endpoints.adminNewsletters.banner(current.id), {
        method: 'POST', auth: true, body: fd,
      });
      setCurrent((previous) => previous?.id === updated.id ? { ...previous, banner_path: updated.banner_path, banner_url: updated.banner_url } : previous);
      toast.success('Banner uploaded');
    } catch (err) { toast.error(err.message); }
  };

  // ── Attachment upload ──────────────────────────────────────────────────────
  const handleAttachmentAdd = async (files) => {
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const attachment = await apiRequest(endpoints.adminNewsletters.attachments(current.id), {
          method: 'POST', auth: true, body: fd,
        });
        setAttachments(prev => [...prev, attachment]);
        toast.success(`${file.name} attached`);
      } catch (err) { toast.error(err.message); }
    }
  };

  const handleAttachmentRemove = async (attId) => {
    try {
      await apiRequest(endpoints.adminNewsletters.attachment(current.id, attId), {
        method: 'DELETE', auth: true,
      });
      setAttachments(prev => prev.filter(a => a.id !== attId));
    } catch (err) { toast.error(err.message); }
  };

  // ── Delete newsletter ──────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    setIsDeleting(true);
    try {
      await apiRequest(endpoints.adminNewsletters.detail(deleteModal.item.id), {
        method: 'DELETE', auth: true,
      });
      toast.success('Newsletter deleted');
      setDeleteModal({ open: false, item: null });
      fetchList();
    } catch (err) { toast.error(err.message); }
    finally { setIsDeleting(false); }
  };

  // ── Send newsletter ────────────────────────────────────────────────────────
  const triggerSend = async () => {
    if (!current?.title?.trim() || !editor?.getHTML()?.replace(/<[^>]*>/g, '').trim()) {
      toast.error('Add a title and body before sending.');
      return { submitted: false, error: 'Add a title and body before sending.' };
    }
    clearTimeout(autosaveTimer.current);
    const pending = pendingPatch.current;
    pendingPatch.current = {};
    try {
      await doSave({ ...pending, title: current.title, body_html: editor.getHTML() });
    } catch {
      pendingPatch.current = { ...pending, ...pendingPatch.current };
      toast.error('Save failed. Try again before sending.');
      return { submitted: false, error: 'Save failed. Your draft changes are retained. Close this dialog and try saving again.' };
    }
    await apiRequest(endpoints.adminNewsletters.send(current.id), { method: 'POST', auth: true });
    pollStartedAt.current = Date.now();

    const poll = async () => {
      if (pollInFlight.current) return;
      if (Date.now() - pollStartedAt.current > 5 * 60 * 1000) {
        toast.error('Send verification timed out. Check its status before sending again.');
        setSendModal(false);
        return;
      }
      pollInFlight.current = true;
      try {
        const sd = await apiRequest(endpoints.adminNewsletters.status(current.id), { auth: true, cacheTtl: 0 });
        if (sd.status === 'sent') {
          toast.success(`Accepted by the email provider for ${sd.sent_count} subscribers.`);
          setSendModal(false); setView('list'); fetchList();
        } else if (sd.status === 'failed') {
          toast.error(`Send failed: ${sd.send_error || 'The newsletter could not be sent.'}`);
          setSendModal(false);
        } else {
          pollTimer.current = setTimeout(poll, 2000);
        }
      } catch {
        toast.error('Unable to verify send status. Check its status before sending again.');
        setSendModal(false);
      } finally { pollInFlight.current = false; }
    };
    poll();
    return true;
  };

  useEffect(() => () => { clearTimeout(pollTimer.current); clearTimeout(autosaveTimer.current); }, []);

  const filtered = newsletters.filter(n =>
    filter === 'drafts' ? (n.status === 'draft' || n.status === 'failed')
      : (n.status === 'sent' || n.status === 'sending')
  );

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const toneStatus = (s) => {
    if (s === 'draft') return '';
    if (s === 'sending') return 'warning';
    if (s === 'sent') return 'success';
    if (s === 'failed') return 'danger';
    return '';
  };

  // ── COMPOSE VIEW ──────────────────────────────────────────────────────────
  if (view === 'compose' && current) {
    const previewPath = endpoints.adminNewsletters.preview(current.id);
    return (
      <div className="admin-page newsletter-compose-page">
        <button className="admin-back-link" type="button" onClick={leaveCompose}>Back to newsletters</button>
        <PageHeader title="Edit newsletter" help="Edit your draft, check the save status and preview the email before reviewing its audience and sending." action={<>
          <button className="admin-secondary-button" type="button" onClick={() => setPreviewModal(true)}><Eye size={16} aria-hidden="true" /> Preview</button>
          {can('newsletters.send') && <button className="admin-primary-button" type="button" onClick={() => setSendModal(true)}><Send size={16} aria-hidden="true" /> Send newsletter</button>}
        </>} />
        <div className="newsletter-save-status" role="status" aria-live="polite">{saveStatus}</div>
        <div className="newsletter-compose-grid">
          <div>
            <div className="admin-form-field newsletter-title-field">
              <label htmlFor="newsletter-title">Newsletter title</label>
              <input id="newsletter-title" type="text" placeholder="Newsletter title…" value={current.title || ''}
                onChange={e => { setCurrent(c => ({ ...c, title: e.target.value })); scheduleSave({ title: e.target.value }); }} />
            </div>
            <section aria-label="Email body">
              <h2 className="admin-section-title">Email body</h2>
              <div className="newsletter-editor-shell">
                <EditorToolbar editor={editor} />
                <EditorContent editor={editor} className="newsletter-editor-content" />
              </div>
            </section>
          </div>
          <div className="newsletter-assets">
            <AdminCard className="admin-form-field">
              <label htmlFor="banner-upload">Banner image</label>
              {bannerPreview && <div className="newsletter-banner">
                <img src={bannerPreview} alt="Newsletter banner" />
                <button disabled={saveStatus === 'Saving…'} type="button" onClick={async () => { try { await doSave({ banner_image: null }); setBannerPreview(null); } catch (error) { toast.error(error.message); } }} className="admin-secondary-button admin-danger-outline"><X size={16} aria-hidden="true" /> Remove banner</button>
              </div>}
              <input className="newsletter-upload" type="file" accept="image/*" id="banner-upload" onChange={e => e.target.files[0] && handleBannerChange(e.target.files[0])} />
            </AdminCard>
            <AdminCard className="admin-form-field">
              <label htmlFor="attach-upload">Attachments</label>
              <p className="admin-form-help" id="attachment-limits">Max 8 MB per file · 20 MB total</p>
              {attachments.map(att => <div key={att.id} className="newsletter-attachment">
                <span><Paperclip size={15} aria-hidden="true" /> {att.original_filename}</span>
                <button className="admin-icon-button admin-icon-button--danger" type="button" aria-label={`Remove attachment ${att.original_filename}`} onClick={() => handleAttachmentRemove(att.id)}><X size={16} aria-hidden="true" /></button>
              </div>)}
              <input className="newsletter-upload" type="file" multiple id="attach-upload" aria-describedby="attachment-limits" onChange={e => handleAttachmentAdd(Array.from(e.target.files))} />
            </AdminCard>
          </div>
        </div>

        <PreviewModal isOpen={previewModal} onClose={() => setPreviewModal(false)} previewPath={previewPath} />
        <SendConfirmModal
          isOpen={sendModal}
          onClose={() => { setSendModal(false); clearTimeout(pollTimer.current); }}
          onConfirm={triggerSend}
          subscriberCount={subscriberCount}
          newsletterTitle={current.title}
        />
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">
      <PageHeader 
        title="Newsletters" 
        help="Create drafts, preview content and review the audience before sending. Sending and delivery are separate states."
        action={can('newsletters.create') ? <button className="admin-primary-button" onClick={createDraft}>New newsletter</button> : null}
      />

      <AdminCard>
        <div className="admin-card__body">
          <div className="admin-tabs">
            {['drafts', 'sent'].map(f => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f === 'drafts' ? 'Drafts' : 'Sent'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="admin-state" role="status">Loading…</div>
          ) : filtered.length === 0 ? (
            <AdminEmptyState title={`No ${filter === 'drafts' ? 'drafts' : 'sent newsletters'} yet`} description="" />
          ) : (
            <div className="profile-links-list">
              {filtered.map(nl => (
                <div key={nl.id} className="profile-link-row newsletter-row">
                  <div className="newsletter-row-identity">
                    <strong>
                      {nl.title || <em>Untitled draft</em>}
                    </strong>
                    <span>
                      {nl.status === 'sent'
                        ? `Sent ${fmtDate(nl.sent_at)} · ${nl.recipient_count ?? 0} recipients`
                        : `Updated ${fmtDate(nl.updated_at)}`}
                    </span>
                  </div>
                  <AdminBadge tone={toneStatus(nl.status)}>{nl.status}</AdminBadge>
                  <div className="admin-action-row">
                    {nl.status === 'sent' || nl.status === 'sending' ? (
                      <button className="admin-secondary-button" onClick={() => { setCurrent(nl); setPreviewModal(true); }}>Preview</button>
                    ) : (
                      <>
                        {can('newsletters.update') && <button className="admin-secondary-button" onClick={() => openDraft(nl)}>Edit</button>}
                        {can('newsletters.delete') && <button className="admin-secondary-button admin-danger-outline" onClick={() => setDeleteModal({ open: true, item: nl })}>Delete</button>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminCard>

      <ListPagination page={page} setPage={setPage} count={newsletters.length} loading={loading} label="newsletters" />

      {/* Preview for sent newsletters from list */}
      {current && (
        <PreviewModal
          isOpen={previewModal}
          onClose={() => { setPreviewModal(false); setCurrent(null); }}
          previewPath={endpoints.adminNewsletters.preview(current.id)}
        />
      )}

      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={confirmDelete}
        itemName={deleteModal.item?.title || 'this draft'}
        isDeleting={isDeleting}
        title="Delete Newsletter?"
      />
    </div>
  );
}
