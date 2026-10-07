import { useEffect, useId, useState } from 'react';
import { campaignProgress } from '../../data/sampleCampaign';
import { getDonationProgress } from '../../services/donations/donations.service';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: campaignProgress.currency,
  maximumFractionDigits: 0,
});

const COST_PER_STUDENT = 42;
const IMPACT_STEP = COST_PER_STUDENT * 5;
const EXPLORER_MIN = COST_PER_STUDENT;
const EXPLORER_MAX = 4200;
const IMPACT_POINTS = [EXPLORER_MIN, ...Array.from({ length: 20 }, (_, index) => (index + 1) * IMPACT_STEP)].map((amount) => ({
  amount,
  students: Math.floor(amount / COST_PER_STUDENT),
}));

function calculateStudentImpact(amount) {
  return Math.floor(amount / COST_PER_STUDENT);
}

function ImpactExplorer() {
  const [amount, setAmount] = useState(1000);
  const [amountInput, setAmountInput] = useState('1000');
  const students = calculateStudentImpact(amount);
  const chart = { width: 760, height: 330, left: 62, right: 22, top: 22, bottom: 48 };
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  const xFor = (value) => chart.left + ((value - EXPLORER_MIN) / (EXPLORER_MAX - EXPLORER_MIN)) * plotWidth;
  const yFor = (value) => chart.top + plotHeight - (value / 125) * plotHeight;
  const line = `M ${xFor(EXPLORER_MIN)} ${yFor(calculateStudentImpact(EXPLORER_MIN))} L ${xFor(EXPLORER_MAX)} ${yFor(calculateStudentImpact(EXPLORER_MAX))}`;
  const selectedX = xFor(amount);
  const selectedY = yFor(students);
  const visibleMarkers = Math.min(students, 10);

  const updateAmount = (nextAmount) => {
    const numericAmount = Number(nextAmount);
    if (!Number.isFinite(numericAmount)) return;
    const normalizedAmount = Math.min(EXPLORER_MAX, Math.max(EXPLORER_MIN, Math.round(numericAmount)));
    setAmount(normalizedAmount);
    setAmountInput(String(normalizedAmount));
  };

  const selectGraphPoint = (point) => updateAmount(point.amount);

  return (
    <section className="impact-explorer" aria-labelledby="impact-explorer-title">
      <div className="container">
        <div className="impact-explorer__intro">
          <div>
            <p className="impact-eyebrow">Your impact</p>
            <h2 id="impact-explorer-title">See how far your support can go.</h2>
          </div>
          <p>Explore how different levels of support could help more students access meaningful opportunities.</p>
        </div>

        <div className="impact-explorer__controls" aria-label="Choose a contribution amount">
          <div className="impact-explorer__input-row">
            <label htmlFor="impact-amount">Contribution amount</label>
            <div className="impact-explorer__number-wrap">
              <span aria-hidden="true">$</span>
              <input id="impact-amount" type="number" min={EXPLORER_MIN} max={EXPLORER_MAX} step="1" value={amountInput} onChange={(event) => { const value = event.target.value; setAmountInput(value); if (value !== '' && Number(value) >= EXPLORER_MIN && Number(value) <= EXPLORER_MAX) setAmount(Math.round(Number(value))); }} onBlur={() => updateAmount(amountInput || amount)} />
            </div>
          </div>
          <label className="impact-explorer__range-label" htmlFor="impact-range">
            <span className="sr-only">Contribution amount slider</span>
            <input id="impact-range" type="range" min={EXPLORER_MIN} max={EXPLORER_MAX} step="1" value={amount} onChange={(event) => updateAmount(event.target.value)} aria-label={`Contribution amount: ${money.format(amount)}`} />
          </label>
        </div>

        <div className="impact-explorer__layout">
          <div className="impact-explorer__chart-column">
            <div className="impact-explorer__chart-readout" aria-live="polite">
              <span>Selected support</span>
              <strong>{money.format(amount)}</strong>
              <small>≈ {students} {students === 1 ? 'student' : 'students'} estimated</small>
            </div>
            <div className="impact-explorer__chart-wrap">
              <svg className="impact-explorer__chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`Estimated impact chart. ${money.format(amount)} could support approximately ${students} ${students === 1 ? 'student' : 'students'}.`}>
                <title>Estimated contribution and student impact</title>
                {[0, 25, 50, 100].map((tick) => (
                  <g key={tick}>
                    <line className="impact-explorer__grid-line" x1={chart.left} x2={chart.width - chart.right} y1={yFor(tick)} y2={yFor(tick)} />
                    <text className="impact-explorer__y-label" x={chart.left - 12} y={yFor(tick) + 4} textAnchor="end">{tick}</text>
                  </g>
                ))}
                <line className="impact-explorer__axis" x1={chart.left} x2={chart.width - chart.right} y1={chart.top + plotHeight} y2={chart.top + plotHeight} />
                <path className="impact-explorer__line" d={line} />
                {IMPACT_POINTS.map((point) => {
                  const pointIsSelected = point.amount === amount;
                  return (
                    <g key={point.amount} className={pointIsSelected ? 'is-selected' : ''} role="button" tabIndex="0" aria-label={`${money.format(point.amount)} could support approximately ${point.students} students`} onClick={() => selectGraphPoint(point)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectGraphPoint(point); } }}>
                      <circle className="impact-explorer__point-hit" cx={xFor(point.amount)} cy={yFor(point.students)} r="16" />
                      <circle className="impact-explorer__point" cx={xFor(point.amount)} cy={yFor(point.students)} r={pointIsSelected ? 7 : 4.5} />
                      <text className="impact-explorer__point-label" x={xFor(point.amount)} y={yFor(point.students) - 14} textAnchor="middle">{pointIsSelected ? point.students : ''}</text>
                    </g>
                  );
                })}
                <line className="impact-explorer__selected-line" x1={selectedX} x2={selectedX} y1={selectedY} y2={chart.top + plotHeight} />
                <circle className="impact-explorer__selected-point" cx={selectedX} cy={selectedY} r="8" />
                {[42, 1050, 2100, 3150, 4200].map((tick) => (
                  <text className={`impact-explorer__x-label impact-explorer__x-label--${tick}`} key={tick} x={xFor(tick)} y={chart.height - 16} textAnchor="middle">{money.format(tick)}</text>
                ))}
              </svg>
            </div>
            <p className="impact-explorer__axis-note">Contribution</p>
          </div>

          <aside className="impact-explorer__result" aria-live="polite" aria-atomic="true">
            <p className="impact-eyebrow">Estimated reach</p>
            <strong>{students}</strong>
            <span>students</span>
            <p>could be supported<br />from {money.format(amount)}</p>
            <div className="impact-explorer__students" aria-label={`${students} estimated students represented`}>
              {Array.from({ length: visibleMarkers }, (_, index) => <i aria-hidden="true" key={index} />)}
              {students > visibleMarkers && <b>+{students - visibleMarkers}</b>}
            </div>
            <p className="impact-explorer__note">Impact estimates are based on an average programme support cost of $42 per student. Actual costs may vary.</p>
            <a className="impact-explorer__cta" href="/donate">Donate</a>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ProgressRing({ raised, goal }) {
  const gradientId = useId().replace(/:/g, '');
  const percentage = goal > 0 ? (raised / goal) * 100 : 0;
  const displayPercentage = Math.min(Math.max(percentage, 0), 100);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - displayPercentage / 100);

  return (
    <div className="impact-progress-visual">
      <div className="impact-progress-ring" role="img" aria-label={`${displayPercentage.toFixed(1)} percent funded`}>
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#1F3A6E" />
              <stop offset="100%" stopColor="#294b89" />
            </linearGradient>
          </defs>
          <circle className="impact-progress-ring__track" cx="80" cy="80" r={radius} />
          <circle className="impact-progress-ring__arc" cx="80" cy="80" r={radius} stroke={`url(#${gradientId})`} strokeDasharray={circumference} strokeDashoffset={dashOffset} />
        </svg>
        <div className="impact-progress-ring__center">
          <strong>{money.format(raised)}</strong>
          <span>raised</span>
          <i aria-hidden="true" />
          <span>of {money.format(goal)}</span>
        </div>
      </div>
      <p className="impact-progress-visual__label">{displayPercentage.toFixed(1)}% funded</p>
    </div>
  );
}

