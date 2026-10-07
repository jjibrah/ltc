import { useUnsavedChanges } from '../components/useUnsavedChanges';
import ListPagination from '../components/ListPagination';
import { listQuery } from '../../shared/api/listQuery';
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';
import { AdminCard, AdminEmptyState, AdminBadge, ConfirmDialog, PageHeader } from '../components/AdminPrimitives';
import { useAuth } from '../../app/providers/AuthProvider';

export default function StoriesPage() {
  const loadVersion = useRef(0);
  const [page, setPage] = useState(0);
  const { can, user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', excerpt: '', content: '', order: 0, is_published: can('stories.publish') });
  const [photoFile, setPhotoFile] = useState(null);
  const [formBaseline, setFormBaseline] = useState(formData);
  const storyDirty = Boolean(photoFile) || JSON.stringify(formData) !== JSON.stringify(formBaseline);
  const storyDraft = useUnsavedChanges({ key: `${user?.id}:story:${editingId || 'new'}`, dirty: storyDirty, draft: { formData, photoFile }, restore: value => { setFormData(value.formData); setPhotoFile(value.photoFile); } });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStories = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true); setError(null);
    try {
      const items = await apiRequest(listQuery(endpoints.adminStories.list, { limit: 50, offset: page * 50 }), { auth: true });
      if (version === loadVersion.current) setStories(items);
    } catch (err) { if (version === loadVersion.current) setError(err.message); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [page]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const resetForm = () => {
    storyDraft.discard();  
    setEditingId(null); 
    const blank = { name: '', excerpt: '', content: '', order: 0, is_published: can('stories.publish') }; setFormBaseline(blank); setFormData(blank); 
    setPhotoFile(null); 
  };
  
  const handleEdit = (s) => {
    if (storyDirty && !window.confirm('Discard unsaved story changes before editing this record?')) return;
    storyDraft.discard(); setFormBaseline({ name: s.name, excerpt: s.excerpt, content: s.content, order: s.order, is_published: s.is_published }); 
    setEditingId(s.id); 
    setFormData({ name: s.name, excerpt: s.excerpt, content: s.content, order: s.order, is_published: s.is_published }); 
    setPhotoFile(null); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const handleDelete = (s) => { setItemToDelete(s); setDeleteModalOpen(true); };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await apiRequest(endpoints.adminStories.detail(itemToDelete.id), { method: 'DELETE', auth: true });
      toast.success('Post deleted');
      await fetchStories();
      setDeleteModalOpen(false);
    } catch (err) { toast.error(err.message || 'Failed to delete post'); }
    finally { setIsDeleting(false); setItemToDelete(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('excerpt', formData.excerpt);
    data.append('content', formData.content);
    data.append('order', formData.order);
    if (can('stories.publish')) data.append('is_published', formData.is_published);
    if (photoFile) data.append('photo', photoFile);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const path = editingId ? endpoints.adminStories.detail(editingId) : endpoints.adminStories.list;
      await apiRequest(path, { method, auth: true, body: data });
      toast.success(editingId ? 'Post updated' : 'Post created');
      resetForm();
      fetchStories();
    } catch (err) { toast.error(err.message || 'Failed to save post'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="admin-page">
      <PageHeader 
        title="Stories" 
        help="Create and manage stories shared with the Living The Charge community." 
      />

      
      <ConfirmDialog 
        open={deleteModalOpen}
        title="Delete Story?"
        description={`You are about to permanently delete "${itemToDelete?.name || 'this post'}". All associated data will be lost.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        loading={isDeleting}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />

      <div className="stories-workspace">
        
        {/* Left Column: Form */}
        {(can('stories.create') || can('stories.update')) && <AdminCard>
          <div className="admin-card__body">
            <h3 className="admin-section-title">
              {editingId ? 'Edit Post' : 'New Post'}
            </h3>
            
            <form onSubmit={handleSubmit}>{storyDraft.restored && <p role="status">Unsaved story draft restored. Review before saving.</p>}
              <div className="admin-form-field">
                <label htmlFor="story-name">Student Name</label>
                <input id="story-name" type="text" placeholder="e.g. Ricky Ouko, Student" required value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="admin-form-field">
                <label htmlFor="story-photo">Photo</label>
                <input id="story-photo" type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} />
              </div>
              <div className="admin-form-field">
                <label htmlFor="story-excerpt">Card Excerpt</label>
                <textarea id="story-excerpt" placeholder="Short preview text shown on the card…" value={formData.excerpt}
                  onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                  className="story-excerpt" />
              </div>
              <div className="admin-form-field">
                <label htmlFor="story-content">Full Content (HTML allowed)</label>
                <textarea id="story-content" placeholder="Write the full story here…" required value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="story-content" />
              </div>
              
              <div className="story-form-options">
                <div className="admin-form-field">
                  <label htmlFor="story-order">Display Order</label>
                  <input id="story-order" type="number" value={formData.order}
                    onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="story-order" />
                </div>
                {can('stories.publish') && <div className="story-publish-option">
                  <label className="story-publish-label">
                    <input type="checkbox" checked={formData.is_published}
                      onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                      className="story-publish-checkbox" />
                    Publish immediately
                  </label>
                </div>}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={isSubmitting} className="admin-primary-button" style={{ flex: 1 }}>
                  {isSubmitting ? 'Saving…' : (editingId ? 'Update Post' : 'Create Post')}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { if (!storyDirty || window.confirm('Discard unsaved story changes?')) resetForm(); }} disabled={isSubmitting} className="admin-secondary-button">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </AdminCard>}

        {/* Right Column: List */}
        <AdminCard>
          <div className="admin-card__body">
            <h3 className="admin-section-title">
              Stories
            </h3>

            {loading ? (
              <div className="admin-state" role="status">Loading stories…</div>
            ) : error ? (
              <AdminEmptyState title="We couldn't load stories" description={error} action={<button className="admin-secondary-button" type="button" onClick={fetchStories}>Try again</button>} />
            ) : stories.length === 0 ? (
              <AdminEmptyState title="No posts yet" description="Create your first post using the form." />
            ) : (
              <div className="admin-table-wrap"><table className="admin-table story-directory"><thead><tr><th>Story</th><th>Status</th><th>Actions</th></tr></thead><tbody>{stories.map(story => <tr key={story.id}><td><strong>{story.name}</strong><small className="operations-detail">Order #{story.order}{story.published_date && ` · ${new Date(story.published_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}</small></td><td><AdminBadge tone={story.is_published ? 'success' : 'warning'}>{story.is_published ? 'Live' : 'Draft'}</AdminBadge></td><td><div className="operations-actions">{can('stories.update') && <button className="admin-secondary-button" type="button" onClick={() => handleEdit(story)}>Edit</button>}{can('stories.delete') && <button className="admin-secondary-button admin-danger-outline" type="button" onClick={() => handleDelete(story)}>Delete</button>}</div></td></tr>)}</tbody></table></div>
            )}
          </div>
        <ListPagination page={page} setPage={setPage} count={stories.length} loading={loading} label="stories" />
        </AdminCard>
      </div>
    </div>
  );
}
