import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BOOKS, TRANSLATIONS, getChapters, getChapterContent, searchBible } from '../utils/bibleApi';
import { getHighlights, setHighlight, removeHighlight } from '../utils/storage';
import { parseReference, suggestReference } from '../utils/searchUtils';
import { EMOTIONS } from '../data/emotions';
import { searchThemes } from '../data/themes';
import NoteModal from './NoteModal';
import VerseActionMenu, { HIGHLIGHT_COLORS } from './VerseActionMenu';
import TranslationsModal from './TranslationsModal';
import CrossRefPanel from './CrossRefPanel';

const T = {
  text:        'var(--tile-text, #1a1007)',
  textSub:     'var(--tile-sub, #5c4030)',
  textMuted:   'var(--tile-muted, rgba(110,75,22,0.52))',
  accent:      'var(--accent, #a86e10)',
  accentStrong:'var(--accent-strong, var(--accent))',
  accentLight: 'var(--accent-light, rgba(168,110,16,0.10))',
  accentBorder:'var(--glass-tile-bd, rgba(185,140,40,0.22))',
  divider:     'var(--tile-divider, rgba(185,140,40,0.12))',
  tileText:    'var(--tile-text, #3a2008)',
  tileSub:     'var(--tile-sub, #7a4e18)',
  tileMuted:   'var(--tile-muted, rgba(110,75,22,0.45))',
  // page-level: for text sitting directly on the dark --bg-page (not inside any tile/card)
  pageText:    'var(--page-text, rgba(255,245,215,0.92))',
  pageSub:     'var(--page-sub, rgba(255,238,195,0.65))',
  pageMuted:   'var(--page-muted, rgba(255,232,185,0.42))',
};

const OT_BOOKS = BOOKS.slice(0, 39);
const NT_BOOKS = BOOKS.slice(39);

