import { useState, useEffect, useRef } from 'react';
import { parseReference, suggestReference } from '../utils/searchUtils';
import { getChapterContent } from '../utils/bibleApi';
import { saveFreeNote, deleteFreeNote } from '../utils/storage';
import { NOTE_COLORS } from '../data/noteColors';
import RichTextEditor from './RichTextEditor';

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tile-muted)', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
        Color
      </span>
      <div className="flex items-center gap-1.5">
        {NOTE_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onChange(value === c.id ? null : c.id); }}
            title={c.id}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              background: c.swatch,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
              boxShadow: value === c.id
                ? `0 0 0 2px #fff, 0 0 0 3.5px ${c.swatch}`
                : '0 1px 3px rgba(0,0,0,0.22)',
              transform: value === c.id ? 'scale(1.25)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Common abbreviations → full book names (lowercase)
const ABBREVS = {
  'gen': 'genesis',
  'ex': 'exodus', 'exo': 'exodus',
  'lev': 'leviticus',
  'num': 'numbers',
  'deut': 'deuteronomy', 'deu': 'deuteronomy',
  'josh': 'joshua', 'jos': 'joshua',
  'judg': 'judges', 'jdg': 'judges', 'judge': 'judges',
  'ps': 'psalms', 'psa': 'psalms', 'psalm': 'psalms',
  'prov': 'proverbs', 'pro': 'proverbs', 'prv': 'proverbs', 'proverb': 'proverbs',
  'ecc': 'ecclesiastes', 'eccl': 'ecclesiastes',
  'isa': 'isaiah',
  'jer': 'jeremiah',
  'lam': 'lamentations',
  'ezek': 'ezekiel', 'eze': 'ezekiel',
  'dan': 'daniel',
  'hos': 'hosea',
  'mic': 'micah',
  'nah': 'nahum',
  'hab': 'habakkuk',
  'zeph': 'zephaniah', 'zep': 'zephaniah',
  'hag': 'haggai',
  'zech': 'zechariah', 'zec': 'zechariah',
  'mal': 'malachi',
  'matt': 'matthew', 'mat': 'matthew', 'mt': 'matthew',
  'mk': 'mark', 'mar': 'mark',
  'lk': 'luke',
  'jn': 'john', 'joh': 'john',
  'rom': 'romans',
  '1cor': '1 corinthians', '2cor': '2 corinthians',
  '1co': '1 corinthians', '2co': '2 corinthians',
  'gal': 'galatians',
  'eph': 'ephesians',
  'phil': 'philippians', 'php': 'philippians',
  'col': 'colossians',
  '1thess': '1 thessalonians', '2thess': '2 thessalonians',
  '1th': '1 thessalonians', '2th': '2 thessalonians',
  '1tim': '1 timothy', '2tim': '2 timothy',
  '1ti': '1 timothy', '2ti': '2 timothy',
  'tit': 'titus',
  'phlm': 'philemon', 'phm': 'philemon',
  'heb': 'hebrews',
  'jas': 'james', 'jms': 'james',
  '1pet': '1 peter', '2pet': '2 peter',
  '1pe': '1 peter', '2pe': '2 peter',
  '1jn': '1 john', '2jn': '2 john', '3jn': '3 john',
  '1jo': '1 john', '2jo': '2 john', '3jo': '3 john',
  'rev': 'revelation',
};

// Render text that may contain [n] verse-number markers as styled superscripts
function renderVerseText(text) {
  const parts = text.split(/(\[\d+\])/);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      return (
        <sup key={i} style={{
          fontSize: '0.6em', fontWeight: 700, fontStyle: 'normal',
          color: 'var(--accent)', marginRight: 2, marginLeft: i > 0 ? 6 : 0,
          verticalAlign: 'super',
        }}>{m[1]}</sup>
      );
    }
    return part;
  });
}

