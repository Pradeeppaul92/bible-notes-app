import { markDailyVerseShown } from '../data/dailyVerses';

export default function DailyVerseModal({ verse, onClose }) {
  function handleClose() {
    markDailyVerseShown();
    onClose();
  }

  const day = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="w-full max-w-md"
        style={{
          background: 'var(--glass-card-bg)',
          border: '1px solid var(--glass-card-bd)',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.22), inset 0 1.5px 0 rgba(255,255,255,0.75)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Specular highlight */}
        <div style={{
          position: 'absolute', top: 0, left: '5%', right: '5%', height: '35%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 72%)',
          borderRadius: '50%', transform: 'rotate(-6deg)', pointerEvents: 'none',
        }} />

        {/* Accent top bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, var(--accent) 0%, transparent 100%)' }} />

        <div className="px-8 pt-7 pb-8">
          {/* Date + label */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5"
                style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
                Verse of the Day
              </p>
              <p className="text-xs" style={{ color: 'var(--tile-muted)' }}>{day}</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
              style={{ background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)', color: 'var(--tile-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >✕</button>
          </div>

          {/* Verse text */}
          <div className="mb-6">
            <p
              className="text-lg leading-relaxed italic"
              style={{ color: 'var(--tile-text)', fontFamily: 'Georgia, serif', lineHeight: 1.8 }}
            >
              "{verse.text}"
            </p>
          </div>

          {/* Reference */}
          <div className="flex items-center gap-3">
            <div style={{ flex: 1, height: 1, background: 'var(--tile-divider)' }} />
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--accent)', fontFamily: 'Georgia, serif' }}
            >
              — {verse.ref}
            </p>
            <div style={{ flex: 1, height: 1, background: 'var(--tile-divider)' }} />
          </div>

          {/* Begin reading button */}
          <button
            onClick={handleClose}
            className="w-full mt-6 py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Begin Reading
          </button>
        </div>
      </div>
    </div>
  );
}
