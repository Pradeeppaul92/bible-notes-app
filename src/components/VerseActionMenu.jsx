import { useEffect, useRef, useState } from 'react';

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: 'rgba(251,191,36,0.45)',  solid: '#f59e0b', label: 'Yellow' },
  { id: 'green',  bg: 'rgba(16,185,129,0.35)',  solid: '#10b981', label: 'Green'  },
  { id: 'blue',   bg: 'rgba(14,165,233,0.35)',  solid: '#0ea5e9', label: 'Blue'   },
  { id: 'pink',   bg: 'rgba(244,114,182,0.38)', solid: '#f472b6', label: 'Pink'   },
  { id: 'purple', bg: 'rgba(109,40,217,0.2)',   solid: '#7c3aed', label: 'Purple' },
  { id: 'orange', bg: 'rgba(234,88,12,0.25)',   solid: '#ea580c', label: 'Orange' },
];

const T = {
  text:    '#1a1007',
  textSub: '#5c4030',
  muted:   '#8a7060',
  accent:  '#6d28d9',
  divider: 'rgba(160,120,50,0.15)',
};

export default function VerseActionMenu({ verseRef, verseId, position, currentHighlight, onHighlight, onRemoveHighlight, onNote, onTranslations, onCrossRefs, onClose }) {
  const menuRef  = useRef(null);
  const menuWidth = 215;

  useEffect(() => {
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  const left = Math.max(8, Math.min(position.x - menuWidth / 2, window.innerWidth - menuWidth - 8));
  const top  = position.y - 12;

  return (
    <div ref={menuRef} style={{ position: 'fixed', left, top, transform: 'translateY(-100%)', zIndex: 9999, width: menuWidth }}>
      <div
        className="rounded-xl p-3"
        style={{
          background: 'rgba(255,252,244,0.92)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: `1px solid ${T.divider}`,
          boxShadow: '0 16px 48px rgba(80,40,10,0.18), inset 0 1px 0 rgba(255,255,255,1)',
        }}
      >
        {/* Verse ref */}
        <p className="text-xs font-semibold mb-3 truncate" style={{ color: T.muted }}>{verseRef}</p>

        {/* Highlight label */}
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: T.muted }}>Highlight</p>

        {/* Swatches */}
        <div className="flex gap-2 mb-3">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.id}
              title={color.label}
              onClick={() => { onHighlight(color.id); onClose(); }}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: color.solid,
                border: currentHighlight === color.id ? '2.5px solid #1a1007' : '2.5px solid transparent',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: currentHighlight === color.id ? `0 0 8px ${color.solid}` : 'none',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${T.divider}`, margin: '6px 0' }} />

        {/* Write note */}
        <button
          onClick={() => { onNote(); onClose(); }}
          className="w-full text-left text-sm px-2 py-1.5 rounded-lg transition-all flex items-center gap-2"
          style={{ color: T.textSub }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(109,40,217,0.07)'; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}
        >
          <span style={{ fontSize: 13 }}>✏️</span> Write note
        </button>

        {/* Cross-references */}
        <button
          onClick={() => { onCrossRefs?.(); onClose(); }}
          className="w-full text-left text-sm px-2 py-1.5 rounded-lg transition-all flex items-center gap-2"
          style={{ color: T.textSub }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,95,70,0.07)'; e.currentTarget.style.color = '#065f46'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}
        >
          <span style={{ fontSize: 13 }}>🔗</span> Cross-references
        </button>

        {/* Other translations */}
        <button
          onClick={() => { onTranslations(); onClose(); }}
          className="w-full text-left text-sm px-2 py-1.5 rounded-lg transition-all flex items-center gap-2"
          style={{ color: T.textSub }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14,116,144,0.07)'; e.currentTarget.style.color = '#0e7490'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          Other translations
        </button>

        {/* Remove highlight */}
        {currentHighlight && (
          <button
            onClick={() => { onRemoveHighlight(); onClose(); }}
            className="w-full text-left text-sm px-2 py-1.5 rounded-lg transition-all flex items-center gap-2"
            style={{ color: '#b91c1c' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(185,28,28,0.07)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: 11 }}>✕</span> Remove highlight
          </button>
        )}
      </div>

      {/* Arrow */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -1 }}>
        <div style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid rgba(255,252,244,0.92)' }} />
      </div>

    </div>
  );
}
