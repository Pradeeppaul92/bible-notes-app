import { useState, useEffect, useRef } from 'react';
import { BOOKS, TRANSLATIONS, getChapters, getChapterContent } from '../utils/bibleApi';
import { getHighlights, setHighlight, removeHighlight } from '../utils/storage';
import { parseReference } from '../utils/searchUtils';
import { EMOTIONS } from '../data/emotions';
import { searchThemes } from '../data/themes';
import NoteModal from './NoteModal';
import VerseActionMenu, { HIGHLIGHT_COLORS } from './VerseActionMenu';
import TranslationsModal from './TranslationsModal';

const T = {
  text:        '#1a1007',
  textSub:     '#5c4030',
  textMuted:   '#8a7060',
  accent:      'var(--accent, #a86e10)',
  accentLight: 'var(--accent-light, rgba(168,110,16,0.12))',
  accentBorder:'var(--glass-tile-bd, rgba(185,140,40,0.22))',
  gold:        'var(--accent, #a86e10)',
  goldLight:   'var(--accent-light, rgba(168,110,16,0.12))',
  goldBorder:  'var(--glass-tile-bd, rgba(185,140,40,0.22))',
  divider:     'var(--tile-divider, rgba(185,140,40,0.12))',
  // Tile text — dark on light backgrounds
  tileText:    'var(--tile-text, #3a2008)',
  tileSub:     'var(--tile-sub, #7a4e18)',
  tileMuted:   'var(--tile-muted, rgba(110,75,22,0.52))',
  tileDivider: 'var(--tile-divider, rgba(185,140,40,0.12))',
};

const OT_BOOKS = BOOKS.slice(0, 39);
const NT_BOOKS = BOOKS.slice(39);

