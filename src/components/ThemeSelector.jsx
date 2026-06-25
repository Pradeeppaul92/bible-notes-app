import { useState, useRef, useEffect } from 'react';
import { COLOR_THEMES } from '../data/colorThemes';

export default function ThemeSelector({ currentThemeId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const current = COLOR_THEMES.find((t) => t.id === currentThemeId) || COLOR_THEMES[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Change ambiance"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 11px 5px 7px',
          borderRadius: 20,
          border: `1.5px solid var(--glass-tile-bd, rgba(185,140,40,0.22))`,
          background: 'var(--glass-tile-bg, rgba(255,252,238,1))',
          cursor: 'pointer',
          transition: 'all 0.18s',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--glass-tile-hover-bg)';
          e.currentTarget.style.borderColor = 'var(--glass-tile-hover-bd)';
          e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.10)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--glass-tile-bg)';
          e.currentTarget.style.borderColor = 'var(--glass-tile-bd)';
          e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.07)';
        }}
      >
        {/* Theme colour circle */}
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          background: current.swatch,
          border: '1.5px solid rgba(255,255,255,0.6)',
          boxShadow: `0 0 6px ${current.swatch}88`,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tile-text)', letterSpacing: '0.01em' }}>
          Theme
        </span>
        <span style={{ fontSize: 8, color: 'var(--tile-muted)', marginTop: 1 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 44,
          right: 0,
          zIndex: 9999,
          width: 300,
          background: 'linear-gradient(160deg, rgba(82,82,88,0.97) 0%, rgba(58,58,64,0.99) 100%)',
          backdropFilter: 'blur(40px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 18,
          padding: '14px 12px 12px',
          boxShadow: '0 20px 56px rgba(0,0,0,0.45), inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)',
        }}>
          {/* Glossy specular highlight */}
          <div style={{
            position: 'absolute', top: 0, left: '8%', right: '8%', height: '42%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 72%)',
            borderRadius: '50%', transform: 'rotate(-8deg)', pointerEvents: 'none',
          }} />

          <p style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(255,255,255,0.38)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 10, paddingLeft: 2,
          }}>
            Choose Theme
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {COLOR_THEMES.map((theme) => {
              const isActive = theme.id === currentThemeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => { onSelect(theme.id); setOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 11,
                    border: isActive
                      ? `1.5px solid ${theme.swatch}`
                      : '1.5px solid rgba(255,255,255,0.09)',
                    background: isActive
                      ? `${theme.swatch}28`
                      : 'rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isActive
                      ? `0 0 0 2px ${theme.swatch}40, inset 0 1px 0 rgba(255,255,255,0.12)`
                      : 'inset 0 1px 0 rgba(255,255,255,0.07)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                    }
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: theme.swatch,
                    flexShrink: 0, marginTop: 2,
                    border: '1.5px solid rgba(255,255,255,0.30)',
                    boxShadow: isActive ? `0 0 8px ${theme.swatch}cc` : `0 1px 4px ${theme.swatch}66`,
                  }} />
                  <span style={{ textAlign: 'left', flex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{
                        fontSize: 11,
                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.75)',
                        fontWeight: isActive ? 700 : 500,
                        fontFamily: 'system-ui, sans-serif',
                      }}>
                        {theme.name}
                      </span>
                      {theme.verse && (
                        <span style={{
                          fontSize: 9, fontWeight: 600,
                          color: isActive ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.50)',
                          fontFamily: 'system-ui, sans-serif',
                          letterSpacing: '0.02em',
                        }}>
                          {theme.verse}
                        </span>
                      )}
                    </span>
                    {theme.verseText && (
                      <span style={{
                        display: 'block',
                        fontSize: 9.5,
                        color: isActive ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.48)',
                        fontFamily: "Lora, Georgia, serif",
                        fontStyle: 'italic',
                        lineHeight: 1.45,
                        marginTop: 2,
                      }}>
                        "{theme.verseText}"
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
