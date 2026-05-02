import { useState, useEffect } from 'react';
import { TRANSLATIONS, BOOKS } from '../utils/bibleApi';
import { getCachedChapter } from '../utils/chapterCache';

const NT_BOOK_IDS = new Set(BOOKS.slice(39).map((b) => b.id));

function parseVerseId(verseId) {
  const parts  = verseId.split('.');
  const verse   = parseInt(parts[parts.length - 1]);
  const chapter = parseInt(parts[parts.length - 2]);
  const bookId  = parts.slice(0, parts.length - 2).join('.');
  return { bookId, chapter, verse };
}

async function fetchVerseText(bookId, chapter, verse, translation) {
  const chapterId = `${bookId}.${chapter}`;
  const cached = getCachedChapter(chapterId, translation);
  if (cached) {
    return cached.verses?.find((v) => v.verse === verse)?.text?.trim() || null;
  }
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book) return null;
  const res = await fetch(
    `https://bible-api.com/${encodeURIComponent(book.name)}+${chapter}:${verse}?translation=${translation}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.error) return null;
  // Some translations (e.g. YLT) return text at top level; fall back to that
  return data.verses?.[0]?.text?.trim() || data.text?.trim() || null;
}

export default function TranslationsModal({ verseRef, verseId, onClose }) {
  const [results, setResults] = useState(() =>
    Object.fromEntries(TRANSLATIONS.map((t) => [t.id, { text: '', status: 'loading' }]))
  );

  useEffect(() => {
    const { bookId, chapter, verse } = parseVerseId(verseId);
    const isNT = NT_BOOK_IDS.has(bookId);
    TRANSLATIONS.forEach(({ id, ntOnly }) => {
      if (ntOnly && !isNT) {
        setResults((prev) => ({ ...prev, [id]: { text: '', status: 'nt-only' } }));
        return;
      }
      fetchVerseText(bookId, chapter, verse, id)
        .then((text) => {
          setResults((prev) => ({
            ...prev,
            [id]: { text: text || '', status: text ? 'done' : 'error' },
          }));
        })
        .catch(() => {
          setResults((prev) => ({ ...prev, [id]: { text: '', status: 'error' } }));
        });
    });
  }, [verseId]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '82vh',
          background: 'var(--glass-card-bg, rgba(255,252,242,0.97))',
          border: '1px solid var(--glass-card-bd, rgba(185,140,40,0.18))',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22), inset 0 1.5px 0 rgba(255,255,255,0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--tile-divider, rgba(185,140,40,0.12))',
          flexShrink: 0,
        }}>
          <div>
            <p style={{
              margin: '0 0 3px',
              fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.13em', color: 'var(--accent)',
            }}>Translations</p>
            <p style={{
              margin: 0, fontSize: 15, fontWeight: 700,
              color: 'var(--tile-text)', fontFamily: 'Georgia, serif',
            }}>{verseRef}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)',
              color: 'var(--tile-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.65'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >✕</button>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TRANSLATIONS.map(({ id, label, name, year }) => {
            const { text, status } = results[id];
            return (
              <div key={id} style={{
                background: 'var(--glass-tile-bg, rgba(255,252,238,0.7))',
                border: '1px solid var(--glass-tile-bd, rgba(185,140,40,0.15))',
                borderRadius: 12,
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--accent)',
                  }}>{label}</span>
                  <span style={{ fontSize: 10, color: 'var(--tile-muted)' }}>{name} · {year}</span>
                </div>

                {status === 'loading' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      border: '2px solid rgba(168,110,16,0.2)',
                      borderTopColor: 'var(--accent)',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <span style={{ fontSize: 11, color: 'var(--tile-muted)' }}>Loading…</span>
                  </div>
                )}
                {status === 'done' && (
                  <p style={{
                    margin: 0, fontSize: 13,
                    fontFamily: 'Georgia, serif', fontStyle: 'italic',
                    lineHeight: 1.7, color: 'var(--tile-text)',
                  }}>"{text}"</p>
                )}
                {status === 'nt-only' && (
                  <p style={{ margin: 0, fontSize: 11, fontStyle: 'italic', color: 'var(--tile-muted)' }}>
                    New Testament only — not available for this passage
                  </p>
                )}
                {status === 'error' && (
                  <p style={{ margin: 0, fontSize: 11, fontStyle: 'italic', color: 'var(--tile-muted)' }}>
                    Not available offline — connect to load
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
