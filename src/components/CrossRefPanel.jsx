import { useState, useEffect } from 'react';
import { getCrossRefsAsync } from '../data/crossReferences';
import { getChapterContent } from '../utils/bibleApi';
import { getCachedChapter } from '../utils/chapterCache';
import { BOOKS } from '../utils/bibleApi';

const T = {
  accent:       'var(--accent)',
  accentStrong: 'var(--accent-strong, var(--accent))',
  text:         'var(--tile-text)',
  sub:      'var(--tile-sub)',
  muted:    'var(--tile-muted)',
  divider:  'var(--tile-divider)',
  pageSub:  'var(--page-sub)',
  pageMuted:'var(--page-muted)',
};

function parseRef(refStr) {
  // "Book Chapter:Verse" or "Book Chapter:Verse-Verse"
  const m = refStr.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const bookName = m[1];
  const chapter  = parseInt(m[2]);
  const verse    = parseInt(m[3]);
  const book     = BOOKS.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
  return book ? { book, chapter, verse } : null;
}

async function fetchVerseSnippet(refStr, translation = 'kjv') {
  const parsed = parseRef(refStr);
  if (!parsed) return null;
  const { book, chapter, verse } = parsed;
  const chapterId = `${book.id}.${chapter}`;

  const cached = getCachedChapter(chapterId, translation);
  if (cached) {
    return cached.verses?.find((v) => v.verse === verse)?.text?.trim() || null;
  }
  try {
    const data = await getChapterContent(chapterId, translation);
    return data.verses?.find((v) => v.verse === verse)?.text?.trim() || null;
  } catch {
    return null;
  }
}

function RefCard({ refStr, translation, onNavigate }) {
  const [snippet, setSnippet] = useState(null);

  useEffect(() => {
    let active = true;
    fetchVerseSnippet(refStr, translation).then((t) => { if (active) setSnippet(t); });
    return () => { active = false; };
  }, [refStr, translation]);

  return (
    <button
      onClick={() => onNavigate(refStr)}
      className="w-full text-left rounded-xl transition-all duration-200"
      style={{
        padding: '10px 13px',
        background: 'var(--glass-content-bg)',
        border: '1px solid var(--glass-content-bd)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-tile-hover-bg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-content-bg)'; }}
    >
      <span style={{
        display: 'block',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '0.92rem', fontWeight: 700,
        color: T.accentStrong, marginBottom: 3,
      }}>
        {refStr}
      </span>
      {snippet ? (
        <span style={{
          display: 'block',
          fontFamily: "Lora, Georgia, serif",
          fontSize: '0.72rem', lineHeight: 1.7,
          fontStyle: 'italic', color: T.sub,
        }}>
          "{snippet.length > 120 ? snippet.slice(0, 117) + '…' : snippet}"
        </span>
      ) : (
        <span style={{ display: 'block', fontSize: '0.68rem', color: T.muted, fontStyle: 'italic' }}>
          Loading…
        </span>
      )}
    </button>
  );
}

export default function CrossRefPanel({ bookName, chapter, verse, translation, onNavigate, onClose }) {
  const [refs, setRefs] = useState(null);
  const verseRef = `${bookName} ${chapter}:${verse}`;

  useEffect(() => {
    let active = true;
    getCrossRefsAsync(bookName, chapter, verse).then((r) => { if (active) setRefs(r); });
    return () => { active = false; };
  }, [bookName, chapter, verse]);

  return (
    <div
      className="rounded-2xl"
      style={{
        background: 'var(--glass-card-bg)',
        border: '1px solid var(--glass-card-bd)',
        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.7), 0 8px 32px rgba(0,0,0,0.14)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--tile-divider)',
      }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: T.muted, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', marginBottom: 2 }}>
            Cross-References
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1rem', fontWeight: 700, color: T.accentStrong, margin: 0 }}>
            {verseRef}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid var(--glass-tile-bd)', background: 'rgba(0,0,0,0.05)', color: T.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.10)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px 14px', maxHeight: 360, overflowY: 'auto' }}>
        {refs === null ? (
          <div style={{ textAlign: 'center', padding: '28px 16px' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.75rem', color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>
              Loading cross-references…
            </p>
          </div>
        ) : refs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px' }}>
            <p style={{ fontSize: 26, marginBottom: 10 }}>📖</p>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: T.sub, fontFamily: "'DM Sans', sans-serif", marginBottom: 5 }}>
              No cross-references found
            </p>
            <p style={{ fontSize: '0.72rem', color: T.muted, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
              {verseRef} is not yet in the cross-reference database.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {refs.map((ref) => (
              <RefCard key={ref} refStr={ref} translation={translation} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
