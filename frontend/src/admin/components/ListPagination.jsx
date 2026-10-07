export default function ListPagination({ page, setPage, count, pageSize = 50, loading = false, label = 'records' }) {
  return <nav className="admin-pagination" aria-label={`${label} pages`}>
    <button className="admin-secondary-button" type="button" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>Previous</button>
    <span className="admin-count" aria-live="polite">Page {page + 1} · {count} {label} on this page</span>
    <button className="admin-secondary-button" type="button" disabled={loading || count < pageSize} onClick={() => setPage(page + 1)}>Next</button>
  </nav>;
}