function tryParseRef(text) {
  const lower = text.trim().toLowerCase();
  // Try direct parse first
  const direct = parseReference(lower);
  if (direct?.verse) return direct;
  // Try expanding abbreviation
  for (const [abbr, full] of Object.entries(ABBREVS)) {
    if (lower === abbr || lower.startsWith(abbr + ' ') || lower.startsWith(abbr + '.')) {
      const rest = lower.slice(abbr.length).replace(/^[.\s]+/, '');
      const expanded = full + (rest ? ' ' + rest : '');
      const parsed = parseReference(expanded);
      if (parsed?.verse) return parsed;
    }
  }
  return null;
}

// Scan backward from cursor across word-boundaries to find a Bible ref
// Works even mid-sentence: "I read John 3:16" → detects "John 3:16"
function detectRefBeforeCursor(text, cursorPos) {
  if (!text || cursorPos == null) return null;
  const before = text.slice(0, cursorPos).trimEnd();
  if (before.length < 3) return null;

  // Work in the last 70 chars for perf
  const tail = before.slice(Math.max(0, before.length - 70));

  // Collect word-start positions (after a space or newline, or position 0)
  const starts = [0];
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] === ' ' || tail[i] === '\n') starts.push(i + 1);
  }

  // Try each word-start from rightmost (most recent) to left
  for (let i = starts.length - 1; i >= 0; i--) {
    const candidate = tail.slice(starts[i]).trim();
    if (candidate.length < 3) continue;
    const parsed = tryParseRef(candidate);
    if (parsed?.verse) {
      return { ...parsed, originalText: tail.slice(starts[i]).trimStart() };
    }
  }
  return null;
}