export default function BibleReader({ translation = 'kjv', onTranslationChange, initialRef }) {
  const [selectedBook, setSelectedBook]     = useState(null);
  const [chapters, setChapters]             = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterContent, setChapterContent]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [highlights, setHighlights]         = useState(getHighlights);
  const [noteVerse, setNoteVerse]           = useState(null);
  const [translationsVerse, setTranslationsVerse] = useState(null);
  const [crossRefVerse, setCrossRefVerse]         = useState(null);
  const [actionMenu, setActionMenu]         = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchError, setSearchError]       = useState('');
  const [searchSuggestion, setSearchSuggestion] = useState(null);
  const [targetVerse, setTargetVerse]       = useState(null);
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  const [activeEmotion, setActiveEmotion]   = useState(null);
  const [emotionVisible, setEmotionVisible] = useState(5);
  const [keywordResults, setKeywordResults] = useState(null);
  const [testament, setTestament]           = useState('all');
  const pendingNavRef = useRef(null);

  useEffect(() => {
    if (!selectedBook) return;
    setSelectedChapter(null);
    setChapterContent(null);
    getChapters(selectedBook.id).then((chs) => {
      setChapters(chs);
      const nav = pendingNavRef.current;
      if (nav) {
        const ch = chs.find((c) => c.number === String(nav.chapter));
        if (ch) setSelectedChapter(ch);
      }
    });
  }, [selectedBook]);

  useEffect(() => {
    if (!selectedChapter) return;
    const nav = pendingNavRef.current;
    pendingNavRef.current = null;
    const verseTarget = nav?.verse ?? null;
    setLoading(true);
    setChapterContent(null);
    setError(null);
    getChapterContent(selectedChapter.id, translation)
      .then((data) => { setChapterContent(data); setLoading(false); if (verseTarget) setTargetVerse(verseTarget); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [selectedChapter, translation]);

  useEffect(() => {
    if (!targetVerse || !chapterContent) return;
    const el = document.querySelector(`[data-verse-num="${targetVerse}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid var(--accent, #a86e10)';
      el.style.outlineOffset = '4px';
      el.style.borderRadius = '6px';
      setTimeout(() => { el.style.outline = 'none'; }, 2200);
    }
    setTargetVerse(null);
  }, [targetVerse, chapterContent]);

  // Navigate to initialRef passed from App (e.g. from Notes/Prayer "Read" button)
  useEffect(() => {
    if (initialRef) navigateTo(initialRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show floating nav after scrolling 280px in the chapter view
  useEffect(() => {
    const container = document.querySelector('.no-scrollbar');
    if (!container) return;
    if (!chapterContent) { setShowFloatingNav(false); return; }
    const onScroll = () => setShowFloatingNav(container.scrollTop > 280);
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [chapterContent]);

  function scrollToTop() {
    const container = document.querySelector('.no-scrollbar');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateTo(refString) {
    const ref = parseReference(refString);
    if (!ref) return false;
    pendingNavRef.current = { chapter: ref.chapter, verse: ref.verse };
    setSelectedBook(ref.book);
    setActiveEmotion(null);
    setKeywordResults(null);
    return true;
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearchError('');
    setSearchSuggestion(null);
    const q = searchQuery.trim();
    if (!q) return;

    const emotionMatch = EMOTIONS.find(
      (em) => em.label.toLowerCase() === q.toLowerCase() || em.id.toLowerCase() === q.toLowerCase()
    );
    if (emotionMatch) {
      setActiveEmotion(emotionMatch);
      setEmotionVisible(5);
      setKeywordResults(null);
      setSearchQuery('');
      return;
    }

    if (navigateTo(q)) { setSearchQuery(''); return; }

    const ql = q.toLowerCase();
    const seen = new Set();
    const matches = [];

    searchThemes(q).forEach((v) => {
      if (!seen.has(v.ref)) { seen.add(v.ref); matches.push({ ref: v.ref, text: v.text }); }
    });

    EMOTIONS.forEach((em) => {
      em.verses.forEach((v) => {
        if ((v.text.toLowerCase().includes(ql) || v.ref.toLowerCase().includes(ql)) && !seen.has(v.ref)) {
          seen.add(v.ref);
          matches.push({ ref: v.ref, text: v.text, tag: `${em.emoji} ${em.label}` });
        }
      });
    });

    if (matches.length > 0) {
      setKeywordResults({ query: q, verses: matches });
      setActiveEmotion(null);
      setSearchQuery('');
    } else {
      // Full-text search across the bundled KJV
      const bibleMatches = searchBible(q);
      if (bibleMatches.length > 0) {
        setKeywordResults({
          query: q,
          verses: bibleMatches.map((m) => ({ ref: m.ref, text: m.text })),
          fromBible: true,
        });
        setActiveEmotion(null);
        setSearchQuery('');
      } else {
        const sug = suggestReference(q);
        if (sug) {
          setSearchSuggestion(sug);
          setSearchError(`No exact match for "${q}".`);
        } else {
          setSearchError(`No results for "${q}". Try a reference like "Isaiah 53:5" or a word like "stripes".`);
        }
      }
    }
  }

  function handleVerseNumClick(e, verseId, verseRef, verseText) {
    e.stopPropagation();
    const hl = highlights[verseId];
    setActionMenu({ verseId, verseRef, verseText, position: { x: e.clientX, y: e.clientY }, currentHighlight: (typeof hl === 'object' ? hl?.color : hl) || null });
  }

  function handleHighlight(colorId) {
    if (!actionMenu) return;
    setHighlight(actionMenu.verseId, colorId, actionMenu.verseRef, actionMenu.verseText);
    setHighlights((prev) => ({ ...prev, [actionMenu.verseId]: colorId }));
    setActionMenu((prev) => ({ ...prev, currentHighlight: colorId }));
  }

  function handleRemoveHighlight() {
    if (!actionMenu) return;
    removeHighlight(actionMenu.verseId);
    setHighlights((prev) => { const n = { ...prev }; delete n[actionMenu.verseId]; return n; });
  }

  function handleTranslationChange(t) {
    onTranslationChange(t);
    localStorage.setItem('sefer_translation', t);
    if (selectedChapter) setChapterContent(null);
  }

  function handleBookSelect(book) {
    pendingNavRef.current = null;
    setSelectedBook(book);
    setActiveEmotion(null);
    setKeywordResults(null);
  }

  function handleChapterSelect(num) {
    pendingNavRef.current = null;
    setSelectedChapter({ id: `${selectedBook.id}.${num}`, number: String(num) });
  }

  function goBackToBooks() {
    setSelectedBook(null); setSelectedChapter(null); setChapterContent(null);
    setChapters([]); setError(null);
  }

  function goBackToChapters() {
    setSelectedChapter(null); setChapterContent(null); setError(null);
  }

  function navigateChapter(delta) {
    if (!selectedBook || !selectedChapter) return;
    const current = parseInt(selectedChapter.number);
    const next    = current + delta;
    if (next < 1 || next > selectedBook.chapters) return;
    setCrossRefVerse(null);
    setSelectedChapter({ id: `${selectedBook.id}.${next}`, number: String(next) });
    scrollToTop();
  }

  return (
    <div className="space-y-5">

      {/* ── Search bar ───────────────────────────────────── */}
      <form onSubmit={handleSearch}>
        {/* Double-bezel search container */}
        <div
          className="p-1 rounded-2xl"
          style={{
            background: 'rgba(0,0,0,0.025)',
            border: '1px solid rgba(0,0,0,0.055)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          <div
            className="flex items-center gap-1.5 rounded-[calc(1rem-4px)] px-2 py-1.5"
            style={{
              background: 'var(--input-bg, rgba(255,253,242,1))',
              border: '1px solid var(--input-bd, rgba(185,140,40,0.18))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
            }}
          >
            {/* Home */}
            <button
              type="button"
              title="Home"
              onClick={() => {
                setSelectedBook(null); setSelectedChapter(null); setChapterContent(null);
                setChapters([]); setError(null); setKeywordResults(null);
                setActiveEmotion(null); setSearchQuery(''); setSearchError('');
              }}
              className="flex items-center justify-center rounded-lg transition-all duration-200 shrink-0 active:scale-95"
              style={{
                width: 34, height: 34, fontSize: '1rem',
                background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)',
                color: T.tileText,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-tile-hover-bg)'; e.currentTarget.style.borderColor = 'var(--glass-tile-hover-bd)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-tile-bg)'; e.currentTarget.style.borderColor = 'var(--glass-tile-bd)'; }}
            >
              ⌂
            </button>

            {/* Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchError(''); setSearchSuggestion(null); }}
              placeholder="Search verses, emotions, references…"
              className="flex-1 bg-transparent outline-none text-sm py-1"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: T.tileText,
                caretColor: 'var(--accent, #a86e10)',
              }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchError(''); }}
                className="shrink-0 text-base leading-none transition-opacity"
                style={{ color: T.textMuted, opacity: 0.6 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
              >
                ×
              </button>
            )}

            {/* Submit — button-in-button CTA */}
            <button
              type="submit"
              className="group flex items-center gap-1.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 active:scale-[0.97] shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--accent, #a86e10), #c4911a)',
                padding: '0.4rem 0.9rem',
                boxShadow: '0 2px 8px rgba(168,110,16,0.28)',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(168,110,16,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(168,110,16,0.28)'; e.currentTarget.style.transform = ''; }}
            >
              <span>Search</span>
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px"
                style={{ background: 'rgba(255,255,255,0.18)', fontSize: '0.65rem' }}
              >
                →
              </span>
            </button>
          </div>
        </div>
      </form>

      {(searchError || searchSuggestion) && (
        <div style={{
          background: 'var(--glass-card-bg)',
          border: '1px solid var(--glass-card-bd)',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}>
          {searchError && !searchSuggestion && (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--tile-text)', fontFamily: "'DM Sans', sans-serif" }}>
              {searchError}
            </p>
          )}
          {searchSuggestion && (
            <>
              <span style={{ fontSize: 13, color: 'var(--tile-text)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                Did you mean{' '}
                <strong style={{ color: 'var(--accent)', fontWeight: 700 }}>{searchSuggestion}</strong>?
              </span>
              <button
                onClick={() => { navigateTo(searchSuggestion); setSearchError(''); setSearchSuggestion(null); setSearchQuery(''); }}
                style={{
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, padding: '5px 12px',
                  fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                }}
              >
                Yes, go there
              </button>
              <button
                onClick={() => { setSearchSuggestion(null); setSearchError(''); }}
                style={{
                  background: 'transparent', color: 'var(--tile-text)',
                  border: '1px solid var(--glass-tile-bd)', borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, padding: '5px 10px',
                  fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                  opacity: 0.8,
                }}
              >
                No
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Keyword results ──────────────────────────────── */}
      {keywordResults && (
        <div className="glass-content rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="sefer-eyebrow">Results</span>
              <span className="text-xs font-medium" style={{ color: T.textMuted }}>
                "{keywordResults.query}" · {keywordResults.verses.length} verse{keywordResults.verses.length !== 1 ? 's' : ''}
                {keywordResults.fromBible && <span style={{ marginLeft: 6, opacity: 0.65 }}>· KJV text, opens in NKJV</span>}
              </span>
            </div>
            <button
              onClick={() => setKeywordResults(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all"
              style={{ background: 'rgba(0,0,0,0.05)', color: T.textMuted }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.10)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
            >
              ✕
            </button>
          </div>
          {keywordResults.verses.map((v) => (
            <button
              key={v.ref}
              onClick={() => navigateTo(v.ref)}
              className="w-full text-left rounded-xl p-3.5 transition-all duration-250 group"
              style={{
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(185,140,40,0.16)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.borderColor = T.accentBorder; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(185,140,40,0.16)'; e.currentTarget.style.transform = ''; }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-bold" style={{ color: T.accentStrong, fontFamily: "'DM Sans', sans-serif" }}>{v.ref}</p>
                {v.tag && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: T.accentLight, color: T.accentStrong, border: `1px solid ${T.accentBorder}` }}>
                    {v.tag}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: T.textSub, fontFamily: "Lora, Georgia, serif" }}>{v.text}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Emotion pills ────────────────────────────────── */}
      {!keywordResults && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="sefer-eyebrow">How are you feeling?</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((em) => {
              const isActive = activeEmotion?.id === em.id;
              return (
                <button
                  key={em.id}
                  onClick={() => { setActiveEmotion(isActive ? null : em); setEmotionVisible(5); }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 active:scale-[0.97]"
                  style={{
                    background: isActive ? 'var(--accent, #a86e10)' : 'var(--glass-tile-bg, rgba(255,252,240,1))',
                    border: isActive ? '1px solid var(--accent, #a86e10)' : '1px solid var(--glass-tile-bd, rgba(185,140,40,0.18))',
                    color: isActive ? '#ffffff' : T.tileSub,
                    boxShadow: isActive
                      ? '0 4px 12px rgba(168,110,16,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.05)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span style={{ fontSize: '0.85em' }}>{em.emoji}</span>
                  <span>{em.label}</span>
                </button>
              );
            })}
          </div>

          {activeEmotion && (
            <div className="glass-content rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.1em' }}>{activeEmotion.emoji}</span>
                  <span className="text-xs font-semibold" style={{ color: T.accentStrong, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    When you feel {activeEmotion.label.toLowerCase()}
                  </span>
                </div>
                <button
                  onClick={() => setActiveEmotion(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all"
                  style={{ background: 'rgba(0,0,0,0.05)', color: T.textMuted }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.10)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                >
                  ✕
                </button>
              </div>

              {activeEmotion.verses.slice(0, emotionVisible).map((v) => (
                <button
                  key={v.ref}
                  onClick={() => navigateTo(v.ref)}
                  className="w-full text-left rounded-xl p-3.5 transition-all duration-250"
                  style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(185,140,40,0.16)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.borderColor = T.accentBorder; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(185,140,40,0.16)'; e.currentTarget.style.transform = ''; }}
                >
                  <p className="text-xs font-bold mb-1.5" style={{ color: T.accentStrong, fontFamily: "'DM Sans', sans-serif" }}>{v.ref}</p>
                  <p className="text-xs leading-relaxed" style={{ color: T.textSub, fontFamily: "Lora, Georgia, serif" }}>{v.text}</p>
                </button>
              ))}

              {emotionVisible < activeEmotion.verses.length && (
                <button
                  onClick={() => setEmotionVisible((n) => n + 5)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 group flex items-center justify-center gap-2"
                  style={{ background: T.accentLight, border: `1px solid ${T.accentBorder}`, color: T.accent, fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,110,16,0.16)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = T.accentLight; }}
                >
                  Show {Math.min(5, activeEmotion.verses.length - emotionVisible)} more
                  <span className="transition-transform duration-300 group-hover:translate-y-0.5">↓</span>
                </button>
              )}
              {emotionVisible >= activeEmotion.verses.length && emotionVisible > 5 && (
                <p className="text-center text-xs py-1" style={{ color: T.textMuted }}>All verses shown</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Book browser ─────────────────────────────────── */}
      {!selectedBook && (() => {
        const visibleSections =
          testament === 'ot' ? [{ label: 'Old Testament', books: OT_BOOKS }] :
          testament === 'nt' ? [{ label: 'New Testament', books: NT_BOOKS }] :
          [{ label: 'Old Testament', books: OT_BOOKS }, { label: 'New Testament', books: NT_BOOKS }];

        return (
          <div className="space-y-5">
            {/* Controls row */}
            <div
              className="flex gap-2 flex-wrap p-1 rounded-xl"
              style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)' }}
            >
              <select
                value={testament}
                onChange={(e) => setTestament(e.target.value)}
                className="glass-input rounded-lg px-3 py-2 text-sm font-medium flex-1 min-w-[130px]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="all">All Books</option>
                <option value="ot">Old Testament</option>
                <option value="nt">New Testament</option>
              </select>

              <select
                value=""
                onChange={(e) => { const book = BOOKS.find((b) => b.id === e.target.value); if (book) handleBookSelect(book); }}
                className="glass-input flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 160 }}
              >
                <option value="">Jump to a book…</option>
                {testament !== 'nt' && (
                  <optgroup label="Old Testament">
                    {OT_BOOKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                )}
                {testament !== 'ot' && (
                  <optgroup label="New Testament">
                    {NT_BOOKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                )}
              </select>

              <select
                value={translation}
                onChange={(e) => handleTranslationChange(e.target.value)}
                className="glass-input rounded-lg px-3 py-2 text-sm font-semibold"
                style={{ minWidth: 96, fontFamily: "'DM Sans', sans-serif", color: T.accent }}
                title="Bible translation"
              >
                {TRANSLATIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label} · {t.year}</option>
                ))}
              </select>
            </div>

            {/* Book tiles */}
            {visibleSections.map(({ label, books }) => (
              <div key={label}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-3 px-0.5">
                  <p
                    className="text-xs font-bold uppercase tracking-widest shrink-0"
                    style={{ color: T.pageText, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.16em' }}
                  >
                    {label}
                  </p>
                  <div style={{ flex: 1, height: 1, background: T.pageText, opacity: 0.18 }} />
                  <span
                    className="text-xs shrink-0 px-2 py-0.5 rounded-full"
                    style={{ color: T.pageText, background: 'rgba(255,255,255,0.10)', fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem' }}
                  >
                    {books.length}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {books.map((book, i) => (
                    <button
                      key={book.id}
                      onClick={() => handleBookSelect(book)}
                      className="glass-tile tile-in text-left rounded-xl px-3 py-3 group"
                      style={{
                        color: T.tileText,
                        animationDelay: `${i * 18}ms`,
                      }}
                    >
                      <span
                        className="block text-xs font-semibold leading-snug truncate group-hover:opacity-90 transition-opacity"
                        style={{ fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif" }}
                      >
                        {book.name}
                      </span>
                      <span
                        className="block mt-1 font-semibold uppercase tracking-widest"
                        style={{ color: T.tileMuted, fontSize: '0.58rem', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {book.chapters} ch
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Chapter tiles ────────────────────────────────── */}
      {selectedBook && !chapterContent && !loading && !error && (
        <div className="space-y-4">
          {/* Back + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={goBackToBooks}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 group"
              style={{
                background: 'var(--glass-tile-bg)',
                border: '1px solid var(--glass-tile-bd)',
                color: T.tileText,
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-tile-hover-bg)'; e.currentTarget.style.borderColor = 'var(--glass-tile-hover-bd)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-tile-bg)'; e.currentTarget.style.borderColor = 'var(--glass-tile-bd)'; }}
            >
              <span className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span>
              All Books
            </button>
            <h2
              className="font-bold text-xl"
              style={{ color: T.pageText, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif", fontStyle: 'italic' }}
            >
              {selectedBook.name}
            </h2>
          </div>

          {/* Chapter jump dropdown */}
          <select
            value=""
            onChange={(e) => { if (e.target.value) handleChapterSelect(Number(e.target.value)); }}
            className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <option value="">Jump to chapter…</option>
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>Chapter {num}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 px-0.5">
            <span className="sefer-eyebrow">Select a chapter</span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((num, i) => (
              <button
                key={num}
                onClick={() => handleChapterSelect(num)}
                className="glass-tile tile-in rounded-2xl flex flex-col items-center justify-center group transition-all"
                style={{
                  color: T.tileText,
                  fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif",
                  animationDelay: `${i * 10}ms`,
                  minHeight: 64,
                  paddingTop: 10,
                  paddingBottom: 10,
                }}
              >
                <span className="text-lg font-bold leading-none" style={{ fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif" }}>
                  {num}
                </span>
                <span className="mt-1 font-semibold uppercase tracking-widest" style={{ fontSize: '0.52rem', color: T.tileMuted, fontFamily: "'DM Sans', sans-serif" }}>
                  ch
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div
            className="w-9 h-9 rounded-full animate-spin"
            style={{ border: '2.5px solid var(--glass-tile-bd, rgba(185,140,40,0.2))', borderTopColor: 'var(--accent, #a86e10)' }}
          />
          <p className="text-xs font-medium" style={{ color: T.pageSub, fontFamily: "'DM Sans', sans-serif" }}>
            Loading…
          </p>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────── */}
      {error && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="font-semibold mb-1.5" style={{ color: '#991b1b', fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif" }}>
            Could not load chapter
          </p>
          <p className="text-sm mb-6" style={{ color: T.textSub, fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
          <button
            onClick={goBackToChapters}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all group"
            style={{ background: T.accentLight, border: `1px solid ${T.accentBorder}`, color: T.accent, fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,110,16,0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.accentLight; }}
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span>
            Back to chapters
          </button>
        </div>
      )}

      {/* ── Chapter content ──────────────────────────────── */}
      {chapterContent && (
        <div>
          {/* Double-bezel content wrapper */}
          <div
            className="p-1.5 rounded-[1.625rem]"
            style={{
              background: 'rgba(0,0,0,0.025)',
              border: '1px solid rgba(0,0,0,0.055)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
            }}
          >
            <div
              className="glass-card rounded-[calc(1.625rem-6px)] p-6 md:p-9"
            >
              {/* Chapter header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={goBackToChapters}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all duration-300 group"
                  style={{
                    background: T.accentLight,
                    border: `1px solid ${T.accentBorder}`,
                    color: T.accentStrong,
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,110,16,0.18)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = T.accentLight; }}
                >
                  <span className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span>
                  {selectedBook?.name}
                </button>

                <select
                  value={translation}
                  onChange={(e) => handleTranslationChange(e.target.value)}
                  className="text-xs rounded-full px-3 py-1.5 font-bold cursor-pointer transition-all"
                  style={{
                    color: T.accentStrong,
                    border: `1px solid ${T.accentBorder}`,
                    background: T.accentLight,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: 'none',
                    letterSpacing: '0.04em',
                  }}
                  title="Switch translation"
                >
                  {TRANSLATIONS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Chapter title */}
              <h2
                className="text-2xl font-bold mb-8"
                style={{ color: T.accentStrong, fontWeight: 700, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif", letterSpacing: '-0.01em' }}
              >
                {chapterContent.reference}
              </h2>

              {/* Verse text */}
              <div
                className="leading-loose text-base"
                style={{ fontFamily: "var(--font, 'Lora', Georgia, serif)" }}
              >
                {chapterContent.verses.map((v) => {
                  const verseId   = `${chapterContent.bookId}.${chapterContent.chapter}.${v.verse}`;
                  const verseRef  = `${chapterContent.bookName} ${chapterContent.chapter}:${v.verse}`;
                  const hlEntry   = highlights[verseId];
                  const hlColorId = typeof hlEntry === 'object' ? hlEntry?.color : hlEntry;
                  const hlColor   = hlColorId ? HIGHLIGHT_COLORS.find((c) => c.id === hlColorId)?.bg : null;

                  return (
                    <span key={v.verse} data-verse-num={v.verse}>
                      <button
                        onClick={(e) => handleVerseNumClick(e, verseId, verseRef, v.text.trim())}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '0.5rem',
                          fontWeight: 700,
                          color: T.accentStrong,
                          verticalAlign: 'super',
                          marginRight: 3,
                          cursor: 'pointer',
                          background: T.accentLight,
                          border: `1px solid ${T.accentBorder}`,
                          borderRadius: 4,
                          padding: '1px 4px',
                          lineHeight: 1,
                          transition: 'background 0.2s cubic-bezier(0.32,0.72,0,1)',
                          letterSpacing: '0.02em',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,110,16,0.22)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = T.accentLight; }}
                      >
                        {v.verse}
                      </button>
                      <span
                        style={{
                          backgroundColor: hlColor || 'transparent',
                          borderRadius: 5,
                          padding: hlColor ? '1px 4px' : '0',
                          margin: hlColor ? '0 -4px' : '0',
                          transition: 'background-color 0.28s cubic-bezier(0.32,0.72,0,1)',
                          color: T.text,
                          lineHeight: '2.15',
                        }}
                      >
                        {v.text.trim()}{' '}
                      </span>
                    </span>
                  );
                })}
              </div>

              {/* Chapter navigation */}
              <div className="mt-10 flex items-center justify-between gap-3">
                <button
                  onClick={() => navigateChapter(-1)}
                  disabled={parseInt(selectedChapter?.number) <= 1}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200"
                  style={{
                    background: parseInt(selectedChapter?.number) <= 1 ? 'rgba(0,0,0,0.04)' : T.accentLight,
                    border: `1px solid ${parseInt(selectedChapter?.number) <= 1 ? 'rgba(0,0,0,0.06)' : T.accentBorder}`,
                    color: parseInt(selectedChapter?.number) <= 1 ? T.textMuted : T.accentStrong,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: parseInt(selectedChapter?.number) <= 1 ? 'default' : 'pointer',
                    opacity: parseInt(selectedChapter?.number) <= 1 ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (parseInt(selectedChapter?.number) > 1) e.currentTarget.style.background = 'rgba(168,110,16,0.18)'; }}
                  onMouseLeave={(e) => { if (parseInt(selectedChapter?.number) > 1) e.currentTarget.style.background = T.accentLight; }}
                >
                  ← {selectedBook?.name} {parseInt(selectedChapter?.number) - 1}
                </button>
                <span style={{ fontSize: '0.7rem', color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                  Ch. {selectedChapter?.number} / {selectedBook?.chapters}
                </span>
                <button
                  onClick={() => navigateChapter(1)}
                  disabled={parseInt(selectedChapter?.number) >= selectedBook?.chapters}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200"
                  style={{
                    background: parseInt(selectedChapter?.number) >= selectedBook?.chapters ? 'rgba(0,0,0,0.04)' : T.accentLight,
                    border: `1px solid ${parseInt(selectedChapter?.number) >= selectedBook?.chapters ? 'rgba(0,0,0,0.06)' : T.accentBorder}`,
                    color: parseInt(selectedChapter?.number) >= selectedBook?.chapters ? T.textMuted : T.accentStrong,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: parseInt(selectedChapter?.number) >= selectedBook?.chapters ? 'default' : 'pointer',
                    opacity: parseInt(selectedChapter?.number) >= selectedBook?.chapters ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (parseInt(selectedChapter?.number) < selectedBook?.chapters) e.currentTarget.style.background = 'rgba(168,110,16,0.18)'; }}
                  onMouseLeave={(e) => { if (parseInt(selectedChapter?.number) < selectedBook?.chapters) e.currentTarget.style.background = T.accentLight; }}
                >
                  {selectedBook?.name} {parseInt(selectedChapter?.number) + 1} →
                </button>
              </div>

              {/* Hint */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <div style={{ height: 1, width: 32, background: 'var(--tile-divider, rgba(185,140,40,0.14))' }} />
                <p
                  className="text-xs tracking-wide text-center"
                  style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em' }}
                >
                  Tap a verse number to highlight, add notes, or view cross-references
                </p>
                <div style={{ height: 1, width: 32, background: 'var(--tile-divider, rgba(185,140,40,0.14))' }} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Modals */}
      {actionMenu && createPortal(
        <VerseActionMenu
          verseRef={actionMenu.verseRef}
          verseId={actionMenu.verseId}
          position={actionMenu.position}
          currentHighlight={actionMenu.currentHighlight}
          onHighlight={handleHighlight}
          onRemoveHighlight={handleRemoveHighlight}
          onNote={() => setNoteVerse({ id: actionMenu.verseId, ref: actionMenu.verseRef, text: actionMenu.verseText })}
          onTranslations={() => setTranslationsVerse({ verseId: actionMenu.verseId, verseRef: actionMenu.verseRef })}
          onCrossRefs={() => setCrossRefVerse({ bookName: chapterContent.bookName, chapter: chapterContent.chapter, verse: actionMenu.verseRef.match(/:(\d+)/)?.[1] ? parseInt(actionMenu.verseRef.match(/:(\d+)/)[1]) : 1 })}
          onClose={() => setActionMenu(null)}
        />,
        document.body
      )}
      {noteVerse && createPortal(
        <NoteModal
          verseId={noteVerse.id}
          verseRef={noteVerse.ref}
          verseText={noteVerse.text}
          onClose={() => setNoteVerse(null)}
        />,
        document.body
      )}
      {translationsVerse && createPortal(
        <TranslationsModal
          verseId={translationsVerse.verseId}
          verseRef={translationsVerse.verseRef}
          onClose={() => setTranslationsVerse(null)}
        />,
        document.body
      )}
      {crossRefVerse && createPortal(
        <div
          onClick={() => setCrossRefVerse(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px',
            animation: 'fadeIn 0.18s ease-out',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, animation: 'slideUp 0.22s ease-out' }}>
            <CrossRefPanel
              bookName={crossRefVerse.bookName}
              chapter={crossRefVerse.chapter}
              verse={crossRefVerse.verse}
              translation={translation}
              onNavigate={(ref) => { setCrossRefVerse(null); navigateTo(ref); }}
              onClose={() => setCrossRefVerse(null)}
            />
          </div>
        </div>,
        document.body
      )}

      {chapterContent && showFloatingNav && createPortal(
        <div style={{
          position: 'fixed', bottom: 32, right: 32,
          display: 'flex', flexDirection: 'column', gap: 10, zIndex: 200,
        }}>
          <button
            onClick={scrollToTop}
            title="Scroll to top"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 18, lineHeight: 1,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.26)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.18)'; }}
          >↑</button>
          <button
            onClick={goBackToChapters}
            title="Back to chapters"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--glass-card-bg)', color: 'var(--tile-text)',
              border: '1px solid var(--glass-tile-bd)', cursor: 'pointer',
              fontSize: 15, lineHeight: 1,
              boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.15s, box-shadow 0.15s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.10)'; }}
          >←</button>
        </div>,
        document.body
      )}
    </div>
  );
}
