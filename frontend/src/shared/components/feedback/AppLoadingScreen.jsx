export default function AppLoadingScreen({ message }) {
  return (
    <div className="app-loading-screen" role="status" aria-live="polite" aria-label={message || 'Loading Living the Charge'}>
      <div className="app-loading-screen__mark" aria-hidden="true">
        <img className="app-loading-screen__logo" src="/brand/ltc-logo-navy.svg" alt="" width="112" height="112" />
      </div>
      <strong>Living the Charge</strong>
      {message && <span>{message}</span>}
      <div className="app-loading-screen__progress" aria-hidden="true">
        <div className="app-loading-screen__signal" />
      </div>
    </div>
  );
}
