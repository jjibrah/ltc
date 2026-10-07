import { Link } from 'react-router-dom';

const leadership = [
  { name: "Socrates Okong'o", role: 'Founder', bio: "University of Pennsylvania undergraduate and Starehe Boys' Centre alumnus.", image: '/images/socrates.jpg' },
  { name: 'Ricky Ouko', role: 'Co-Founder', bio: "Georgia State University undergraduate and Starehe Boys' Centre alumnus.", image: '/images/Ricky-Ouko.jpg' },
];

const rootedStages = [
  { label: '1976', title: 'Starehe VSS begins', description: 'A tradition of structured service and professional exposure takes root.' },
  { label: 'Today', title: 'Build permanent funding', description: 'Living the Charge turns that tradition into durable financial infrastructure.' },
  { label: 'Kenya', title: 'Expand across schools', description: 'More talented students gain access without cost becoming a barrier.' },
  { label: 'Africa', title: 'Build a wider network', description: 'A long-term opportunity network connects students, schools, and employers.' },
];

export default function Mission() {
  return (
    <main className="mission-page">
      <section className="mission-hero" aria-labelledby="mission-title">
        <div className="mission-hero__overlay" />
        <div className="container mission-hero__content">
          <h1 id="mission-title">Our mission</h1>
          <p>To bridge the gap between talent and opportunity by making meaningful professional experiences accessible to talented Kenyan students, regardless of their financial circumstances.</p>
        </div>
      </section>

      <section className="mission-belief" aria-labelledby="belief-title">
        <div className="container mission-belief__layout">
          <div>
            <p className="mission-eyebrow">What we believe</p>
            <h2 id="belief-title">Talent should never be limited by the cost of opportunity.</h2>
          </div>
          <div className="mission-belief__copy">
            <p>We believe every promising student deserves the chance to gain experience, build connections, and discover their potential.</p>
            <p>Living The Charge helps remove the everyday financial barriers such as transport, meals, and other participation costs that can keep students from accessing these opportunities.</p>
          </div>
        </div>
      </section>

      <section className="mission-image-section">
        <div className="container">
          <picture>
            <source
              type="image/avif"
              srcSet="/images/optimized/mission-640.avif 640w, /images/optimized/mission-960.avif 960w, /images/optimized/mission-1600.avif 1600w, /images/optimized/mission-1920.avif 1920w"
              sizes="(max-width: 640px) calc(100vw - 48px), 1200px"
            />
            <source
              type="image/webp"
              srcSet="/images/optimized/mission-640.webp 640w, /images/optimized/mission-960.webp 960w, /images/optimized/mission-1600.webp 1600w, /images/optimized/mission-1920.webp 1920w"
              sizes="(max-width: 640px) calc(100vw - 48px), 1200px"
            />
            <img
              src="/DSC_2170.JPG"
              srcSet="/images/optimized/mission-640.webp 640w, /images/optimized/mission-960.webp 960w, /images/optimized/mission-1600.webp 1600w, /images/optimized/mission-1920.webp 1920w"
              sizes="(max-width: 640px) calc(100vw - 48px), 1200px"
              width="4176"
              height="2784"
              alt="Students participating in a Living the Charge opportunity"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>
      </section>

      <section className="mission-rooted" aria-labelledby="rooted-title">
        <div className="container mission-rooted__content">
          <p className="mission-eyebrow">Our point of departure</p>
          <h2 id="rooted-title"><span>Rooted in Starehe.</span><span>Built for Africa.</span></h2>
          <div className="mission-rooted__copy">
            <p>Living the Charge builds on Starehe Boys’ Centre’s Voluntary Service Scheme, a programme that has connected students with service and professional exposure since <strong>1976</strong>.</p>
            <p>The model has historically depended on informal pledges and temporary funding. When resources fall short, students can lose access simply because basic participation costs cannot be covered.</p>
          </div>
          <ol className="mission-rooted__timeline">
            {rootedStages.map((stage, index) => (
              <li className="mission-rooted__stage" key={stage.label}>
                {index > 0 && <i aria-hidden="true" />}
                <span className="mission-rooted__stage-label">{stage.label}</span>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mission-leadership" aria-labelledby="leadership-title"><div className="container"><div className="mission-leadership__heading"><p className="mission-eyebrow">Leadership</p><h2 id="leadership-title">Built by people who understand the opportunity gap firsthand.</h2></div><div className="mission-leadership__grid">{leadership.map((person) => <article key={person.name}><img src={person.image} alt={person.name} loading="lazy" /><div><h3>{person.name}</h3><p className="mission-leadership__role">{person.role}</p><p>{person.bio}</p></div></article>)}</div><Link className="mission-text-link" to="/team">Meet the full team</Link></div></section>

      <section className="mission-cta" aria-labelledby="mission-cta-title"><div className="container"><p className="mission-eyebrow">Take part</p><h2 id="mission-cta-title">Help make opportunity accessible.</h2><p>Support a funding model designed to keep opening doors for students year after year.</p><div><Link to="/donate">Donate</Link><Link className="mission-cta__secondary" to="/stories">Read Student Stories</Link></div></div></section>

      <style>{`
        .mission-page { background: #FAFAF8; color: #1D1D31; }
        .mission-hero { position: relative; min-height: clamp(430px,55vw,620px); display: flex; align-items: center; overflow: hidden; color: #fff; background: url('/images/DSC_2001.JPG') center 45% / cover; background-image: image-set(url('/images/optimized/route-hero/mission-640.avif') type('image/avif'), url('/images/optimized/route-hero/mission-640.webp') type('image/webp'), url('/images/DSC_2001.JPG') type('image/jpeg')); }
        .mission-hero__overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,17,28,.78), rgba(8,17,28,.44) 55%, rgba(8,17,28,.1)); }
        .mission-hero__content { position: relative; z-index: 1; max-width: 1200px; padding-top: 92px; }
        .mission-eyebrow { margin: 0 0 16px; color: #777982; font-family: var(--display-sans); font-size: 11px; font-weight: 650; letter-spacing: .14em; text-transform: uppercase; }
        .mission-hero .mission-eyebrow { color: rgba(255,255,255,.75); }
        .mission-hero h1 { max-width: 760px; margin: 0 0 22px; color: #fff; font-family: var(--editorial-serif); font-size: clamp(3rem,6vw,5.8rem); font-style: normal; font-weight: 600; line-height: .96; letter-spacing: -.025em; }
        .mission-hero__content > p:last-child { max-width: 600px; margin: 0; color: rgba(255,255,255,.88); font-size: clamp(1rem,1.4vw,1.2rem); line-height: 1.6; }
        .mission-belief { padding: 104px 0; background: #fff; }
        .mission-belief__layout { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 86px; align-items: start; }
        .mission-belief h2, .mission-origins h2, .mission-model h2, .mission-leadership h2, .mission-cta h2 { max-width: 660px; margin: 0; color: #1D1D31; font-family: var(--display-sans); font-size: clamp(2.25rem,4.5vw,4rem); font-weight: 650; line-height: .98; letter-spacing: -.04em; }
        .mission-belief__copy { max-width: 590px; color: #62636B; font-size: 1.06rem; line-height: 1.7; }
        .mission-belief__copy p { margin: 0 0 24px; }
        .mission-image-section { padding: 0 0 104px; background: #fff; }
        .mission-image-section .container { position: relative; overflow: hidden; background: transparent; }
        .mission-image-section .container::after { content: none; }
        .mission-image-section picture { display: block; }
        .mission-image-section img { position: relative; z-index: 0; width: 100%; height: auto; display: block; border-radius: 4px; object-fit: contain; object-position: center; }
        .mission-rooted { padding: 112px 0 120px; background: #F1F0EC; }
        .mission-rooted__content { max-width: 1200px; }
        .mission-rooted h2 { max-width: 760px; margin: 0 0 30px; color: #1D1D31; font-family: var(--display-sans); font-size: clamp(3rem, 6vw, 5.25rem); font-weight: 650; line-height: .92; letter-spacing: -.035em; }
        .mission-rooted h2 span { display: block; }
        .mission-rooted__copy { max-width: 680px; color: #62636B; font-size: 1.04rem; line-height: 1.7; }
        .mission-rooted__copy p { margin: 0 0 22px; }
        .mission-rooted__copy p:last-child { margin-bottom: 0; }
        .mission-rooted__copy strong { position: relative; z-index: 0; color: #000; font-weight: 700; }
        .mission-rooted__copy strong::after { content: none; }
        .mission-rooted__timeline { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 96px 0 0; padding: 0; list-style: none; border-top: 1px solid #C8C8C5; border-bottom: 1px solid #C8C8C5; }
        .mission-rooted__stage { position: relative; min-width: 0; min-height: 218px; padding: 24px 24px 28px 0; }
        .mission-rooted__stage + .mission-rooted__stage { padding-left: 24px; border-left: 1px solid #C8C8C5; }
        .mission-rooted__stage > i { position: absolute; top: -1px; left: 24px; width: 9px; height: 9px; border-right: 1px solid #3C8D68; border-bottom: 1px solid #3C8D68; transform: translateY(-2px) rotate(45deg); background: #F1F0EC; }
        .mission-rooted__stage-label { display: block; color: #1D1D31; font-family: var(--display-sans); font-size: clamp(1.45rem, 2vw, 2rem); font-weight: 700; line-height: 1; letter-spacing: -.04em; }
        .mission-rooted__stage h3 { max-width: 180px; margin: 28px 0 10px; color: #1D1D31; font-family: var(--display-sans); font-size: 1rem; font-weight: 700; line-height: 1.2; }
        .mission-rooted__stage p { max-width: 210px; margin: 0; color: #62636B; font-size: .88rem; line-height: 1.55; }
        .mission-image-section .container { padding: 0; overflow: hidden; border-radius: 4px; }
        .mission-image-section img { width: 100%; max-width: 100%; height: auto; display: block; object-fit: contain; object-position: center; }
        .mission-origins { padding: 104px 0; background: #F1F0EC; }
        .mission-origins__heading { max-width: 720px; margin-bottom: 64px; }
        .mission-origins__heading > p:not(.mission-eyebrow) { max-width: 650px; margin: 24px 0 0; color: #62636B; font-size: 1.04rem; line-height: 1.65; }
        .mission-timeline { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); border-top: 1px solid #D3D3D5; }
        .mission-timeline__item { position: relative; min-width: 0; padding: 24px 24px 0 0; border-bottom: 1px solid #D3D3D5; }
        .mission-timeline__item + .mission-timeline__item { padding-left: 24px; border-left: 1px solid #D3D3D5; }
        .mission-timeline__item > span { color: #1D1D31; font-family: var(--display-sans); font-size: 1.6rem; font-weight: 700; letter-spacing: -.04em; }
        .mission-timeline__item h3 { margin: 22px 0 8px; color: #1D1D31; font-family: var(--display-sans); font-size: .98rem; font-weight: 650; }
        .mission-timeline__item p { margin: 0; color: #62636B; font-size: .86rem; line-height: 1.5; }
        .mission-timeline__item i { position: absolute; top: 30px; right: -8px; z-index: 1; color: #777982; font-style: normal; background: #F1F0EC; }
        .mission-model { padding: 104px 0; background: #1D1D31; color: #fff; }
        .mission-model .mission-eyebrow { color: rgba(255,255,255,.62); }
        .mission-model h2 { color: #fff; }
        .mission-model__intro { max-width: 620px; margin: 22px 0 52px; color: rgba(255,255,255,.76); font-size: 1.05rem; line-height: 1.65; }
        .mission-comparison { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); max-width: 920px; border-top: 1px solid rgba(255,255,255,.25); }
        .mission-comparison > div { display: grid; }
        .mission-comparison > div + div { padding-left: 34px; border-left: 1px solid rgba(255,255,255,.25); }
        .mission-comparison__label { margin: 0; padding: 20px 0 14px; color: rgba(255,255,255,.62); font-family: var(--display-sans); font-size: .74rem; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; }
        .mission-comparison span { padding: 14px 0; border-top: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.9); font-size: .95rem; }
        .mission-leadership { padding: 104px 0; background: #fff; }
        .mission-leadership__heading { max-width: 700px; margin-bottom: 52px; }
        .mission-leadership__grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 64px; max-width: 900px; }
        .mission-leadership__grid article { display: grid; grid-template-columns: 104px minmax(0,1fr); gap: 24px; align-items: start; }
        .mission-leadership__grid img { width: 104px; height: 104px; border-radius: 50%; object-fit: cover; object-position: center top; background: #e8e6e1; }
        .mission-leadership__grid h3 { margin: 0 0 5px; color: #1D1D31; font-family: var(--display-sans); font-size: 1.2rem; font-weight: 650; letter-spacing: -.02em; }
        .mission-leadership__role { margin: 0 0 14px !important; color: #777982 !important; font-family: var(--display-sans); font-size: .75rem !important; font-weight: 650; letter-spacing: .1em; text-transform: uppercase; }
        .mission-leadership__grid p { margin: 0; color: #62636B; font-size: .9rem; line-height: 1.55; }
        .mission-text-link { display: inline-block; margin-top: 48px; color: #1D1D31; font-family: var(--display-sans); font-size: .9rem; font-weight: 650; text-decoration: underline; text-underline-offset: 5px; }
        .mission-cta { padding: 112px 0; background: #F1F0EC; text-align: center; }
        .mission-cta .container { display: flex; flex-direction: column; align-items: center; }
        .mission-cta h2 { max-width: 700px; }
        .mission-cta > .container > p:not(.mission-eyebrow) { max-width: 520px; margin: 22px 0 30px; color: #62636B; font-size: 1.05rem; line-height: 1.6; }
        .mission-cta .container > div { display: flex; flex-wrap: wrap; justify-content: center; gap: 24px; }
        .mission-cta a { min-height: 50px; display: inline-flex; align-items: center; padding: 0 24px; border: 1px solid #1D1D31; border-radius: 4px; background: #1D1D31; color: #fff; font-family: var(--display-sans); font-size: .88rem; font-weight: 600; text-decoration: none; }
        .mission-cta a span { margin-left: 6px; }
        .mission-cta a.mission-cta__secondary { background: transparent; color: #1D1D31; }
        @media (min-width: 641px) { .mission-hero { background-image: image-set(url('/images/optimized/route-hero/mission-960.avif') type('image/avif'), url('/images/optimized/route-hero/mission-960.webp') type('image/webp'), url('/images/DSC_2001.JPG') type('image/jpeg')); } }
        @media (min-width: 1200px) { .mission-hero { background-image: image-set(url('/images/optimized/route-hero/mission-1600.avif') type('image/avif'), url('/images/optimized/route-hero/mission-1600.webp') type('image/webp'), url('/images/DSC_2001.JPG') type('image/jpeg')); } }
        @media (min-width: 1600px) { .mission-hero { background-image: image-set(url('/images/optimized/route-hero/mission-1920.avif') type('image/avif'), url('/images/optimized/route-hero/mission-1920.webp') type('image/webp'), url('/images/DSC_2001.JPG') type('image/jpeg')); } }
        @media (max-width: 900px) { .mission-belief__layout { grid-template-columns: 1fr; gap: 40px; } .mission-rooted { padding-block: 88px; } .mission-rooted__timeline { margin-top: 72px; } .mission-rooted__stage { padding-right: 16px; } .mission-rooted__stage + .mission-rooted__stage { padding-left: 16px; } .mission-rooted__stage > i { left: 16px; } .mission-timeline { grid-template-columns: repeat(2,minmax(0,1fr)); } .mission-timeline__item:nth-child(3) { padding-left: 0; border-left: 0; } .mission-timeline__item:nth-child(n+3) { margin-top: 24px; } .mission-leadership__grid { gap: 36px; } }
        @media (max-width: 640px) { .mission-hero { min-height: 470px; background-position: 60% center; } .mission-hero__content { padding-top: 78px; } .mission-belief, .mission-rooted, .mission-origins, .mission-model, .mission-leadership { padding: 72px 0; } .mission-rooted h2 { font-size: clamp(2.7rem, 13vw, 4rem); } .mission-rooted__copy { font-size: 1rem; } .mission-rooted__timeline { display: block; margin-top: 64px; border-top: 1px solid #C8C8C5; border-bottom: 0; } .mission-rooted__stage, .mission-rooted__stage + .mission-rooted__stage { min-height: 0; padding: 26px 0 28px 34px; border-left: 1px solid #C8C8C5; border-bottom: 1px solid #C8C8C5; } .mission-rooted__stage:last-child { border-bottom: 1px solid #C8C8C5; } .mission-rooted__stage > i { top: -5px; left: -5px; width: 9px; height: 9px; transform: rotate(45deg); } .mission-rooted__stage:first-child { padding-top: 26px; } .mission-rooted__stage h3, .mission-rooted__stage p { max-width: 100%; } .mission-rooted__stage h3 { margin-top: 18px; } .mission-image-section { padding-bottom: 72px; } .mission-image-section .container { width: calc(100% - 48px); min-height: 0; } .mission-image-section img { width: 100%; height: auto; min-height: 0; object-fit: contain; object-position: center; } .mission-timeline { grid-template-columns: 1fr; } .mission-timeline__item, .mission-timeline__item + .mission-timeline__item, .mission-timeline__item:nth-child(3), .mission-timeline__item:nth-child(n+3) { margin-top: 0; padding: 22px 0 22px 34px; border-left: 1px solid #D3D3D5; border-bottom: 1px solid #D3D3D5; } .mission-timeline__item i { top: auto; right: auto; bottom: -8px; left: -7px; transform: rotate(90deg); } .mission-timeline__item:last-child { border-bottom: 0; } .mission-comparison { grid-template-columns: 1fr; } .mission-comparison > div + div { padding-left: 0; border-top: 1px solid rgba(255,255,255,.25); border-left: 0; } .mission-leadership__grid { grid-template-columns: 1fr; } .mission-leadership__grid article { grid-template-columns: 84px minmax(0,1fr); gap: 18px; } .mission-leadership__grid img { width: 84px; height: 84px; } .mission-cta { padding: 80px 0; } .mission-cta .container > div { width: 100%; flex-direction: column; gap: 12px; } .mission-cta a { width: 100%; justify-content: center; } }
      `}</style>
    </main>
  );
}
