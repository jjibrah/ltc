import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentCard from './StudentCard';
import StudentModal from './StudentModal';
import ScrollReveal from '../../shared/components/feedback/ScrollReveal';
import { API_BASE_URL, apiRequest } from '../../shared/api/client';
import { endpoints } from '../../shared/api/endpoints';

export default function Stories() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await apiRequest(endpoints.stories);
        const mappedData = Array.isArray(data) ? data.map((story) => ({
          id: story.id,
          name: story.name,
          year: new Date(story.published_date).getFullYear(),
          excerpt: story.excerpt,
          fullStoryHTML: story.content,
          image: story.photo ? (story.photo.startsWith('http') ? story.photo : `${API_BASE_URL}${story.photo}`) : null,
        })) : [];
        setStories(mappedData);
      } catch (err) {
        console.error(err);
        setStories([]);
        setError('We could not load the stories right now. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  const selectedIndex = selectedStudent ? stories.findIndex((story) => story.id === selectedStudent.id) : -1;

  const moveStory = (direction) => {
    const nextIndex = selectedIndex + direction;
    if (nextIndex >= 0 && nextIndex < stories.length) setSelectedStudent(stories[nextIndex]);
  };

  return (
    <main className="stories-page">
      <section className="stories-hero">
        <div className="stories-hero__base" />
        <div className="stories-hero__gradient" />
        <div className="container stories-hero__inner">
          <ScrollReveal>
            <p className="stories-hero__eyebrow">Student stories</p>
            <h1>Opportunity changes what students believe is possible.</h1>
            <p className="stories-hero__description">Meet the students whose first professional experiences helped turn curiosity into direction.</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="stories-directory">
        <div className="container">
          {loading ? <p className="stories-status">Loading stories...</p> : error ? <p className="stories-status">{error}</p> : stories.length === 0 ? <p className="stories-status">No stories yet.</p> : (
            <>
              <div className="stories-grid">
                {stories.map((student, index) => <ScrollReveal key={student.id} delay={`${(index % 3) * 0.1}s`}><StudentCard student={student} onClick={() => setSelectedStudent(student)} /></ScrollReveal>)}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="stories-closing">
        <div className="container">
          <h2>Want to help create the next story?</h2>
          <div className="stories-closing__actions"><Link to="/mentor">Become a Mentor</Link><Link to="/donate">Donate</Link></div>
        </div>
      </section>

      <style>{`
        .stories-hero { position: relative; min-height: clamp(360px, 42vw, 470px); display: flex; align-items: center; overflow: hidden; color: #fff; background: url('/images/nice.JPG') center 40% / cover; }
        .stories-hero__base, .stories-hero__gradient { position: absolute; inset: 0; }
        .stories-hero__base { background: rgba(7,25,21,.3); }
        .stories-hero__gradient { background: linear-gradient(90deg, rgba(7,25,21,.86), rgba(7,25,21,.54) 48%, rgba(7,25,21,.12)); }
        .stories-hero__inner { position: relative; z-index: 1; max-width: 860px; padding-top: 104px; padding-bottom: 56px; }
        .stories-hero__eyebrow { margin: 0 0 18px; color: rgba(255,255,255,.78); font-family: var(--display-sans); font-size: 12px; font-weight: 650; letter-spacing: .14em; text-transform: uppercase; }
        .stories-hero h1 { max-width: 760px; margin: 0 0 20px; color: #fff; font-family: var(--editorial-serif); font-size: clamp(2.85rem, 5.4vw, 5.1rem); font-weight: 600; font-style: normal; line-height: .98; letter-spacing: -.025em; }
        .stories-hero__description { max-width: 600px; margin: 0; color: rgba(255,255,255,.88); font-family: var(--body-sans); font-size: clamp(1rem, 1.4vw, 1.2rem); line-height: 1.55; }
        .stories-directory { padding: 72px 0 112px; background: var(--color-bg); }
        .stories-directory__intro { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; margin-bottom: 24px; color: var(--color-text-muted); font-family: var(--display-sans); }
        .stories-directory__intro p { margin: 0; color: #1E1F33; font-size: 1.15rem; font-weight: 600; letter-spacing: -.015em; }
        .stories-directory__intro span { font-size: .82rem; }
        .stories-filter { display: flex; align-items: center; gap: 6px; margin-bottom: 40px; border-bottom: 1px solid var(--color-border); overflow-x: auto; }
        .stories-filter__label { margin-right: 14px; color: var(--color-text-muted); font-family: var(--display-sans); font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
        .stories-filter button { min-height: 44px; padding: 0 14px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--color-text-muted); font-family: var(--display-sans); font-size: 13px; font-weight: 550; cursor: pointer; white-space: nowrap; }
        .stories-filter button.is-active { border-bottom-color: #1E1F33; color: #1E1F33; font-weight: 650; }
        .stories-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 36px; max-width: 1280px; }
        .stories-status { padding: 60px 0; color: var(--color-text-muted); text-align: center; }
        .stories-closing { padding: 76px 0; background: #f1f0ec; }
        .stories-closing h2 { max-width: 520px; margin: 0 0 24px; color: #1E1F33; font-family: var(--display-sans); font-size: clamp(2rem, 4vw, 3.4rem); font-weight: 650; letter-spacing: -.035em; }
        .stories-closing__actions { display: flex; flex-wrap: wrap; gap: 24px; }
        .stories-closing__actions a { color: #1E1F33; font-family: var(--display-sans); font-size: 14px; font-weight: 650; text-decoration: underline; text-underline-offset: 5px; }
        @media (max-width: 1024px) { .stories-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .stories-hero__inner { padding-top: 92px; } .stories-directory { padding: 56px 0 80px; } .stories-directory__intro { align-items: flex-start; flex-direction: column; gap: 8px; } .stories-grid { grid-template-columns: 1fr; gap: 44px; } .stories-closing { padding: 60px 0; } }
        @media (prefers-reduced-motion: reduce) { .stories-filter button { transition: none; } }
      `}</style>

      {selectedStudent && <StudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} onPrevious={() => moveStory(-1)} onNext={() => moveStory(1)} hasPrevious={selectedIndex > 0} hasNext={selectedIndex >= 0 && selectedIndex < stories.length - 1} />}
    </main>
  );
}
