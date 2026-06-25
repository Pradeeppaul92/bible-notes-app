import { useState } from 'react';

const SLIDES = [
  {
    icon: '📖',
    title: 'Read Scripture',
    body: 'Browse every book and chapter. Search by verse, theme, or emotion. Tap any verse to highlight it or write a note.',
  },
  {
    icon: '✏️',
    title: 'Capture Notes',
    body: 'Your verse notes and personal journals live in the Notes tab. Rich formatting, colour labels, and one-tap export to Word or text.',
  },
  {
    icon: '🙏',
    title: 'Pray & Proclaim',
    body: 'Log prayer points and build a personalised proclamation list. Hit the 📖 icon on any note or proclamation to jump straight to that passage.',
  },
];

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  function finish() {
    localStorage.setItem('sefer_onboarded', '1');
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(10,5,0,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 400, borderRadius: 22,
          background: 'rgba(255,252,244,0.97)',
          boxShadow: '0 32px 80px rgba(50,20,0,0.32), inset 0 1px 0 rgba(255,255,255,1)',
          border: '1px solid rgba(200,160,60,0.20)',
          padding: '36px 32px 28px',
          textAlign: 'center',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{slide.icon}</div>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.65rem', fontWeight: 700, fontStyle: 'italic',
          color: '#1a1007', margin: '0 0 12px', lineHeight: 1.15,
          letterSpacing: '-0.01em',
        }}>
          {slide.title}
        </h2>

        {/* Body */}
        <p style={{
          fontSize: '0.88rem', lineHeight: 1.75, color: '#5c4030',
          margin: '0 0 28px', minHeight: 60,
        }}>
          {slide.body}
        </p>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 24 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 7, height: 7, borderRadius: 9999,
              background: i === step ? 'var(--accent, #a86e10)' : 'rgba(168,110,16,0.22)',
              transition: 'width 0.25s, background 0.25s',
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isLast && (
            <button
              onClick={finish}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, fontSize: '0.82rem',
                fontWeight: 600, color: 'rgba(90,60,20,0.55)', background: 'transparent',
                border: '1px solid rgba(168,110,16,0.22)', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Skip
            </button>
          )}
          <button
            onClick={isLast ? finish : () => setStep((s) => s + 1)}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 12, fontSize: '0.88rem',
              fontWeight: 700, color: '#fff',
              background: 'var(--accent, #a86e10)',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(168,110,16,0.38)',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
