import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScrollReveal from '../../shared/components/feedback/ScrollReveal';
import { apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

const HELP_OPTIONS = [
  { title: 'Career Guidance', description: 'Share your journey, career advice, university guidance, and lessons you wish you had known.', icon: 'M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z' },
  { title: 'Practical Exposure', description: 'Offer job shadowing, workplace exposure, or insight into what your profession looks like.', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M12 9h.01M15 9h.01' },
  { title: 'Skills & Workshops', description: 'Teach something you know well: coding, public speaking, finance, research, design, or another practical skill.', icon: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4' },
  { title: 'Connections & Mentorship', description: 'Be a role model, answer questions, or introduce a student to someone who can help them move forward.', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
];

const FORM_INITIAL = { name: '', email: '', background: '', helpOptions: [], contactMethod: 'Email', message: '' };

function Icon({ path }) {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}

export default function MentorAStudent() {
  const navigate = useNavigate();
  const [form, setForm] = useState(FORM_INITIAL);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scrollToForm = () => document.getElementById('mentor-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const toggleHelp = (title) => {
    setForm((current) => ({
      ...current,
      helpOptions: current.helpOptions.includes(title)
        ? current.helpOptions.filter((item) => item !== title)
        : [...current.helpOptions, title],
    }));
    setErrors((current) => ({ ...current, helpOptions: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Please enter your name.';
    if (!form.email.trim()) nextErrors.email = 'Please enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Please enter a valid email address.';
    if (!form.background.trim()) nextErrors.background = 'Please tell us about your professional background.';
    if (!form.helpOptions.length) nextErrors.helpOptions = 'Choose at least one way you would like to help.';
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    setErrors({});

    try {
      await apiRequest(endpoints.mentorApplications, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(FORM_INITIAL);
      setSubmitted(true);
    } catch (error) {
      setErrors({
        form: error?.message || 'We could not submit your application. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mentor-page">
      <section className="mentor-hero" aria-labelledby="mentor-title">
        <div className="mentor-hero__overlay" />
        <div className="container mentor-hero__content">
          <ScrollReveal>
            <p className="mentor-eyebrow">Mentor a student</p>
            <h1 id="mentor-title">Moving beyond donations</h1>
          </ScrollReveal>
        </div>
      </section>

      <section className="mentor-help-section" aria-labelledby="help-title">
        <div className="container">
          <header className="mentor-section-intro">
            <ScrollReveal>
              <h2 id="help-title">How You Can Help</h2>
              <p>We All Have Something to Offer. Here's how you can Live the Charge.</p>
            </ScrollReveal>
          </header>
          <div className="mentor-help-grid">
            {HELP_OPTIONS.map((option, index) => (
              <ScrollReveal key={option.title} delay={`${index * 0.06}s`}>
                <article className="mentor-help-card">
                  <div className="mentor-help-card__header">
                    <div className="mentor-help-card__icon"><Icon path={option.icon} /></div>
                  </div>
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mentor-who-section" aria-labelledby="who-title">
        <div className="container mentor-who-grid">
          <ScrollReveal>
            <p className="mentor-eyebrow">Who can mentor?</p>
            <h2 id="who-title">We all have something to offer</h2>
            <p>If your experience could help a young person find direction, you have something valuable to share.</p>
            <p>Lawyers, engineers, doctors, entrepreneurs, artists, researchers, tradespeople, athletes, and professionals from every background are welcome.</p>
          </ScrollReveal>
          <ScrollReveal delay="0.12s">
            <div className="mentor-who-note">
              <span aria-hidden="true">“</span>
              <p>A mentor is someone who sees more talent and ability within you, than you see in yourself, and helps bring it out of you.</p>
              <cite>— Bob Proctor</cite>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mentor-steps-section" aria-labelledby="steps-title">
        <div className="container">
          <header className="mentor-section-intro">
            <ScrollReveal>
              <h2 id="steps-title">How It Works</h2>
              <p>Simple, flexible, and built around your availability.</p>
            </ScrollReveal>
          </header>
          <div className="mentor-steps-grid">
            {[
              ['01', 'Tell Us About Yourself', 'Complete a short form and tell us how you would like to contribute.'],
              ['02', 'We Find the Right Match', 'We connect you with a student whose interests align with your experience.'],
              ['03', 'Mentor Your Way', 'Connect virtually or in person. You decide how much time you can give and how you would like to help.'],
            ].map(([number, title, description]) => (
              <ScrollReveal key={number}>
                <article className="mentor-step">
                  <span className="mentor-step__number">{number}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="mentor-form" className="mentor-form-section" aria-labelledby="form-title">
        <div className="container mentor-form-container">
          <header className="mentor-section-intro">
            <ScrollReveal>
              <p className="mentor-eyebrow">Expression of interest</p>
              <h2 id="form-title">Become a Mentor</h2>
              <p className="mentor-form-intro">Tell us a little about yourself. Our team will contact you to explore where your experience could have the greatest impact.</p>
            </ScrollReveal>
          </header>

          {submitted ? (
            <div className="mentor-success" role="status">
              <span className="mentor-success__mark" aria-hidden="true">✓</span>
              <h3>Thank You for Stepping Forward.</h3>
              <p>We've received your expression of interest. The Living the Charge team will be in touch with the next steps.</p>
              <div className="mentor-success__actions">
                <button type="button" className="mentor-secondary-button" onClick={() => navigate('/')}>Return Home</button>
                <button type="button" className="mentor-text-button" onClick={() => navigate('/stories')}>Read Student Stories</button>
              </div>
            </div>
          ) : (
            <form className="mentor-form" onSubmit={handleSubmit} noValidate>
              <div className="mentor-form__row">
                <div className="mentor-field">
                  <label htmlFor="mentor-name">Full Name <span>*</span></label>
                  <input id="mentor-name" name="name" value={form.name} onChange={updateField} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'mentor-name-error' : undefined} />
                  {errors.name && <p id="mentor-name-error" className="mentor-error">{errors.name}</p>}
                </div>
                <div className="mentor-field">
                  <label htmlFor="mentor-email">Email Address <span>*</span></label>
                  <input id="mentor-email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'mentor-email-error' : undefined} />
                  {errors.email && <p id="mentor-email-error" className="mentor-error">{errors.email}</p>}
                </div>
              </div>

              <div className="mentor-field">
                <label htmlFor="mentor-background">Professional Background / Industry <span>*</span></label>
                <input id="mentor-background" name="background" value={form.background} onChange={updateField} placeholder="e.g. Software engineering, education, law" aria-invalid={Boolean(errors.background)} aria-describedby={errors.background ? 'mentor-background-error' : undefined} />
                {errors.background && <p id="mentor-background-error" className="mentor-error">{errors.background}</p>}
              </div>

              <fieldset className="mentor-field mentor-options-fieldset">
                <legend>How Would You Like to Help? <span>*</span></legend>
                <div className="mentor-options-grid">
                  {['Career Guidance', 'Job Shadowing', 'Skills Workshop', 'Networking / Introductions', 'University Guidance', 'Other'].map((option) => {
                    const selected = form.helpOptions.includes(option);
                    return <button key={option} type="button" className={`mentor-option${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => toggleHelp(option)}>{selected ? '✓ ' : ''}{option}</button>;
                  })}
                </div>
                {errors.helpOptions && <p className="mentor-error">{errors.helpOptions}</p>}
              </fieldset>

              <div className="mentor-field">
                <label htmlFor="mentor-message">Anything Else You'd Like to Share? <em>(Optional)</em></label>
                <textarea id="mentor-message" name="message" rows="4" value={form.message} onChange={updateField} placeholder="Anything that could help us understand how you would like to contribute." />
              </div>

              {errors.form && <p className="mentor-error mentor-error--form" role="alert">{errors.form}</p>}
              <button type="submit" className="mentor-submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Become a Mentor'}</button>
              <p className="mentor-form-note">This is a frontend expression of interest. We will only use your details to follow up about mentorship.</p>
            </form>
          )}
        </div>
      </section>

      <section className="mentor-closing" aria-labelledby="closing-title">
        <div className="container">
          <h2 id="closing-title">Help Open a Door.</h2>
          <p>Give your time, experience, or financial support and help a student access opportunities they may otherwise never encounter.</p>
          <div className="mentor-closing__actions">
            <button type="button" className="mentor-primary-button" onClick={scrollToForm}>Become a Mentor</button>
            <button type="button" className="mentor-secondary-button" onClick={() => navigate('/donate')}>Donate</button>
          </div>
        </div>
      </section>

      <style>{`
        .mentor-page { --mentor-ink: #1D1D31; --mentor-muted: #62636B; --mentor-border: #DFE0E4; --mentor-bg: #F7F7F5; background: var(--mentor-bg); color: var(--mentor-ink); overflow: hidden; }
        .mentor-hero { position: relative; min-height: 540px; display: flex; align-items: center; padding: 132px 0 72px; overflow: hidden; color: #fff; background: #172b3c url('/images/DSC_1910.JPG') center 15% / cover no-repeat; background-image: image-set(url('/images/optimized/route-hero/mentor-640.avif') type('image/avif'), url('/images/optimized/route-hero/mentor-640.webp') type('image/webp'), url('/images/DSC_1910.JPG') type('image/jpeg')); }
        .mentor-hero__overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(7,25,21,.82), rgba(7,25,21,.54) 46%, rgba(7,25,21,.12)); }
        @media (min-width: 641px) { .mentor-hero { background-image: image-set(url('/images/optimized/route-hero/mentor-960.avif') type('image/avif'), url('/images/optimized/route-hero/mentor-960.webp') type('image/webp'), url('/images/DSC_1910.JPG') type('image/jpeg')); } }
        @media (min-width: 1200px) { .mentor-hero { background-image: image-set(url('/images/optimized/route-hero/mentor-1600.avif') type('image/avif'), url('/images/optimized/route-hero/mentor-1600.webp') type('image/webp'), url('/images/DSC_1910.JPG') type('image/jpeg')); } }
        @media (min-width: 1600px) { .mentor-hero { background-image: image-set(url('/images/optimized/route-hero/mentor-1920.avif') type('image/avif'), url('/images/optimized/route-hero/mentor-1920.webp') type('image/webp'), url('/images/DSC_1910.JPG') type('image/jpeg')); } }
        .mentor-hero__content { position: relative; z-index: 1; }
        .mentor-hero h1 { max-width: 760px; margin: 0 0 22px; color: #fff; font-family: var(--editorial-serif); font-size: clamp(3.25rem, 6vw, 5.3rem); font-style: normal; font-weight: 600; line-height: .96; letter-spacing: -.035em; text-wrap: balance; }
        .mentor-hero h1 span { color: #fff; }
        .mentor-hero p { max-width: 590px; margin: 0; color: rgba(255,255,255,.9); font-size: clamp(1.05rem,1.4vw,1.25rem); line-height: 1.55; }
        .mentor-hero small { display: block; margin-top: 15px; color: rgba(255,255,255,.72); font-size: .78rem; }
        .mentor-primary-button, .mentor-secondary-button { min-height: 50px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 0 22px; border: 1px solid var(--mentor-ink); border-radius: 4px; font-family: var(--display-sans); font-size: .9rem; font-weight: 600; cursor: pointer; transition: background .18s ease, color .18s ease, transform .18s ease; }
        .mentor-primary-button { margin-top: 28px; border-color: #fff; background: #fff; color: var(--mentor-ink); }
        .mentor-primary-button:hover, .mentor-primary-button:focus-visible { background: #ecebf0; transform: translateY(-1px); outline: none; }
        .mentor-secondary-button { background: transparent; color: var(--mentor-ink); }
        .mentor-secondary-button:hover, .mentor-secondary-button:focus-visible { background: var(--mentor-ink); color: #fff; outline: none; }
        .mentor-help-section, .mentor-steps-section { padding: clamp(76px,9vw,116px) 0; background: #fff; }
        .mentor-section-intro { max-width: 760px; margin: 0 0 44px; text-align: left; }
        .mentor-section-intro h2, .mentor-who-section h2, .mentor-closing h2 { margin: 0 0 14px; color: var(--mentor-ink); font-family: var(--display-sans); font-size: clamp(2.2rem,4.2vw,4rem); font-weight: 700; line-height: 1; letter-spacing: -.04em; text-wrap: balance; }
        .mentor-section-intro > p:not(.mentor-eyebrow), .mentor-who-section p, .mentor-closing p { color: var(--mentor-muted); font-size: 1rem; line-height: 1.65; }
        .mentor-section-intro > p:not(.mentor-eyebrow) { max-width: 520px; margin: 18px 0 0; }
        .mentor-help-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 0; border-top: 1px solid var(--mentor-border); border-bottom: 1px solid var(--mentor-border); }
        .mentor-help-card { position: relative; min-height: 236px; padding: 28px 24px 30px; border: 0; border-radius: 0; background: #fff; transition: background .2s ease; display: flex; flex-direction: column; }
        .mentor-help-grid > div:not(:last-child) .mentor-help-card { border-right: 1px solid var(--mentor-border); }
        .mentor-help-grid > div:nth-child(n+3) .mentor-help-card { border-top: 1px solid var(--mentor-border); }
        .mentor-help-card:hover { background: #FAFAF8; }
        .mentor-help-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .mentor-help-card__icon { width: 38px; height: 38px; border: 1px solid #000; border-radius: 4px; background: #fff; color: #000; display: grid; place-items: center; transition: background .2s ease, color .2s ease; }
        .mentor-help-card:hover .mentor-help-card__icon { background: #000; color: #fff; }
        .mentor-help-card h3 { margin: 0 0 10px; color: #000; font-family: var(--display-sans); font-size: 1.12rem; font-weight: 700; letter-spacing: -.02em; }
        .mentor-help-card p { max-width: 430px; margin: 0; color: #62636B; font-size: .92rem; line-height: 1.6; }
        .mentor-who-section { position: relative; isolation: isolate; padding: clamp(76px,9vw,116px) 0; background: radial-gradient(ellipse at center, rgba(8,12,27,.18) 20%, rgba(8,12,27,.72) 100%), linear-gradient(90deg, rgba(8,12,27,.9) 0%, rgba(8,12,27,.76) 52%, rgba(8,12,27,.55) 100%), url('/images/DSC_1878.JPG') center 42% / cover no-repeat; }
        .mentor-who-grid { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(260px,.75fr); gap: clamp(48px,8vw,110px); align-items: center; }
        .mentor-eyebrow { margin: 0 0 14px !important; color: rgba(255,255,255,.78) !important; font-family: var(--display-sans); font-size: .72rem !important; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; }
        .mentor-who-section h2 { max-width: 620px; color: #fff; }
        .mentor-who-section p + p { margin-top: 16px; }
        .mentor-who-section p:not(.mentor-eyebrow) { color: #fff !important; }
        .mentor-who-note { position: relative; padding: 34px 32px; border-left: 2px solid #D4A96A; background: rgba(8,12,27,.22); backdrop-filter: blur(2px); }
        .mentor-who-note span { display: block; color: #D4A96A; font-family: var(--editorial-serif); font-size: 4rem; line-height: .6; }
        .mentor-who-note p { margin: 16px 0 0; color: #fff !important; font-family: var(--editorial-serif); font-size: clamp(1.35rem,2.4vw,2rem); line-height: 1.2; }
        .mentor-who-note cite { display: block; margin-top: 18px; color: rgba(255,255,255,.72); font-family: var(--display-sans); font-size: .72rem; font-style: normal; letter-spacing: .08em; text-transform: uppercase; }
        .mentor-steps-grid { position: relative; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 30px; }
        .mentor-step { position: relative; padding-top: 18px; border-top: 1px solid var(--mentor-border); }
        .mentor-step__number { display: block; margin-bottom: 30px; color: var(--mentor-muted); font-family: var(--display-sans); font-size: .78rem; font-weight: 650; letter-spacing: .12em; }
        .mentor-step h3 { margin: 0 0 12px; color: #000; font-family: var(--display-sans); font-size: 1.18rem; font-weight: 800; line-height: 1.2; letter-spacing: -.015em; }
        .mentor-form-section { position: relative; isolation: isolate; padding: clamp(76px,9vw,116px) 0; background: radial-gradient(circle at 88% 12%, rgba(92,94,128,.42), transparent 34%), linear-gradient(135deg, #141427 0%, #1D1D31 56%, #29283D 100%); scroll-margin-top: 88px; }
        .mentor-form-section .mentor-section-intro h2 { color: #fff; }
        .mentor-form-section .mentor-section-intro > p:not(.mentor-eyebrow) { color: #fff; }
        .mentor-form-section .mentor-form-intro { color: #fff !important; }
        .mentor-form-section .mentor-eyebrow { color: rgba(255,255,255,.68) !important; }
        .mentor-form-container { max-width: 780px; }
        .mentor-form { padding: clamp(28px,6vw,48px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 16px; background: #fff; box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.28), 0 4px 16px rgba(0, 0, 0, 0.08); }
        .mentor-form__row { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
        .mentor-field { margin-bottom: 22px; }
        .mentor-field label, .mentor-field legend { display: block; margin-bottom: 8px; color: var(--mentor-ink); font-family: var(--display-sans); font-size: .82rem; font-weight: 600; }
        .mentor-field label span, .mentor-field legend span { color: #A12626; }
        .mentor-field label em { color: var(--mentor-muted); font-style: normal; font-weight: 400; }
        .mentor-field input, .mentor-field textarea { width: 100%; min-height: 52px; padding: 14px 18px; border: 1.5px solid #E2E2DF; border-radius: 8px; background: #FAF9F6; color: var(--mentor-ink); font: 400 15px/1.5 var(--body-sans); outline: none; transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
        .mentor-field textarea { min-height: 120px; resize: vertical; }
        .mentor-field input::placeholder, .mentor-field textarea::placeholder { color: #A0A09C; font-weight: 400; }
        .mentor-field input:hover, .mentor-field textarea:hover { background: #fff; border-color: #C8C8C2; }
        .mentor-field input:focus, .mentor-field textarea:focus { background: #fff; border-color: #1D1D31; box-shadow: 0 0 0 4px rgba(212, 169, 106, 0.22), 0 2px 10px rgba(0, 0, 0, 0.04); }
        .mentor-options-fieldset { padding: 0; border: 0; }
        .mentor-options-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; }
        .mentor-option { min-height: 48px; padding: 0 16px; border: 1.5px solid #E2E2DF; border-radius: 8px; background: #FAF9F6; color: var(--mentor-ink); font: 500 .86rem/1.3 var(--display-sans); text-align: left; cursor: pointer; transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
        .mentor-option:hover { background: #fff; border-color: #C8C8C2; transform: translateY(-1px); }
        .mentor-option.is-selected { border-color: #1D1D31; background: #1D1D31; color: #fff; box-shadow: 0 4px 14px rgba(29, 29, 49, 0.16); transform: translateY(-1px); }
        .mentor-submit { width: 100%; min-height: 54px; border: 0; border-radius: 8px; background: #1D1D31; color: #fff; font: 600 .92rem var(--display-sans); cursor: pointer; box-shadow: 0 4px 16px rgba(29, 29, 49, 0.18); transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
        .mentor-submit:hover, .mentor-submit:focus-visible { background: #29283D; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(29, 29, 49, 0.24); outline: none; }
        .mentor-submit:disabled { cursor: wait; opacity: .56; }
        .mentor-form-note { margin: 14px 0 0; color: var(--mentor-muted); font-size: .75rem; line-height: 1.5; text-align: center; }
        .mentor-error { margin: 7px 0 0; color: #A12626; font-size: .78rem; line-height: 1.4; }
        .mentor-error--form { margin: 0 0 14px; text-align: center; }
        .mentor-success { padding: clamp(28px,6vw,54px); border: 1px solid var(--mentor-border); background: #fff; text-align: center; }
        .mentor-success__mark { width: 50px; height: 50px; display: grid; place-items: center; margin: 0 auto 20px; border: 1px solid var(--mentor-ink); border-radius: 50%; color: var(--mentor-ink); font-size: 1.35rem; }
        .mentor-success h3 { margin: 0 0 12px; color: var(--mentor-ink); font-family: var(--display-sans); font-size: clamp(1.5rem,3vw,2.2rem); }
        .mentor-success p { max-width: 530px; margin: 0 auto; color: var(--mentor-muted); line-height: 1.65; }
        .mentor-success__actions, .mentor-closing__actions { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 14px; margin-top: 26px; }
        .mentor-text-button { padding: 10px 0; border: 0; background: transparent; color: var(--mentor-ink); font: 600 .86rem var(--display-sans); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
        .mentor-closing { padding: clamp(68px,8vw,104px) 0; background: var(--mentor-bg); text-align: center; }
        .mentor-closing p { max-width: 620px; margin: 0 auto; }
        .mentor-closing .mentor-primary-button { background: var(--mentor-ink); border-color: var(--mentor-ink); color: #fff; margin-top: 0; }
        .mentor-closing .mentor-primary-button:hover { background: #29283D; }
        .mentor-closing .mentor-secondary-button { margin-top: 0; }
        @media (max-width: 900px) {
          .mentor-hero { min-height: 500px; padding-block: 120px 64px; }
          .mentor-who-grid { grid-template-columns: 1fr; gap: 36px; }
          .mentor-help-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .mentor-help-grid > div .mentor-help-card { border-right: 0; }
          .mentor-help-grid > div:nth-child(odd) .mentor-help-card { border-right: 1px solid var(--mentor-border); }
        }
        @media (max-width: 700px) {
          .mentor-help-section, .mentor-steps-section, .mentor-who-section, .mentor-form-section { padding-block: 64px; }
          .mentor-help-grid, .mentor-steps-grid { grid-template-columns: 1fr; }
          .mentor-help-grid { grid-template-columns: 1fr; }
          .mentor-help-grid > div:not(:last-child) .mentor-help-card { border-right: 0; }
          .mentor-help-grid > div:nth-child(n+2) .mentor-help-card { border-top: 1px solid var(--mentor-border); }
          .mentor-help-card { min-height: 0; padding: 24px 0; }
          .mentor-step { padding: 20px 0 0 58px; }
          .mentor-step__number { position: absolute; top: 20px; left: 0; margin: 0; }
          .mentor-form__row { grid-template-columns: 1fr; gap: 0; }
          .mentor-section-intro { margin-bottom: 30px; }
        }
        @media (max-width: 480px) {
          .mentor-hero { min-height: 520px; padding: 116px 0 58px; background-position: 58% 25%; }
          .mentor-hero h1 { font-size: clamp(2.7rem, 12vw, 3.7rem); }
          .mentor-hero p { font-size: 1rem; }
          .mentor-hero .mentor-primary-button { width: 100%; }
          .mentor-form { padding: 22px 18px; }
          .mentor-who-section { background-image: radial-gradient(ellipse at center, rgba(8,12,27,.18) 20%, rgba(8,12,27,.72) 100%), linear-gradient(90deg, rgba(8,12,27,.9) 0%, rgba(8,12,27,.76) 52%, rgba(8,12,27,.55) 100%), url('/images/DSC_1878.JPG'); background-position: center 42%; }
          .mentor-options-grid { grid-template-columns: 1fr; }
          .mentor-closing__actions, .mentor-success__actions { align-items: stretch; flex-direction: column; }
          .mentor-closing__actions > *, .mentor-success__actions > * { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mentor-help-card, .mentor-primary-button, .mentor-secondary-button, .mentor-option, .mentor-submit { transition: none; }
        }
      `}</style>
    </div>
  );
}
