import { useState } from 'react';

const COST_PER_STUDENT_PER_YEAR = 42;

export default function ImpactCalc() {
  const [amount, setAmount] = useState(210);

  // Calculate equivalent statements:
  // e.g. supporting 1 student for Math.floor(amount / 42) years,
  // or supporting Math.floor(amount / 42) students for 1 year.
  const studentYears = Math.floor(amount / COST_PER_STUDENT_PER_YEAR);

  return (
    <div style={{
      backgroundColor: 'rgba(217, 196, 196, 0.1)', // 10% blush tint
      border: '1px solid var(--color-border)',
      padding: '3rem 2rem',
      maxWidth: '700px',
      margin: '0 auto'
    }}>
      <h3 style={{
        fontFamily: 'var(--display-sans)',
        fontStyle: 'italic',
        fontSize: '32px',
        textAlign: 'center',
        marginBottom: '0.5rem',
        color: 'var(--color-primary)'
      }}>
        Calculate Your Impact
      </h3>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '15px',
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        marginBottom: '2.5rem'
      }}>
        Every $42 added to the endowment supports one student's internship workspace and supplies for a year.
      </p>

      {/* Input section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem'
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '280px'
        }}>
          <span style={{
            position: 'absolute',
            left: '18px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--display-sans)',
            fontSize: '28px',
            fontWeight: '600',
            color: 'var(--color-primary)'
          }}>$</span>
          <input
            type="number"
            min="0"
            value={amount === 0 ? '' : amount}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseInt(e.target.value);
              setAmount(isNaN(val) ? 0 : Math.max(0, val));
            }}
            placeholder="0"
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 40px',
              fontSize: '24px',
              fontWeight: '700',
              fontFamily: 'Inter, sans-serif',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-primary)',
              outline: 'none',
              textAlign: 'center',
              borderRadius: '2px', // Sharp
              transition: 'border-color var(--transition-fast)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--color-secondary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
          />
        </div>

        {/* Impact outputs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          width: '100%'
        }} className="calc-grid">
          
          {/* Card 1: Students supported */}
          <div 
            className="calc-card"
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              transition: 'border-color var(--transition-smooth)'
            }}
          >
            <div style={{
            fontFamily: 'var(--display-sans)',
              fontSize: '64px',
              color: 'var(--color-secondary)',
              lineHeight: '1',
              marginBottom: '0.5rem'
            }}>
              {studentYears}
            </div>
            <div style={{
              fontFamily: 'var(--display-sans)',
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--color-primary)'
            }}>
              {studentYears === 1 ? 'Student Supported' : 'Students Supported'}
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              marginTop: '0.25rem'
            }}>
              For a full year of internship
            </div>
          </div>

          {/* Card 2: Cumulative years */}
          <div 
            className="calc-card"
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              transition: 'border-color var(--transition-smooth)'
            }}
          >
            <div style={{
            fontFamily: 'var(--display-sans)',
              fontSize: '64px',
              color: 'var(--color-secondary)',
              lineHeight: '1',
              marginBottom: '0.5rem'
            }}>
              {studentYears > 0 ? `${studentYears}` : '0'}
            </div>
            <div style={{
              fontFamily: 'var(--display-sans)',
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--color-primary)'
            }}>
              {studentYears === 1 ? 'Year of Impact' : 'Years of Cumulative Impact'}
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              marginTop: '0.25rem'
            }}>
              Of self-sustaining opportunity
            </div>
          </div>
        </div>

        {amount > 0 && amount < COST_PER_STUDENT_PER_YEAR && (
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic'
          }}>
            Every bit helps! A donation of ${amount} contributes to student supplies, technology access, and daily travel stipends.
          </p>
        )}
      </div>

      <style>{`
        .calc-card:hover {
          border-color: var(--color-secondary) !important;
        }
        @media (max-width: 500px) {
          .calc-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