export default function BibleReader({ translation = 'kjv', onTranslationChange }) {
  const [selectedBook, setSelectedBook]     = useState(null);
  const [chapters, setChapters]             = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterContent, setChapterContent]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [highlights, setHighlights]         = useState(getHighlights);
  const [noteVerse, setNoteVerse]           = useState(null);
  const [translationsVerse, setTranslationsVerse] = useState(null);
  const [actionMenu, setActionMenu]         = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchError, setSearchError]       = useState('');
  const [targetVerse, setTargetVerse]       = useState(null);
  const [activeEmotion, setActiveEmotion]   = useState(null);
  const [emotionVisible, setEmotionVisible] = useState(5);
  const [keywordResults, setKeywordResults] = useState(null); // { query, verses: [{ref,text,emotion,emoji}] }
  const [testament, setTestament]           = useState('all'); // 'all' | 'ot' | 'nt'
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
      el.style.outline = '2px solid #6d28d9';
      el.style.outlineOffset = '3px';
      el.style.borderRadius = '4px';
      setTimeout(() => { el.style.outline = 'none'; }, 2200);
    }
    setTargetVerse(null);
  }, [targetVerse, chapterContent]);

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
    const q = searchQuery.trim();
    if (!q) return;

    // 1. Emotion name match
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

    // 2. Bible reference match
    if (navigateTo(q)) {
      setSearchQuery('');
      return;
    }

    // 3. Keyword search — themes index first, then emotion verses
    const ql = q.toLowerCase();
    const seen = new Set();
    const matches = [];

    // Themes (broader biblical keyword coverage)
    const themeMatches = searchThemes(q);
    themeMatches.forEach((v) => {
      if (!seen.has(v.ref)) { seen.add(v.ref); matches.push({ ref: v.ref, text: v.text }); }
    });

    // Emotion verses (catch anything not in themes)
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
      setSearchError(`No results for "${q}". Try a theme like "promise", emotion like "sad", or verse like "John 3:16".`);
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
    setSelectedBook(null);
    setSelectedChapter(null);
    setChapterContent(null);
    setChapters([]);
    setError(null);
  }

  function goBackToChapters() {
    setSelectedChapter(null);
    setChapterContent(null);
    setError(null);
  }

  return (
    <div className="space-y-4">

      {/* ── Unified search ───────────────────────────── */}
      <form onSubmit={handleSearch} className="flex gap-2">
        {/* Home button — always visible, resets to book browser */}
        <button
          type="button"
          title="Home"
          onClick={() => {
            setSelectedBook(null);
            setSelectedChapter(null);
            setChapterContent(null);
            setChapters([]);
            setError(null);
            setKeywordResults(null);
            setActiveEmotion(null);
            setSearchQuery('');
            setSearchError('');
          }}
          className="rounded-xl px-3 py-2.5 text-base transition-all flex items-center justify-center"
          style={{ background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)', color: 'var(--tile-text)', minWidth: 42 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-tile-hover-bg)'; e.currentTarget.style.borderColor = 'var(--glass-tile-hover-bd)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-tile-bg)'; e.currentTarget.style.borderColor = 'var(--glass-tile-bd)'; }}
        >
          ⌂
        </button>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSearchError(''); }}
          placeholder='Search verses, emotions, or keywords…'
          className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #6d28d9, #1d4ed8)', boxShadow: '0 4px 14px rgba(109,40,217,0.3)' }}
        >
          Go
        </button>
      </form>
      {searchError && <p className="text-xs px-1 font-medium" style={{ color: '#b91c1c' }}>{searchError}</p>}

      {/* ── Keyword results ──────────────────────────── */}
      {keywordResults && (
        <div className="glass-content rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.accent }}>
              Results for "{keywordResults.query}" · {keywordResults.verses.length} verse{keywordResults.verses.length !== 1 ? 's' : ''}
            </p>
            <button onClick={() => setKeywordResults(null)} style={{ color: T.textMuted }} className="text-sm hover:opacity-70 transition">✕</button>
          </div>
          {keywordResults.verses.map((v) => (
            <button
              key={v.ref}
              onClick={() => navigateTo(v.ref)}
              className="w-full text-left rounded-xl p-3 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid rgba(200,165,90,0.22)` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.borderColor = T.accentBorder; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(200,165,90,0.22)'; }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs font-bold" style={{ color: T.accent }}>{v.ref}</p>
                {v.tag && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: T.goldLight, color: T.gold, border: `1px solid ${T.goldBorder}` }}>
                    {v.tag}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: T.textSub }}>{v.text}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Emotion pills ────────────────────────────── */}
      {!keywordResults && (
        <div>
          <p className="tile-label text-xs mb-2 px-1 uppercase tracking-widest font-bold" style={{ color: T.tileText }}>
            How are you feeling?
          </p>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((em) => {
              const isActive = activeEmotion?.id === em.id;
              return (
                <button
                  key={em.id}
                  onClick={() => { setActiveEmotion(isActive ? null : em); setEmotionVisible(5); }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                  style={{
                    background: isActive ? 'var(--accent, #a86e10)' : 'var(--glass-tile-bg, rgba(255,252,240,1))',
                    border: isActive ? '1px solid var(--accent, #a86e10)' : '1px solid var(--glass-tile-bd, rgba(185,140,40,0.18))',
                    color: isActive ? '#ffffff' : 'var(--tile-sub, #7a4e18)',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.14)' : '0 1px 4px rgba(0,0,0,0.07)',
                  }}
                >
                  <span>{em.emoji}</span>
                  <span>{em.label}</span>
                </button>
              );
            })}
          </div>

          {activeEmotion && (
            <div className="glass-content mt-3 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.accent }}>
                  {activeEmotion.emoji} When you feel {activeEmotion.label.toLowerCase()}
                </p>
                <button onClick={() => setActiveEmotion(null)} style={{ color: T.textMuted }} className="text-sm hover:opacity-70 transition">✕</button>
              </div>

              {activeEmotion.verses.slice(0, emotionVisible).map((v) => (
                <button
                  key={v.ref}
                  onClick={() => navigateTo(v.ref)}
                  className="w-full text-left rounded-xl p-3 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid rgba(200,165,90,0.22)` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.borderColor = T.accentBorder; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(200,165,90,0.22)'; }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: T.accent }}>{v.ref}</p>
                  <p className="text-xs leading-relaxed" style={{ color: T.textSub }}>{v.text}</p>
                </button>
              ))}

              {emotionVisible < activeEmotion.verses.length && (
                <button
                  onClick={() => setEmotionVisible((n) => n + 5)}
                  className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: T.accentLight, border: `1px solid ${T.accentBorder}`, color: T.accent }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(109,40,217,0.18)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = T.accentLight; }}
                >
                  Show {Math.min(5, activeEmotion.verses.length - emotionVisible)} more
                </button>
              )}
              {emotionVisible >= activeEmotion.verses.length && emotionVisible > 5 && (
                <p className="text-center text-xs py-1" style={{ color: T.textMuted }}>All verses shown</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Book browser ─────────────────────────────── */}
      {!selectedBook && (() => {
        const visibleSections =
          testament === 'ot' ? [{ label: 'Old Testament', books: OT_BOOKS }] :
          testament === 'nt' ? [{ label: 'New Testament', books: NT_BOOKS }] :
          [{ label: 'Old Testament', books: OT_BOOKS }, { label: 'New Testament', books: NT_BOOKS }];
        const allVisible = testament === 'all' ? BOOKS : testament === 'ot' ? OT_BOOKS : NT_BOOKS;

        return (
          <div className="space-y-4">
            {/* Dropdowns row */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={testament}
                onChange={(e) => setTestament(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-sm"
                style={{ minWidth: 160 }}
              >
                <option value="all">All Books</option>
                <option value="ot">Old Testament</option>
                <option value="nt">New Testament</option>
              </select>

              <select
                value=""
                onChange={(e) => {
                  const book = BOOKS.find((b) => b.id === e.target.value);
                  if (book) handleBookSelect(book);
                }}
                className="glass-input flex-1 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Jump to a book...</option>
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
                className="glass-input rounded-xl px-3 py-2 text-sm"
                style={{ minWidth: 90 }}
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
                <div className="flex items-center gap-3 mb-3">
                  <p className="tile-label text-xs font-bold uppercase tracking-widest" style={{ color: T.tileText }}>{label}</p>
                  <div style={{ flex: 1, height: 1, background: 'var(--tile-divider, rgba(185,140,40,0.12))' }} />
                  <span className="tile-label text-xs" style={{ color: T.tileMuted }}>{books.length} books</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {books.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => handleBookSelect(book)}
                      className="glass-tile text-left rounded-xl px-3 py-2.5 text-xs font-semibold"
                      style={{ color: T.tileText }}
                    >
                      <span className="tile-label block truncate">{book.name}</span>
                      <span className="tile-label block mt-0.5 font-normal" style={{ color: T.tileMuted, fontSize: '0.65rem' }}>{book.chapters} ch</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Chapter tiles ────────────────────────────── */}
      {selectedBook && !chapterContent && !loading && !error && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={goBackToBooks}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{ background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)', color: 'var(--tile-text)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-tile-hover-bg)'; e.currentTarget.style.borderColor = 'var(--glass-tile-hover-bd)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-tile-bg)'; e.currentTarget.style.borderColor = 'var(--glass-tile-bd)'; }}
            >
              ← Books
            </button>
            <h2 className="tile-label font-bold text-lg" style={{ color: T.tileText, fontFamily: 'Georgia, serif' }}>
              {selectedBook.name}
            </h2>
          </div>

          {/* Chapter dropdown */}
          <select
            value=""
            onChange={(e) => { if (e.target.value) handleChapterSelect(Number(e.target.value)); }}
            className="glass-input w-full rounded-xl px-4 py-2.5 text-sm mb-4"
          >
            <option value="">Jump to chapter...</option>
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>Chapter {num}</option>
            ))}
          </select>

          <p className="tile-label text-xs mb-3 px-1 uppercase tracking-widest font-bold" style={{ color: T.tileText }}>
            Select a chapter
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => handleChapterSelect(num)}
                className="glass-tile tile-label aspect-square rounded-xl text-sm font-bold flex items-center justify-center"
                style={{ color: T.tileText }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full animate-spin"
            style={{ border: '3px solid rgba(109,40,217,0.15)', borderTopColor: '#6d28d9' }} />
        </div>
      )}

      {/* ── Error ────────────────────────────────────── */}
      {error && (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="font-semibold" style={{ color: '#991b1b' }}>Could not load chapter</p>
          <p className="text-sm mt-1" style={{ color: T.textSub }}>{error}</p>
          <button
            onClick={goBackToChapters}
            className="mt-4 text-xs font-semibold px-4 py-1.5 rounded-full transition-all"
            style={{ background: T.goldLight, border: `1px solid ${T.goldBorder}`, color: T.gold }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* ── Chapter content ──────────────────────────── */}
      {chapterContent && (
        <div className="glass-card rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goBackToChapters}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{ background: T.goldLight, border: `1px solid ${T.goldBorder}`, color: T.gold }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(180,120,30,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.goldLight; }}
            >
              ← {selectedBook?.name}
            </button>
            <select
              value={translation}
              onChange={(e) => handleTranslationChange(e.target.value)}
              className="glass-input text-xs rounded-full px-3 py-1 font-semibold cursor-pointer"
              style={{ color: T.gold, border: `1px solid ${T.goldBorder}`, background: T.goldLight }}
              title="Switch translation"
            >
              {TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <h2 className="text-xl font-bold mb-6" style={{ color: T.accent, fontFamily: 'Georgia, serif' }}>
            {chapterContent.reference}
          </h2>

          <div className="leading-loose text-base" style={{ fontFamily: 'Georgia, serif' }}>
            {chapterContent.verses.map((v) => {
              const verseId  = `${chapterContent.bookId}.${chapterContent.chapter}.${v.verse}`;
              const verseRef = `${chapterContent.bookName} ${chapterContent.chapter}:${v.verse}`;
              const hlEntry  = highlights[verseId];
              const hlColorId = typeof hlEntry === 'object' ? hlEntry?.color : hlEntry;
              const hlColor  = hlColorId ? HIGHLIGHT_COLORS.find((c) => c.id === hlColorId)?.bg : null;

              return (
                <span key={v.verse} data-verse-num={v.verse}>
                  <button
                    onClick={(e) => handleVerseNumClick(e, verseId, verseRef, v.text.trim())}
                    style={{
                      fontSize: '0.58rem', fontWeight: 700, color: T.accent,
                      verticalAlign: 'super', marginRight: 3, cursor: 'pointer',
                      background: T.accentLight, border: `1px solid ${T.accentBorder}`,
                      borderRadius: 4, padding: '1px 4px', lineHeight: 1, transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(109,40,217,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.accentLight; }}
                  >
                    {v.verse}
                  </button>
                  <span style={{
                    backgroundColor: hlColor || 'transparent',
                    borderRadius: 4,
                    padding: hlColor ? '1px 3px' : '0',
                    margin: hlColor ? '0 -3px' : '0',
                    transition: 'background-color 0.25s',
                    color: T.text,
                  }}>
                    {v.text.trim()}{' '}
                  </span>
                </span>
              );
            })}
          </div>

          <p className="text-xs mt-8 text-center tracking-wide" style={{ color: T.textMuted }}>
            Tap a verse number to highlight or add notes
          </p>
        </div>
      )}

      {actionMenu && (
        <VerseActionMenu
          verseRef={actionMenu.verseRef}
          verseId={actionMenu.verseId}
          position={actionMenu.position}
          currentHighlight={actionMenu.currentHighlight}
          onHighlight={handleHighlight}
          onRemoveHighlight={handleRemoveHighlight}
          onNote={() => setNoteVerse({ id: actionMenu.verseId, ref: actionMenu.verseRef, text: actionMenu.verseText })}
          onTranslations={() => setTranslationsVerse({ verseId: actionMenu.verseId, verseRef: actionMenu.verseRef })}
          onClose={() => setActionMenu(null)}
        />
      )}

      {noteVerse && (
        <NoteModal
          verseId={noteVerse.id}
          verseRef={noteVerse.ref}
          verseText={noteVerse.text}
          onClose={() => setNoteVerse(null)}
        />
      )}

      {translationsVerse && (
        <TranslationsModal
          verseId={translationsVerse.verseId}
          verseRef={translationsVerse.verseRef}
          onClose={() => setTranslationsVerse(null)}
        />
      )}
    </div>
  );
}
