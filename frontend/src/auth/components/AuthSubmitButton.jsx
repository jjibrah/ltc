import { LoaderCircle } from 'lucide-react';

export default function AuthSubmitButton({ children, loading = false, loadingLabel = 'Submitting…', ...props }) {
  return (
    <button className="auth-submit" type="submit" disabled={loading || props.disabled} {...props}>
      {loading && <LoaderCircle className="auth-submit__spinner" size={17} aria-hidden="true" />}
      {loading ? loadingLabel : children}
    </button>
  );
}
