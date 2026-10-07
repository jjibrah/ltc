import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import TeamCard from './TeamCard';
import TeamModal from './TeamModal';
import ScrollReveal from '../../shared/components/feedback/ScrollReveal';
import { teamProfilesService } from '../../services/teamProfiles/teamProfiles.service';

const ALL_DEPTS = 'All';

export default function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterDept, setFilterDept] = useState(ALL_DEPTS);

  useEffect(() => {
    teamProfilesService.getPublished().then(setTeamMembers).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);

  const departments = useMemo(() => {
    const unique = [...new Set(teamMembers.map(m => m.department))];
    return [ALL_DEPTS, ...unique];
  }, [teamMembers]);

  const filtered = useMemo(() => {
    if (filterDept === ALL_DEPTS) return teamMembers;
    return teamMembers.filter(m => m.department === filterDept);
  }, [filterDept, teamMembers]);

  const leadership = filtered.filter((member) => member.department === 'Leadership');
  const widerTeam = filtered.filter((member) => member.department !== 'Leadership');
  const showLeadershipSections = filterDept === ALL_DEPTS && leadership.length > 0;

  const renderGrid = (members, offset = 0) => (
    <div className="team-grid">
      {members.map((member, i) => (
        <ScrollReveal key={member.id} delay={`${((i + offset) % 3) * 0.08}s`}>
          <TeamCard
            member={member}
            isLeadership={member.department === 'Leadership'}
            onClick={() => setSelectedMember(member)}
          />
        </ScrollReveal>
      ))}
    </div>
  );

  return (
    <>
      {/* Page Header / Hero */}
      <section className="team-hero" style={{
        position: 'relative',
        minHeight: '560px',
        height: 'min(62vh, 600px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '132px 0 72px',
        overflow: 'hidden',
        color: '#FFFFFF',
        backgroundSize: 'cover',
        backgroundPosition: 'center 27%',
      }}>
        {/* Base Dark Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'rgba(5, 20, 25, 0.20)'
        }} />

        {/* Directional Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background: 'linear-gradient(90deg, rgba(5, 20, 25, 0.78) 0%, rgba(5, 20, 25, 0.52) 45%, rgba(5, 20, 25, 0.18) 100%)'
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 3, maxWidth: '860px', textAlign: 'left', transform: 'translate(-5%, -5%)' }}>
          <ScrollReveal>
            <h1 style={{
              color: '#FFFFFF',
              fontFamily: 'var(--editorial-serif)',
              fontStyle: 'normal',
              fontSize: 'clamp(3rem, 6vw, 5.25rem)',
              fontWeight: 700,
              lineHeight: 0.95,
              letterSpacing: '-0.035em',
              marginBottom: '1.25rem',
              textShadow: '0 2px 18px rgba(7, 25, 21, 0.2)'
            }}>
              Our Team
            </h1>
          </ScrollReveal>
        </div>
      </section>

      {/* Filter + Grid */}
      <section className="team-directory" style={{ padding: 'clamp(5rem, 8vw, 6rem) 0 clamp(6rem, 9vw, 8rem)', backgroundColor: 'var(--color-bg)' }}>
        <div className="container">
          <ScrollReveal>
            <div className="team-filter" role="group" aria-label="Filter team by department">
              <span className="team-filter__label">Filter by department</span>
              {departments.map(dept => (
                <button
                  key={dept}
                  type="button"
                  aria-pressed={filterDept === dept}
                  onClick={() => setFilterDept(dept)}
                  className={filterDept === dept ? 'is-active' : ''}
                >
                  {dept}
                </button>
              ))}
              <span className="team-filter__count">{filterDept} · {filtered.length} {filtered.length === 1 ? 'person' : 'people'}</span>
            </div>
          </ScrollReveal>

          {loading && <p role="status">Loading published team profiles…</p>}
          {error && !loading && <p role="alert">Team profiles are temporarily unavailable. {error}</p>}
          {!loading && !error && showLeadershipSections && (
            <>
              <div className="team-section-heading">
                <span>Leadership</span>
                <p>Accountable leadership guiding the mission, strategy, and long-term stewardship of the organization.</p>
              </div>
              {renderGrid(leadership)}
              {widerTeam.length > 0 && (
                  <div className="team-section-heading team-section-heading--wider">
                  <span>Wider Team</span>
                  <p>The operators, builders, and collaborators turning the model into durable opportunity.</p>
                </div>
              )}
              {renderGrid(widerTeam, leadership.length)}
            </>
          )}
          {!loading && !error && !showLeadershipSections && renderGrid(filtered)}

          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '3rem' }}>
              No team members found for {filterDept}.
            </p>
          )}
        </div>
      </section>

      <section className="team-closing" aria-labelledby="team-closing-title">
        <div className="container">
          <h2 id="team-closing-title">Interested in working with Living the Charge?</h2>
          <Link to="/mentor">View mentorship opportunities <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <style>{`
          .team-hero { background-image: url('/images/optimized/team-hero/team-1600.webp'); background-image: image-set(url('/images/optimized/team-hero/team-1600.avif') type('image/avif'), url('/images/optimized/team-hero/team-1600.webp') type('image/webp')); }
          @media (max-width: 1024px) { .team-hero { background-image: url('/images/optimized/team-hero/team-960.webp'); background-image: image-set(url('/images/optimized/team-hero/team-960.avif') type('image/avif'), url('/images/optimized/team-hero/team-960.webp') type('image/webp')); } }
          @media (max-width: 640px) { .team-hero { background-image: url('/images/optimized/team-hero/team-640.webp'); background-image: image-set(url('/images/optimized/team-hero/team-640.avif') type('image/avif'), url('/images/optimized/team-hero/team-640.webp') type('image/webp')); } }

        .team-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: stretch;
          gap: 28px 30px;
        }
        .team-grid > * {
          flex: 0 1 calc((100% - 60px) / 3);
          max-width: 340px;
          min-width: 0;
        }
        .team-filter {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 40px;
        }
        .team-filter__label {
          margin-right: 4px;
          color: var(--color-text-muted);
          font-family: var(--team-display-font);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .team-filter button {
          min-height: 38px;
          padding: 0 13px;
          border: 1px solid var(--color-border);
          border-radius: 4px;
          background: #fff;
          color: var(--color-text-muted);
          font-family: var(--team-display-font);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
        }
        .team-filter button:hover, .team-filter button:focus-visible { border-color: var(--color-primary); color: var(--color-primary); outline: none; }
        .team-filter button.is-active { border-color: var(--color-primary); background: var(--color-primary); color: #fff; font-weight: 600; }
        .team-filter__count { margin-left: auto; color: var(--color-text-muted); font-size: 12px; }
        .team-section-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 2rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.9rem;
          border-bottom: 1px solid var(--color-border);
        }
        .team-section-heading span {
          color: var(--color-primary);
          font-family: var(--team-display-font);
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .team-section-heading p {
          max-width: 520px;
          margin: 0;
          color: var(--color-text-muted);
          font-size: 0.9rem;
          line-height: 1.5;
          text-align: right;
        }
        .team-section-heading--wider { margin-top: 5rem; }
        .team-closing { padding: 88px 0; background: #fff; border-top: 1px solid var(--color-border); text-align: center; }
        .team-closing h2 { max-width: 620px; margin: 0 auto 22px; color: var(--color-primary); font-family: var(--display-font); font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; line-height: 1; letter-spacing: -.04em; }
        .team-closing a { color: var(--color-primary); font-family: var(--display-font); font-size: .95rem; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; }
        @media (max-width: 1024px) {
          .team-hero { min-height: 520px !important; height: min(58vh, 560px) !important; }
          .team-directory { padding: 76px 0 96px !important; }
          .team-grid > * { flex-basis: calc((100% - 30px) / 2); }
        }
        @media (max-width: 640px) {
          .team-hero { min-height: 460px !important; height: auto !important; padding: 116px 0 60px !important; background-position: 58% 27% !important; }
          .team-hero h1 { font-size: clamp(2.9rem, 14vw, 4.1rem) !important; }
          .team-directory { padding: 60px 0 76px !important; }
          .team-filter { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; }
          .team-filter__label, .team-filter__count { flex: 0 0 auto; }
          .team-filter button { flex: 0 0 auto; }
          .team-filter__count { margin-left: 4px; }
          .team-grid > * { flex-basis: 100%; max-width: 360px; }
          .team-section-heading { display: block; }
          .team-section-heading p { margin-top: 0.6rem; text-align: left; }
          .team-section-heading--wider { margin-top: 4rem; }
          .team-closing { padding: 64px 0 !important; }
        }
        @media (max-width: 430px) {
          .team-hero { min-height: 430px !important; padding-top: 104px !important; }
          .team-hero p { font-size: 1rem !important; }
          .team-filter { margin-bottom: 32px; scrollbar-width: thin; }
          .team-grid { gap: 22px; }
          .team-section-heading span { font-size: 1.7rem; }
          .team-section-heading--wider { margin-top: 3.25rem; }
          .team-closing { padding: 56px 0 !important; }
        }
      `}</style>

      {selectedMember && (
        <TeamModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </>
  );
}
