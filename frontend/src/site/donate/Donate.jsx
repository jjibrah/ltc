import { useEffect, useState } from 'react';
import CampaignProgressCard from './CampaignProgressCard';
import { campaignProgress } from '../../data/sampleCampaign';
import { getDonationProgress, getDonationSupporters, getPublicPledges } from '../../services/donations/donations.service';

const campaign = campaignProgress;
const SUPPORTERS_PAGE_SIZE = 9;

export default function Donate() {
  const [progress, setProgress] = useState({ total_collected: 0, pledged_amount: 0, successful_payment_count: 0, pledge_count: 0, currency: 'usd' });
  const [progressState, setProgressState] = useState('loading');
  const [supporters, setSupporters] = useState([]);
  const [supportersOffset, setSupportersOffset] = useState(0);
  const [supportersHasMore, setSupportersHasMore] = useState(true);
  const [supportersLoading, setSupportersLoading] = useState(false);
  const [pledges, setPledges] = useState([]);
  const openDonationModal = () => window.dispatchEvent(new Event('ltc:open-donation'));
  const openPledgeModal = () => window.dispatchEvent(new Event('ltc:open-pledge'));

  useEffect(() => {
    let active = true;
    getDonationProgress()
      .then((data) => {
        if (!active) return;
        setProgress({
          total_collected: Number(data?.total_collected) || 0,
          pledged_amount: Number(data?.pledged_amount) || 0,
          successful_payment_count: Number(data?.successful_payment_count) || 0,
          pledge_count: Number(data?.pledge_count) || 0,
          currency: String(data?.currency || 'usd').toLowerCase(),
        });
        setProgressState('ready');
      })
      .catch(() => {
        if (active) setProgressState('error');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => { getPublicPledges().then((data) => setPledges(Array.isArray(data) ? data : [])).catch(() => setPledges([])); }, []);

  const loadSupporters = (offset = 0) => {
    setSupportersLoading(true);
    getDonationSupporters(SUPPORTERS_PAGE_SIZE, offset)
      .then((data) => {
        const page = Array.isArray(data) ? data : [];
        setSupporters((current) => (offset === 0 ? page : [...current, ...page]));
        setSupportersOffset(offset + page.length);
        setSupportersHasMore(page.length === SUPPORTERS_PAGE_SIZE);
      })
      .catch(() => {
        if (offset === 0) setSupporters([]);
        setSupportersHasMore(false);
      })
      .finally(() => setSupportersLoading(false));
  };

  useEffect(() => { loadSupporters(); }, []);

  const donorInitials = (name) => String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const formatDonation = (amount, currency) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency || 'usd').toUpperCase(),
  }).format(Number(amount) || 0);

  return (
    <main className="donation-page-wrapper">

      {/* Pure image banner — no text */}
      <section className="campaign-banner" aria-label="Donate" />

      <section className="campaign-summary" aria-label="Campaign totals">
        <div className="container campaign-summary__grid">
          <div><strong>{progress.successful_payment_count}</strong><span>donations received</span></div>
          <div><strong>{progress.pledge_count}</strong><span>pledges received</span></div>
          <div><strong>{formatDonation(progress.total_collected + progress.pledged_amount, progress.currency)}</strong><span>current total</span></div>
        </div>
      </section>

      {/* Progress card + photo */}
      <section className="campaign-section">
        <div className="container campaign-editorial">
          <div className="campaign-editorial__right">
            <CampaignProgressCard
              raised={progress.total_collected}
              pledged={progress.pledged_amount}
              goal={campaign.goal}
              currency={progress.currency.toUpperCase()}
              title={campaign.title}
              ctaLabel={campaign.ctaLabel}
              onCta={openDonationModal}
            />
            {progressState === 'loading' && <p className="campaign-progress-status" role="status">Loading verified campaign progress…</p>}
            {progressState === 'error' && <p className="campaign-progress-status campaign-progress-status--error" role="alert">Verified campaign progress is temporarily unavailable. No estimated total is being shown.</p>}
            <figure className="campaign-photo">
              <img src="/images/DSC_1530.JPG" alt="Students participating in a Living the Charge program" loading="lazy" />
              <figcaption>Cost should never be a barrier to opportunity.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="supporters-section" aria-labelledby="supporters-title">
        <div className="container supporters-section__container">
          <header className="supporters-intro"><h2 id="supporters-title">Contributions</h2></header>
          <div className="pledge-callout"><div><h3>Make a pledge</h3><p>Commit your support today. Our team will follow up to confirm your pledge before it is published.</p></div><button type="button" onClick={openPledgeModal}>Pledge your support</button></div>
          {pledges.length > 0 && <div className="public-contributions public-pledges"><h3>Confirmed pledges</h3><div className="supporter-list">{pledges.map((pledge) => <article className="pledge-row" key={pledge.id}><div className="pledge-row__top"><div className="pledge-row__identity"><span className="pledge-row__badge">{pledge.pledge_type === 'organization' ? pledge.organization : 'Individual'}</span><div className="pledge-row__meta"><span className="pledge-row__name">{pledge.name}</span><span aria-hidden="true">•</span><span>{pledge.frequency === 'monthly' ? 'Monthly' : 'One-time'}</span></div></div><strong className="pledge-row__amount">{formatDonation(pledge.amount, pledge.currency)}</strong></div>{pledge.message && <p className="pledge-row__message">“{pledge.message}”</p>}</article>)}</div></div>}
          <div className="public-contributions">
            <h3>Public contributions</h3>
            {supporters.length > 0 && <div className="supporter-list">
                {supporters.map((supporter, index) => (
                  <article className="supporter-row" key={`${supporter.donated_at || 'donation'}-${index}`}>
                    <span className="supporter-avatar" aria-hidden="true">{donorInitials(supporter.name)}</span>
                    <div>
                      <h3>{supporter.name}</h3>
                      <p>{supporter.donated_at ? new Date(supporter.donated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent donation'}</p>
                    </div>
                    <strong>{formatDonation(supporter.amount, supporter.currency)}</strong>
                    {supporter.message && <p className="supporter-message">“{supporter.message}”</p>}
                  </article>
                ))}
              </div>}
            {supportersHasMore && supporters.length > 0 && <button className="supporters-load-more" type="button" onClick={() => loadSupporters(supportersOffset)} disabled={supportersLoading}>{supportersLoading ? 'Loading…' : 'Load more contributions'}</button>}
          </div>
        </div>
      </section>

      <style>{`
        .donation-page-wrapper { --color-primary: #1D1D31; --color-secondary: #1D1D31; --text-primary: #1D1D31; --text-secondary: #62636B; --color-text-muted: #90919A; --color-border: #DFE0E4; background: var(--color-bg); color: var(--text-primary); font-family: var(--body-font); }
        .campaign-banner { position: relative; isolation: isolate; min-height: clamp(400px, 46vw, 500px); padding: 136px clamp(20px,4vw,48px) 64px; display: flex; align-items: center; color: #fff; background: #172b3c url('/images/DSC_1999.JPG') center 57% / cover no-repeat; background-image: image-set(url('/images/optimized/route-hero/donate-640.avif') type('image/avif'), url('/images/optimized/route-hero/donate-640.webp') type('image/webp'), url('/images/DSC_1999.JPG') type('image/jpeg')); }
        .campaign-banner::before { content: ''; position: absolute; z-index: -1; inset: 0; background: linear-gradient(90deg, rgba(6,18,22,.75), rgba(6,18,22,.46) 48%, rgba(6,18,22,.12)); }
        @media (min-width: 641px) { .campaign-banner { background-image: image-set(url('/images/optimized/route-hero/donate-960.avif') type('image/avif'), url('/images/optimized/route-hero/donate-960.webp') type('image/webp'), url('/images/DSC_1999.JPG') type('image/jpeg')); } }
        @media (min-width: 1200px) { .campaign-banner { background-image: image-set(url('/images/optimized/route-hero/donate-1600.avif') type('image/avif'), url('/images/optimized/route-hero/donate-1600.webp') type('image/webp'), url('/images/DSC_1999.JPG') type('image/jpeg')); } }
        @media (min-width: 1600px) { .campaign-banner { background-image: image-set(url('/images/optimized/route-hero/donate-1920.avif') type('image/avif'), url('/images/optimized/route-hero/donate-1920.webp') type('image/webp'), url('/images/DSC_1999.JPG') type('image/jpeg')); } }
        .campaign-summary { border-bottom: 1px solid var(--color-border); background: #fff; }
        .campaign-summary__grid { display: grid; grid-template-columns: repeat(3, 1fr); }
        .campaign-summary__grid > div { display: grid; gap: 6px; padding: 24px 28px; text-align: center; }
        .campaign-summary__grid > div + div { border-left: 1px solid var(--color-border); }
        .campaign-summary strong { color: var(--color-primary); font-family: var(--display-sans); font-size: clamp(1.35rem, 2.4vw, 2rem); line-height: 1; }
        .campaign-summary span { color: var(--text-secondary); font-size: .75rem; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; }
        .campaign-banner__content { width: min(100%, 1200px); margin-inline: auto; }
        .campaign-banner h1 { max-width: 680px; margin: 0 0 22px; color: #fff; font-family: var(--editorial-serif); font-size: clamp(2.5rem, 4vw, 3.8rem); font-weight: 600; font-style: normal; line-height: 1; letter-spacing: -.025em; text-wrap: balance; }
        .campaign-banner p { max-width: 600px; margin: 0; color: rgba(255,255,255,.88); font-size: clamp(1.05rem,1.4vw,1.2rem); line-height: 1.6; }
        .campaign-section { padding: clamp(72px,8vw,108px) 0; background: var(--color-bg); }
        .campaign-editorial { display: grid; grid-template-columns: minmax(0, 1fr); gap: clamp(48px,8vw,110px); align-items: center; max-width: 760px; }
        .campaign-editorial > * { min-width: 0; }
        .section-eyebrow { display: block; margin-bottom: 16px; color: var(--color-secondary); font-family: var(--display-sans); font-size: .72rem; font-weight: 650; letter-spacing: .14em; text-transform: uppercase; }
        .campaign-editorial__right { display: grid; gap: 28px; }
        .campaign-progress-status { margin: -14px 0 0; color: var(--text-secondary); font-size: .82rem; text-align: center; }
        .campaign-progress-status--error { color: #8A3434; }
        .campaign-donate-btn, .donation-final-cta button { min-height: 48px; padding: 0 24px; border: 0; border-radius: 4px; background: var(--color-primary); color: #fff; font-family: var(--display-sans); font-size: .9rem; font-weight: 600; cursor: pointer; transition: background .2s ease, transform .2s ease; }
        .campaign-donate-btn:hover, .donation-final-cta button:hover { background: #29283D; transform: translateY(-1px); }
        .supporters-section { padding: clamp(72px,8vw,108px) 0; background: #F4F5F6; border-top: 1px solid var(--color-border); }
        .supporters-intro { display: flex; justify-content: space-between; gap: 32px; align-items: end; margin-bottom: 34px; }
        .supporters-intro h2 { margin: 0 0 10px; color: var(--color-primary); font-family: var(--display-sans); font-size: clamp(2.4rem,4vw,3.8rem); font-weight: 700; line-height: .98; letter-spacing: -.04em; }
        .supporters-intro > p { max-width: 390px; margin: 0; color: var(--text-secondary); line-height: 1.6; }
        .public-contributions h3 { margin: 0 0 20px; color: var(--color-primary); font-family: var(--display-sans); font-size: 1.15rem; font-weight: 650; }
        .pledge-callout { display:flex; align-items:center; justify-content:space-between; gap:24px; margin-bottom:34px; padding:22px 24px; border:1px solid var(--color-border); border-radius:4px; background:#FAFAF8; }.pledge-callout h3 { margin:0 0 5px; }.pledge-callout p { margin:0; color:var(--text-secondary); font-size:.86rem; line-height:1.5; }.pledge-callout button { flex:0 0 auto; min-height:44px; padding:0 18px; border:0; border-radius:4px; background:var(--color-primary); color:#fff; font-weight:600; cursor:pointer; }.public-pledges { margin-bottom:40px; }
        .pledge-row { display:flex; flex-direction:column; gap:14px; min-width:0; padding:20px 22px; border:1px solid var(--color-border); border-radius:8px; background:#fff; box-shadow:0 4px 14px rgba(29,29,49,.06); }.pledge-row__top { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; min-width:0; }.pledge-row__identity { min-width:0; }.pledge-row__badge { display:inline-flex; align-items:center; min-height:23px; margin-bottom:9px; padding:0 9px; border:1px solid #D8DCE4; border-radius:999px; background:#F4F5F7; color:var(--color-primary); font-size:.68rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; }.pledge-row__meta { display:flex; align-items:center; gap:7px; color:var(--text-secondary); font-size:.84rem; line-height:1.35; white-space:nowrap; }.pledge-row__name { color:var(--color-primary); font-weight:650; overflow-wrap:anywhere; white-space:normal; }.pledge-row__amount { flex:0 0 auto; color:var(--color-primary); font-family:var(--display-sans); font-size:1.05rem; font-weight:750; line-height:1.25; white-space:nowrap; }.pledge-row__message { margin:0; padding:9px 0 9px 12px; border-left:2px solid #D4A96A; color:var(--text-secondary); font-size:.84rem; font-style:italic; line-height:1.45; overflow-wrap:anywhere; }
        .campaign-photo { position: relative; min-height: 190px; margin: 0; overflow: hidden; border-radius: 4px; }
        .campaign-photo img { width: 100%; height: 280px; object-fit: cover; object-position: center 38%; }
        .campaign-photo::after { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(29,29,49,.58), transparent 55%); pointer-events: none; }
        .campaign-photo figcaption { position: absolute; z-index: 1; right: 18px; bottom: 14px; left: 18px; color: #fff; font-family: var(--editorial-serif); font-size: 1.2rem; line-height: 1.15; }
        .supporters-photo { position: relative; min-height: 250px; margin: 0; overflow: hidden; border-radius: 4px; }
        .supporters-photo img { width: 100%; height: 250px; object-fit: cover; object-position: center 42%; }
        .supporters-photo figcaption { position: absolute; right: 20px; bottom: 16px; left: 20px; color: #fff; font-size: .72rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        .supporter-list { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 16px 24px; }
        .supporter-row { display: grid; grid-template-columns: 42px minmax(0,1fr) auto; gap: 14px 16px; align-items: start; padding: 20px; border: 1px solid var(--color-border); border-radius: 4px; background: #FAFAF8; transition: border-color .2s ease, background-color .2s ease; }
        .supporter-row:hover { border-color: #BFC4CC; background: #FFFFFF; }
        .supporter-avatar { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: #eeeae4; color: var(--color-primary); font-size: .8rem; font-weight: 650; }
        .supporter-row:nth-child(3n + 1) .supporter-avatar { background: var(--color-primary); color: #fff; }
        .supporter-row:nth-child(3n + 2) .supporter-avatar { background: #D4A96A; color: #1D1D31; }
        .supporter-row:nth-child(3n) .supporter-avatar { background: #D9C4C4; color: #1D1D31; }
        .supporter-row h3 { margin: 0; color: var(--color-primary); font-family: var(--display-sans); font-size: .98rem; font-weight: 600; }
        .supporter-row div p { margin: 2px 0 0; color: var(--text-secondary); font-size: .8rem; }
        .supporter-row > strong { color: var(--color-primary); font-family: var(--display-sans); font-size: .95rem; }
        .supporter-message { grid-column: 2 / 4; margin: 12px 0 0; padding-left: 12px; border-left: 2px solid #D4A96A; color: var(--text-secondary); font-size: .9rem; font-style: italic; line-height: 1.5; }
        .supporters-toggle { margin-top: 28px; padding: 0; border: 0; background: none; color: var(--color-primary); font-family: var(--display-sans); font-size: .9rem; font-weight: 600; cursor: pointer; }
        .supporters-load-more { display: block; min-height: 42px; margin: 28px auto 0; padding: 0 18px; border: 1px solid var(--color-primary); border-radius: 4px; background: transparent; color: var(--color-primary); font-family: var(--display-sans); font-size: .84rem; font-weight: 650; cursor: pointer; transition: background .2s ease, color .2s ease; }
        .supporters-load-more:hover, .supporters-load-more:focus-visible { background: var(--color-primary); color: #fff; outline: none; }
        .supporters-load-more:disabled { cursor: wait; opacity: .6; }
        .trust-grid { display: grid; grid-template-columns: repeat(3,1fr); border-top: 1px solid var(--color-border); }
        .trust-grid div { display: grid; gap: 8px; padding: 20px 20px 0 0; }
        .trust-grid div + div { padding-left: 20px; border-left: 1px solid var(--color-border); }
        .trust-grid strong { color: var(--color-primary); font-family: var(--display-sans); font-size: .76rem; letter-spacing: .06em; text-transform: uppercase; }
        .trust-grid span { color: var(--text-secondary); font-size: .84rem; line-height: 1.5; }
        .donation-final-cta { padding: clamp(68px,8vw,100px) 0; background: var(--color-bg); text-align: center; }
        .donation-final-cta h2 { max-width: 680px; margin: 0 auto 28px; color: var(--color-primary); font-family: var(--editorial-serif); font-size: clamp(2.3rem,4vw,3.9rem); font-weight: 600; line-height: 1; letter-spacing: -.025em; text-wrap: balance; }
        @media (max-width: 1040px) { .campaign-photo img { height: clamp(260px,40vw,360px); } .supporters-intro { align-items: start; } }
        @media (max-width: 1040px) { .supporter-list { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media (max-width: 720px) { .supporter-list { grid-template-columns: 1fr; } .supporters-intro { display: grid; gap: 10px; } .pledge-callout { align-items:start; flex-direction:column; }.pledge-callout button { width:100%; } }
        @media (max-width: 600px) { .campaign-banner { min-height: 390px; padding: 108px 20px 44px; background-position: 58% 55%; } .campaign-banner h1 { font-size: clamp(2.2rem,9vw,3rem); } .campaign-banner p { font-size: 1rem; line-height: 1.55; } .campaign-section, .supporters-section { padding-block: 60px; } .campaign-editorial { gap: 36px; } .campaign-summary__grid > div { padding: 20px 10px; } .campaign-summary span { font-size: .63rem; } .trust-grid { grid-template-columns: 1fr; } .trust-grid div, .trust-grid div + div { padding: 16px 0 0; border-left: 0; } .campaign-donate-btn, .donation-final-cta button { width: 100%; } .donation-final-cta { padding-block: 60px; } }
        @media (max-width: 600px) { .pledge-row { padding:18px 20px; } .pledge-row__top { gap:12px; } }
        @media (max-width: 430px) { .campaign-banner { min-height: 370px; padding-top: 102px; } .campaign-banner h1 { max-width: 360px; font-size: clamp(2rem,8.5vw,2.6rem); } .campaign-photo img, .supporters-photo img { height: 210px; } .campaign-photo figcaption { font-size: 1rem; } .supporter-row { grid-template-columns: 36px minmax(0,1fr) auto; gap: 10px 12px; padding: 16px; } .pledge-row { align-items:stretch; padding:18px 16px; } .pledge-row__top { flex-direction:column; gap:10px; } .pledge-row__amount { font-size:1rem; } .supporter-avatar { width: 36px; height: 36px; } .supporter-row h3 { font-size: .9rem; } .supporter-row > strong { font-size: .86rem; } .supporter-message { grid-column: 2 / 4; } }
      `}</style>
    </main>
  );
}