export default function FreeNoteModal({ note, onClose }) {
  const [heading, setHeading]   = useState(note?.heading || '');
  const [body, setBody]         = useState(note?.body || '');
  const [color, setColor]       = useState(note?.color || null);
  const [verseHint, setVerseHint]       = useState(null);
  const [fuzzyHint, setFuzzyHint]       = useState(null);
  const [versePreview, setVersePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const editorWrapperRef = useRef(null);

  // Auto-fetch verse text whenever the detected reference changes
  useEffect(() => {
    if (!verseHint?.verse) { setVersePreview(null); return; }
    let cancelled = false;
    setVersePreview(null);
    setLoadingPreview(true);
    const { book, chapter, verse, verseEnd } = verseHint;
    const ref = verseEnd ? `${book.name} ${chapter}:${verse}-${verseEnd}` : `${book.name} ${chapter}:${verse}`;
    const translation = localStorage.getItem('sefer_translation') || 'nkjv';
    const chapterId = `${book.id}.${chapter}`;

    function extractVerses(chapterData, usedTranslation) {
      const verses = (chapterData.verses || []).filter((v) =>
        v.verse >= verse && v.verse <= (verseEnd || verse)
      );
      const text = verses.length > 1
        ? verses.map((v) => `[${v.verse}] ${v.text.trim()}`).join('  ')
        : verses[0]?.text?.trim() || '';
      if (text) setVersePreview({ ref, text, verses, usedTranslation });
    }

    getChapterContent(chapterId, translation)
      .then((chapterData) => { if (!cancelled) extractVerses(chapterData, translation); })
      .catch(() => {
        // Primary translation failed — fall back to local KJV
        if (cancelled) return;
        getChapterContent(chapterId, 'kjv')
          .then((chapterData) => { if (!cancelled) extractVerses(chapterData, 'kjv'); })
          .catch(() => {});
      })
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [verseHint?.book?.id, verseHint?.chapter, verseHint?.verse, verseHint?.verseEnd]);

  // Called by RichTextEditor with plain text before cursor on every keystroke / cursor move
  function handleCursorChange(textBefore) {
    const hint = detectRefBeforeCursor(textBefore, textBefore.length);
    if (hint) { setVerseHint(hint); setFuzzyHint(null); return; }

    // Fuzzy: look for a mistyped reference just before the cursor (e.g. "Jhon 3:16")
    const tail = textBefore.slice(Math.max(0, textBefore.length - 80));
    const refMatch = tail.match(/(\b[a-zA-Z]+\s+\d+:\d+(?:-\d+)?)\s*$/);
    if (refMatch) {
      const candidate = refMatch[1];
      const suggested = suggestReference(candidate);
      if (suggested && suggested.toLowerCase() !== candidate.toLowerCase()) {
        const parsed = tryParseRef(suggested);
        if (parsed?.verse) { setFuzzyHint({ original: candidate, suggested, parsed }); setVerseHint(null); return; }
      }
    }
    setVerseHint(null); setFuzzyHint(null);
  }

  function acceptFuzzy() {
    if (!fuzzyHint) return;
    // Correct the misspelling in the body HTML
    const lastIdx = body.lastIndexOf(fuzzyHint.original);
    if (lastIdx >= 0) {
      setBody(body.slice(0, lastIdx) + fuzzyHint.suggested + body.slice(lastIdx + fuzzyHint.original.length));
    }
    setVerseHint({ ...fuzzyHint.parsed, originalText: fuzzyHint.suggested });
    setFuzzyHint(null);
  }

  function insertVerse() {
    if (!versePreview || !verseHint) return;
    const { originalText } = verseHint;
    const expanded = `${versePreview.ref} — "${versePreview.text}"`;
    // body is HTML; originalText is plain text that appears literally inside the HTML
    const lastIdx = body.lastIndexOf(originalText);
    if (lastIdx >= 0) {
      setBody(body.slice(0, lastIdx) + expanded + body.slice(lastIdx + originalText.length));
    } else {
      // Fallback: append at end of last paragraph
      setBody(body.replace(/<\/p>$/, '') + ' ' + expanded + '</p>');
    }
    setVerseHint(null);
    setVersePreview(null);
  }

  function handleSave() {
    if (!heading.trim() && !body.trim()) return;
    saveFreeNote({
      id: note?.id || Date.now().toString(),
      heading: heading.trim(),
      body: body.trim(),
      color,
      createdAt: note?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  }

  function handleDelete() {
    if (note?.id) deleteFreeNote(note.id);
    onClose();
  }

  const canSave = heading.trim().length > 0 || body.trim().length > 0;
  const activeColor = NOTE_COLORS.find((c) => c.id === color) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-14"
      style={{ background: 'rgba(0,0,0,0.30)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal w-full max-w-2xl flex flex-col" style={{
        maxHeight: '90vh',
        borderColor: activeColor?.border || undefined,
        transition: 'border-color 0.3s',
      }}>

        {/* Color accent bar */}
        <div style={{
          height: 4,
          borderRadius: '1.5rem 1.5rem 0 0',
          background: activeColor ? activeColor.swatch : 'transparent',
          transition: 'background 0.3s',
        }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4" style={{
          borderBottom: `1px solid ${activeColor?.border || 'var(--tile-divider, rgba(185,140,40,0.12))'}`,
          transition: 'border-color 0.3s',
        }}>
          <h2 className="font-bold text-lg" style={{ color: activeColor?.dot || 'var(--tile-text)', fontFamily: "Lora, Georgia, serif", transition: 'color 0.3s' }}>
            {note ? 'Edit Note' : 'New Note'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: 'var(--tile-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{
          background: activeColor?.card || 'transparent',
          transition: 'background 0.3s',
        }}>

          {/* Heading input */}
          <input
            type="text"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="Note title..."
            spellCheck={true}
            className="w-full rounded-xl px-4 py-3 text-base font-semibold glass-input"
            style={{
              fontFamily: "Lora, Georgia, serif",
              borderColor: activeColor?.border || undefined,
              transition: 'border-color 0.3s',
            }}
          />

          {/* Body editor */}
          <div ref={editorWrapperRef}>
            <RichTextEditor
              content={body}
              onChange={setBody}
              onCursorChange={handleCursorChange}
              placeholder="Write your notes here…"
              minHeight={200}
              accentColor={activeColor?.dot}
            />
          </div>

          {/* Verse / fuzzy hint — sticky so it always stays visible inside the scroll area */}
          {(verseHint || (fuzzyHint && !verseHint)) && (
            <div style={{ position: 'sticky', bottom: 8, zIndex: 50 }}>

              {fuzzyHint && !verseHint && (
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--glass-content-bd)', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: 'rgba(160,100,0,0.95)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14 }}>🔍</span>
                      <span className="text-sm font-semibold" style={{ color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
                        Did you mean <span style={{ fontFamily: 'Lora, Georgia, serif', fontStyle: 'italic' }}>{fuzzyHint.suggested}</span>?
                      </span>
                    </div>
                    <button onClick={() => setFuzzyHint(null)}
                      className="text-sm leading-none hover:opacity-70 transition"
                      style={{ color: 'rgba(255,255,255,0.75)' }}>✕</button>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-end gap-3"
                    style={{ background: 'var(--glass-content-bg)', borderTop: '1px solid var(--glass-content-bd)' }}>
                    <span className="text-xs" style={{ color: 'var(--tile-muted)' }}>Correct "{fuzzyHint.original}" and load verse</span>
                    <button onClick={acceptFuzzy}
                      className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                      Yes, use this
                    </button>
                  </div>
                </div>
              )}

              {verseHint && (
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--glass-content-bd)', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: 'var(--accent, #a86e10)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14 }}>📖</span>
                      <span className="text-sm font-bold" style={{ color: '#fff', fontFamily: "Lora, Georgia, serif" }}>
                        {verseHint.book.name} {verseHint.chapter}:{verseHint.verse}
                      </span>
                      {versePreview?.usedTranslation && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'system-ui, sans-serif' }}>
                          {versePreview.usedTranslation}
                        </span>
                      )}
                    </div>
                    <button onClick={() => { setVerseHint(null); setVersePreview(null); }}
                      className="text-sm leading-none hover:opacity-70 transition"
                      style={{ color: 'rgba(255,255,255,0.75)' }}>✕</button>
                  </div>
                  <div className="px-4 py-3" style={{ background: 'var(--glass-content-bg)' }}>
                    {loadingPreview && <p className="text-xs italic" style={{ color: 'var(--tile-muted)' }}>Loading verse…</p>}
                    {!loadingPreview && versePreview && (
                      <p className="text-sm leading-relaxed italic" style={{ color: 'var(--tile-sub)', fontFamily: "Lora, Georgia, serif" }}>
                        {renderVerseText(versePreview.text)}
                      </p>
                    )}
                    {!loadingPreview && !versePreview && (
                      <p className="text-xs italic" style={{ color: 'var(--tile-muted)' }}>Could not load verse.</p>
                    )}
                  </div>
                  {versePreview && (
                    <div className="px-4 py-2.5 flex justify-end"
                      style={{ background: 'var(--glass-content-bg)', borderTop: '1px solid var(--glass-content-bd)' }}>
                      <button onClick={insertVerse}
                        className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                        Insert into note
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3" style={{
          borderTop: `1px solid ${activeColor?.border || 'var(--tile-divider, rgba(185,140,40,0.12))'}`,
          background: activeColor?.card || 'transparent',
          transition: 'border-color 0.3s, background 0.3s',
        }}>
          {note && !showDelete ? (
            <button onClick={() => setShowDelete(true)}
              className="text-sm px-4 py-2 rounded-xl transition-all hover:opacity-80 shrink-0"
              style={{ color: '#b91c1c', background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.15)' }}>
              Delete
            </button>
          ) : note && showDelete ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs" style={{ color: 'var(--tile-muted)' }}>Delete?</span>
              <button onClick={handleDelete}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(185,28,28,0.10)', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.20)' }}>
                Yes
              </button>
              <button onClick={() => setShowDelete(false)}
                className="text-xs px-3 py-1.5 rounded-lg hover:opacity-70 transition"
                style={{ color: 'var(--tile-muted)' }}>
                No
              </button>
            </div>
          ) : <div />}

          <div className="flex items-center gap-4 ml-auto">
            <ColorPicker value={color} onChange={setColor} />
            <div className="flex gap-2 shrink-0">
              <button onClick={onClose}
                className="text-sm px-4 py-2 rounded-xl transition-all"
                style={{ color: 'var(--tile-sub)', background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="text-sm px-5 py-2 rounded-xl font-semibold transition-all"
                style={{ background: canSave ? 'var(--accent)' : 'rgba(0,0,0,0.12)', color: canSave ? '#fff' : 'rgba(0,0,0,0.35)', cursor: canSave ? 'pointer' : 'not-allowed' }}>
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
