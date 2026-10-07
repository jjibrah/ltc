const formatCurrency = (value, currency = 'USD') => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency,
  maximumFractionDigits: 0,
}).format(Number.isFinite(value) ? value : 0);

export default function CampaignProgressCard({
  raised = 0,
  pledged = 0,
  goal = 0,
  currency = 'USD',
  title = 'Campaign Progress',
  ctaLabel = 'Donate',
  onCta,
}) {
  const safeRaised = Number.isFinite(Number(raised)) ? Number(raised) : 0;
  const safePledged = Number.isFinite(Number(pledged)) ? Number(pledged) : 0;
  const safeGoal = Number.isFinite(Number(goal)) ? Number(goal) : 0;
  const safeTotal = safeRaised + safePledged;
  const displayPercentage = safeGoal > 0 ? (safeTotal / safeGoal) * 100 : 0;
  const receivedWidth = safeGoal > 0 ? Math.min((safeRaised / safeGoal) * 100, 100) : 0;
  const pledgedWidth = safeGoal > 0 ? Math.min((safePledged / safeGoal) * 100, Math.max(0, 100 - receivedWidth)) : 0;
  const progressLabel = `Campaign has received ${formatCurrency(safeRaised, currency)} and has ${formatCurrency(safePledged, currency)} pledged, for a total of ${formatCurrency(safeTotal, currency)} toward ${formatCurrency(safeGoal, currency)}.`;

  return (
    <section className="campaign-progress-card" aria-label={title}>
      <div className="campaign-progress-card__header">
        <span className="campaign-progress-card__eyebrow">{title}</span>
      </div>
      <div className="campaign-progress-card__body">
        <div className="campaign-progress-card__chart" role="img" aria-label={progressLabel}>
          <div className="campaign-progress-card__bar" aria-hidden="true"><span className="campaign-progress-card__received" style={{ width: `${receivedWidth}%` }} /><span className="campaign-progress-card__pledged" style={{ width: `${pledgedWidth}%` }} /></div>
          <div className="campaign-progress-card__scale"><span>{formatCurrency(safeRaised, currency)}</span><span>{formatCurrency(safeGoal, currency)}</span></div>
          <div className="campaign-progress-card__legend"><span><i className="is-received" /> Received</span><span><i className="is-pledged" /> Pledged</span></div>
          <dl className="campaign-progress-card__amounts"><div><dt>Received amount:</dt><dd>{formatCurrency(safeRaised, currency)}</dd></div><div><dt>Pledged amount:</dt><dd>{formatCurrency(safePledged, currency)}</dd></div><div><dt>Total amount:</dt><dd>{formatCurrency(safeTotal, currency)}</dd></div></dl>
        </div>
      </div>
      <p className="campaign-progress-card__funded">{Math.min(displayPercentage, 100).toFixed(1)}% of goal covered</p>
      <button className="campaign-progress-card__cta" type="button" onClick={onCta}>{ctaLabel} <span aria-hidden="true">→</span></button>
      <style>{`
        .campaign-progress-card { padding: clamp(20px,3vw,28px); border: 1px solid rgba(29,29,49,.12); border-radius: 4px; background: #fff; }
        .campaign-progress-card__header { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 18px; text-align: center; }
        .campaign-progress-card__eyebrow { color: #1D1D31; font-family: var(--display-sans); font-size: .74rem; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; }
        .campaign-progress-card__body { display: block; }
        .campaign-progress-card__chart { width: 100%; margin-inline: auto; }
        .campaign-progress-card__bar { position: relative; display: flex; width: 100%; height: 28px; overflow: hidden; border-radius: 999px; background: #E4E4E7; }
        .campaign-progress-card__bar span { display: block; height: 100%; transition: width 700ms cubic-bezier(.22,1,.36,1); }
        .campaign-progress-card__received { background: #1D1D31; }
        .campaign-progress-card__pledged { background: #D4A96A; }
        .campaign-progress-card__scale, .campaign-progress-card__legend { display: flex; justify-content: space-between; color: #777982; font-family: var(--display-sans); font-size: .68rem; font-weight: 600; }
        .campaign-progress-card__scale { margin-top: 7px; }
        .campaign-progress-card__legend { justify-content: center; gap: 18px; margin-top: 17px; }
        .campaign-progress-card__legend span { display: inline-flex; align-items: center; gap: 6px; }
        .campaign-progress-card__legend i { width: 9px; height: 9px; display: inline-block; border-radius: 50%; }
        .campaign-progress-card__legend i.is-received { background: #1D1D31; }
        .campaign-progress-card__legend i.is-pledged { background: #D4A96A; }
        .campaign-progress-card__amounts { display: grid; gap: 7px; margin: 16px 0 0; padding-top: 13px; border-top: 1px solid #E4E4E7; }
        .campaign-progress-card__amounts div { display: flex; justify-content: space-between; gap: 12px; color: #777982; font-family: var(--display-sans); font-size: .78rem; }
        .campaign-progress-card__amounts dd { margin: 0; color: #1D1D31; font-weight: 700; }
        .campaign-progress-card__funded { margin: 14px 0 0; color: #777982; font-family: var(--display-sans); font-size: .8rem; font-weight: 600; text-align: center; }
        .campaign-progress-card__cta { display: block; min-height: 48px; margin: 24px auto 0; padding: 0 22px; border: 0; border-radius: 4px; background: #1D1D31; color: #fff; font-family: var(--display-sans); font-size: .88rem; font-weight: 600; cursor: pointer; transition: background .2s ease, transform .2s ease; }
        .campaign-progress-card__cta:hover { background: #29283D; transform: translateY(-1px); }
        .campaign-progress-card__cta span { display: inline-block; margin-left: 5px; transition: transform .2s ease; }
        .campaign-progress-card__cta:hover span { transform: translateX(3px); }
        @media (max-width: 600px) { .campaign-progress-card { padding: 22px 20px; } .campaign-progress-card__cta { width: 100%; } }
        @media (prefers-reduced-motion: reduce) { .campaign-progress-card__bar span, .campaign-progress-card__cta, .campaign-progress-card__cta span { transition: none; } }
      `}</style>
    </section>
  );
}