export default function Impact() {
  const [progress, setProgress] = useState({
    total_collected: 0,
    currency: campaignProgress.currency.toLowerCase(),
    successful_payment_count: 0,
  });
  const [progressState, setProgressState] = useState('loading');

  useEffect(() => {
    let active = true;
    getDonationProgress()
      .then((result) => {
        if (!active) return;
        setProgress(result);
        setProgressState('ready');
      })
      .catch(() => {
        if (active) setProgressState('error');
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="impact-page">
      <section className="impact-hero" aria-labelledby="impact-hero-title">
        <div className="impact-hero__overlay" />
        <div className="container impact-hero__content impact-hero__grid">
          <div>
            <p className="impact-eyebrow">Our impact</p>
            <h1 id="impact-hero-title">Opportunity that lasts a lifetime.</h1>
            <p className="impact-hero-description">Every contribution helps build a future where talented Kenyan students can access meaningful opportunities.</p>
          </div>
          <div className="impact-hero__progress">
            <ProgressRing raised={progress.total_collected} goal={campaignProgress.goal} />
            {progressState === 'loading' && <p className="impact-progress-status">Loading verified progress…</p>}
            {progressState === 'error' && <p className="impact-progress-status" role="status">Verified progress is temporarily unavailable.</p>}
          </div>
        </div>
      </section>

      <ImpactExplorer />

      <style>{`
        .impact-page { --impact-navy: #1F3A6E; --impact-ink: #1C2738; --impact-muted: #68707D; --impact-border: #E2E5E9; background: #FAFAF8; color: var(--impact-ink); }
        .impact-hero { position: relative; min-height: clamp(430px,55vw,620px); display: flex; align-items: center; overflow: hidden; color: #fff; background: url('/images/DSC_1725.JPG') center 32% / cover no-repeat; background-image: image-set(url('/images/optimized/route-hero/impact-640.avif') type('image/avif'), url('/images/optimized/route-hero/impact-640.webp') type('image/webp'), url('/images/DSC_1725.JPG') type('image/jpeg')); }
        .impact-hero__overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,17,28,.78), rgba(8,17,28,.44) 55%, rgba(8,17,28,.1)); }
        @media (min-width: 641px) { .impact-hero { background-image: image-set(url('/images/optimized/route-hero/impact-960.avif') type('image/avif'), url('/images/optimized/route-hero/impact-960.webp') type('image/webp'), url('/images/DSC_1725.JPG') type('image/jpeg')); } }
        @media (min-width: 1200px) { .impact-hero { background-image: image-set(url('/images/optimized/route-hero/impact-1600.avif') type('image/avif'), url('/images/optimized/route-hero/impact-1600.webp') type('image/webp'), url('/images/DSC_1725.JPG') type('image/jpeg')); } }
        @media (min-width: 1600px) { .impact-hero { background-image: image-set(url('/images/optimized/route-hero/impact-1920.avif') type('image/avif'), url('/images/optimized/route-hero/impact-1920.webp') type('image/webp'), url('/images/DSC_1725.JPG') type('image/jpeg')); } }
        .impact-hero__content { position: relative; z-index: 1; width: 100%; padding-top: 92px; }
        .impact-hero__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .75fr); gap: clamp(48px, 9vw, 128px); align-items: center; }
        .impact-hero__progress { display: flex; flex-direction: column; align-items: center; justify-self: center; width: min(100%, 300px); }
        .impact-hero__progress .impact-progress-ring__center { color: #fff; }
        .impact-hero__progress .impact-progress-ring__center span, .impact-hero__progress .impact-progress-visual__label, .impact-hero__progress .impact-progress-status { color: #fff; }
        .impact-hero__progress .impact-progress-ring__track { stroke: rgba(255,255,255,.35); }
        .impact-hero__progress .impact-progress-ring__center i { background: rgba(255,255,255,.55); }
        .impact-hero .impact-eyebrow { color: rgba(255,255,255,.75); }
        .impact-hero h1 { max-width: 760px; margin: 0 0 22px; color: #fff; font-family: var(--editorial-serif); font-size: clamp(3rem,6vw,5.8rem); font-style: normal; font-weight: 600; line-height: .96; letter-spacing: -.025em; }
        .impact-hero-description { max-width: 600px; margin: 0; color: #fff !important; font-size: clamp(1rem,1.4vw,1.2rem); line-height: 1.6; }
        .impact-progress-section { padding: clamp(120px, 14vw, 176px) 0 clamp(104px, 12vw, 148px); }
        .impact-progress-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .8fr); gap: clamp(56px, 10vw, 144px); align-items: center; max-width: 1120px; }
        .impact-progress-copy { max-width: 570px; }
        .impact-eyebrow { margin: 0 0 18px; color: var(--impact-muted); font-family: var(--display-sans); font-size: .72rem; font-weight: 650; letter-spacing: .14em; text-transform: uppercase; }
        .impact-progress-copy h1 { max-width: 600px; margin: 0; color: var(--impact-navy); font-family: var(--editorial-serif); font-size: clamp(3rem, 5vw, 4.8rem); font-style: normal; font-weight: 600; line-height: .98; letter-spacing: -.035em; text-wrap: balance; }
        .impact-progress-copy > p:not(.impact-eyebrow) { max-width: 390px; margin: 24px 0 30px; color: var(--impact-muted); font-size: clamp(1.05rem, 1.5vw, 1.2rem); line-height: 1.55; }
        .impact-primary-link, .impact-supporters-toggle { padding: 0; border: 0; background: transparent; color: var(--impact-navy); font-family: var(--display-sans); font-size: .94rem; font-weight: 650; cursor: pointer; }
        .impact-primary-link span, .impact-supporters-toggle span { display: inline-block; margin-left: 5px; transition: transform .2s ease; }
        .impact-primary-link:hover span, .impact-supporters-toggle:hover span { transform: translateX(3px); }
        .impact-progress-visual { justify-self: center; text-align: center; }
        .impact-progress-ring { position: relative; width: min(100%, 240px); aspect-ratio: 1; }
        .impact-progress-ring svg { width: 100%; height: 100%; display: block; transform: rotate(-90deg); }
        .impact-progress-ring__track, .impact-progress-ring__arc { fill: none; stroke-width: 5; }
        .impact-progress-ring__track { stroke: #E0E4E9; }
        .impact-progress-ring__arc { stroke-linecap: round; transition: stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1); }
        .impact-progress-ring__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--impact-navy); }
        .impact-progress-ring__center strong { font-family: var(--display-sans); font-size: clamp(1.6rem, 3vw, 2rem); font-weight: 650; letter-spacing: -.04em; line-height: 1; }
        .impact-progress-ring__center span { color: var(--impact-muted); font-family: var(--display-sans); font-size: .75rem; line-height: 1.35; }
        .impact-progress-ring__center i { width: 24px; height: 1px; margin: 8px 0 6px; background: #D6DAE0; }
        .impact-progress-visual__label { margin: 18px 0 0; color: var(--impact-muted); font-family: var(--display-sans); font-size: .82rem; font-weight: 600; }
        .impact-progress-status { max-width: 260px; margin: 12px auto 0; color: var(--impact-muted); font-size: .82rem; text-align: center; }
        .impact-explorer { padding: clamp(96px, 11vw, 140px) 0; background: #fff; color: var(--impact-ink); }
        .impact-explorer__intro { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .7fr); gap: clamp(40px, 8vw, 120px); align-items: end; margin-bottom: 50px; }
        .impact-explorer h2 { max-width: 650px; margin: 0; color: #000; font-family: var(--display-font); font-size: clamp(2.8rem, 5vw, 5rem); font-weight: 700; line-height: .98; letter-spacing: -.035em; }
        .impact-explorer__intro > p { max-width: 430px; margin: 0 0 4px; color: var(--impact-muted); font-size: 1.06rem; line-height: 1.65; }
        .impact-explorer__controls { padding: 22px 0 30px; border-top: 1px solid rgba(31,58,110,.2); border-bottom: 1px solid rgba(31,58,110,.2); }
        .impact-explorer__presets { display: flex; flex-wrap: wrap; gap: 10px; }
        .impact-explorer__presets button { min-height: 42px; padding: 0 15px; border: 1px solid rgba(31,58,110,.25); border-radius: 999px; background: transparent; color: var(--impact-navy); font-family: var(--display-sans); font-size: .82rem; font-weight: 650; cursor: pointer; transition: background-color .25s ease, color .25s ease, border-color .25s ease; }
        .impact-explorer__presets button:hover, .impact-explorer__presets button.is-active { border-color: var(--impact-navy); background: var(--impact-navy); color: #fff; }
        .impact-explorer__input-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 22px; }
        .impact-explorer__input-row label { color: var(--impact-muted); font-family: var(--display-sans); font-size: .76rem; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; }
        .impact-explorer__number-wrap { display: flex; align-items: center; width: 148px; border-bottom: 1px solid var(--impact-navy); color: var(--impact-navy); font-family: var(--display-sans); font-weight: 650; }
        .impact-explorer__number-wrap input { width: 100%; padding: 7px 0; border: 0; outline: 0; background: transparent; color: var(--impact-navy); font: inherit; }
        .impact-explorer__number-wrap input::-webkit-inner-spin-button, .impact-explorer__number-wrap input::-webkit-outer-spin-button { margin: 0; appearance: none; }
        .impact-explorer__range-label { display: block; margin-top: 18px; }
        .impact-explorer__range-label input { width: 100%; height: 4px; accent-color: #3C8D68; cursor: pointer; }
        .impact-explorer__layout { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, .7fr); gap: clamp(44px, 8vw, 120px); align-items: center; padding-top: 56px; }
        .impact-explorer__chart-column { min-width: 0; }
        .impact-explorer__chart-readout { display: flex; align-items: baseline; gap: 13px; margin-bottom: 18px; color: var(--impact-muted); font-family: var(--display-sans); }
        .impact-explorer__chart-readout span { font-size: .72rem; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; }
        .impact-explorer__chart-readout strong { color: var(--impact-navy); font-size: 1.25rem; font-weight: 700; }
        .impact-explorer__chart-readout small { font-size: .8rem; }
        .impact-explorer__chart-wrap { width: 100%; padding: 18px 18px 8px; overflow: hidden; border: 1px solid rgba(31,58,110,.18); background: #fff; }
        .impact-explorer__chart { display: block; width: 100%; min-width: 0; overflow: visible; }
        .impact-explorer__grid-line { stroke: rgba(31,58,110,.14); stroke-width: 1; stroke-dasharray: 2 5; }
        .impact-explorer__axis { stroke: rgba(31,58,110,.36); stroke-width: 1; }
        .impact-explorer__line { fill: none; stroke: #3C8D68; stroke-width: 3; vector-effect: non-scaling-stroke; }
        .impact-explorer__point-hit { fill: transparent; cursor: pointer; }
        .impact-explorer__point { fill: #F1F0EC; stroke: #3C8D68; stroke-width: 2; cursor: pointer; transition: r .25s ease, fill .25s ease; }
        .impact-explorer__point:hover, .impact-explorer__point:focus, .impact-explorer__point-hit:focus + .impact-explorer__point, .impact-explorer__point-label { outline: none; }
        .impact-explorer__point-label { fill: var(--impact-navy); font-family: var(--display-sans); font-size: 12px; font-weight: 700; pointer-events: none; }
        .impact-explorer__selected-line { stroke: rgba(60,141,104,.72); stroke-width: 1; stroke-dasharray: 4 4; pointer-events: none; transition: x1 .3s ease, x2 .3s ease, y1 .3s ease; }
        .impact-explorer__selected-point { fill: #3C8D68; stroke: #F1F0EC; stroke-width: 3; pointer-events: none; transition: cx .3s ease, cy .3s ease; }
        .impact-explorer__x-label, .impact-explorer__y-label { fill: #777982; font-family: var(--display-sans); font-size: 10px; }
        .impact-explorer__axis-note { margin: -5px 0 0 62px; color: #777982; font-family: var(--display-sans); font-size: .68rem; font-weight: 650; letter-spacing: .1em; text-transform: uppercase; }
        .impact-explorer__result { padding-left: clamp(24px, 4vw, 56px); border-left: 1px solid rgba(31,58,110,.2); }
        .impact-explorer__result .impact-eyebrow { margin-bottom: 12px; }
        .impact-explorer__result > strong { display: block; color: #000; font-family: var(--display-font); font-size: clamp(5rem, 10vw, 8rem); font-weight: 700; line-height: .78; letter-spacing: -.06em; }
        .impact-explorer__result > span { display: block; margin-top: 20px; color: #000; font-family: var(--display-sans); font-size: .82rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
        .impact-explorer__result > p:not(.impact-eyebrow):not(.impact-explorer__note) { margin: 16px 0 26px; color: var(--impact-muted); font-size: .98rem; line-height: 1.5; }
        .impact-explorer__students { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; min-height: 24px; }
        .impact-explorer__students i { display: block; width: 12px; height: 12px; border-radius: 50%; background: #3C8D68; }
        .impact-explorer__students b { color: var(--impact-navy); font-family: var(--display-sans); font-size: .8rem; }
        .impact-explorer__note { max-width: 300px; margin: 28px 0 24px; color: #777982; font-size: .75rem; line-height: 1.55; }
        .impact-explorer__cta { display: inline-flex; align-items: center; min-height: 36px; gap: 8px; padding: 7px 16px; border: 0; border-radius: 6px; background: #1F3A6E; color: #fff; font-family: var(--display-sans); font-size: .84rem; font-weight: 700; text-decoration: none; transition: transform .2s ease, background-color .35s ease; }
        .impact-explorer__cta:hover, .impact-explorer__cta:focus-visible { background: #E8593C; color: #fff; transform: translateY(-1px); }
        .impact-explorer .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
        .impact-supporters-section { padding: clamp(96px, 11vw, 132px) 0; border-top: 1px solid var(--impact-border); background: #fff; }
        .impact-supporters-heading { display: flex; justify-content: space-between; align-items: end; gap: 32px; margin-bottom: 42px; }
        .impact-supporters-heading h2 { margin: 0; color: var(--impact-navy); font-family: var(--display-sans); font-size: clamp(2rem, 3vw, 2.7rem); font-weight: 600; line-height: 1; letter-spacing: -.04em; }
        .impact-supporters-heading > p { max-width: 300px; margin: 0; color: var(--impact-muted); font-size: 1rem; line-height: 1.55; }
        .impact-supporter-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px clamp(20px, 4vw, 48px); }
        .impact-supporter { display: grid; align-items: start; min-width: 0; padding: 20px; border: 1px solid var(--impact-border); border-radius: 4px; background: #FAFAF8; transition: border-color .2s ease, background-color .2s ease; }
        .impact-supporter:hover { border-color: #BFC4CC; background: #FFFFFF; }
        .impact-supporter__details h3 { margin: 1px 0 2px; color: var(--impact-ink); font-family: var(--display-sans); font-size: 1rem; font-weight: 600; line-height: 1.3; }
        .impact-supporter__details p { margin: 0; color: var(--impact-muted); font-size: .82rem; line-height: 1.4; }
        .impact-supporters-toggle { margin-top: 28px; font-size: .88rem; }
        @media (max-width: 760px) { .impact-hero { min-height: 650px; background-position: 60% 32%; } .impact-hero__content { padding-top: 78px; } .impact-hero__grid { grid-template-columns: 1fr; gap: 48px; } .impact-hero__progress { justify-self: stretch; width: 100%; } .impact-hero__progress .impact-progress-visual { display: flex; flex-direction: column; align-items: center; width: 100%; } .impact-hero__progress .impact-progress-ring { flex: 0 0 auto; } .impact-explorer__intro { grid-template-columns: 1fr; gap: 24px; margin-bottom: 38px; } .impact-explorer__layout { grid-template-columns: 1fr; gap: 48px; padding-top: 44px; } .impact-explorer__result { grid-row: 1; padding: 0; border: 0; } .impact-explorer__chart-column { grid-row: 2; } .impact-explorer__chart-wrap { padding: 12px 6px 6px; } .impact-explorer__result > strong { font-size: clamp(5rem, 24vw, 7rem); } .impact-explorer__x-label--1050, .impact-explorer__x-label--2100, .impact-explorer__x-label--3150 { display: none; } .impact-explorer__axis-note { margin-left: 46px; } .impact-progress-section { padding-block: 88px 80px; } .impact-progress-layout { grid-template-columns: 1fr; gap: 64px; } .impact-progress-copy { max-width: 600px; } .impact-progress-visual { justify-self: center; } .impact-supporters-section { padding-block: 76px; } .impact-supporters-heading { display: grid; gap: 12px; align-items: start; margin-bottom: 30px; } .impact-supporters-heading > p { max-width: 360px; } .impact-supporter-list { grid-template-columns: 1fr; } }
        @media (max-width: 430px) { .impact-progress-section { padding-top: 72px; } .impact-progress-layout, .impact-supporters-section > .container { width: min(calc(100% - 40px), 1200px); } .impact-progress-copy h1 { font-size: clamp(2.65rem, 12vw, 3.2rem); } .impact-hero h1 { font-size: clamp(2.65rem, 12vw, 3.2rem); } .impact-supporter { padding: 16px; } .impact-supporter__details h3 { font-size: .94rem; } }
        @media (max-width: 640px) { .impact-explorer__layout { gap: 40px; } .impact-explorer__chart-readout { align-items: flex-start; flex-direction: column; gap: 6px; margin-bottom: 0; } .impact-explorer__chart-readout strong { font-size: 1.45rem; line-height: 1.1; } .impact-explorer__chart-readout small { font-size: .8rem; } .impact-explorer__chart-wrap { margin-top: 20px; padding: 10px 4px 6px; } .impact-explorer__axis-note { margin: 10px 0 0 46px; } }
        @media (prefers-reduced-motion: reduce) { .impact-progress-ring__arc, .impact-primary-link span, .impact-supporters-toggle span { transition: none; } }
      `}</style>
    </main>
  );
}
