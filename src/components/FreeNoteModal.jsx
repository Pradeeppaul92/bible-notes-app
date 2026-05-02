import { useState, useRef, useEffect } from 'react';
import { parseReference } from '../utils/searchUtils';
import { saveFreeNote, deleteFreeNote } from '../utils/storage';

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
  const [verseHint, setVerseHint]       = useState(null);
  const [versePreview, setVersePreview] = useState(null); // { ref, text } once fetched
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const bodyRef = useRef(null);

  // Auto-fetch verse text whenever the detected reference changes
  useEffect(() => {
    if (!verseHint?.verse) { setVersePreview(null); return; }
    let cancelled = false;
    setVersePreview(null);
    setLoadingPreview(true);
    const { book, chapter, verse, verseEnd } = verseHint;
    const rangeStr = verseEnd ? `${verse}-${verseEnd}` : `${verse}`;
    const ref = verseEnd ? `${book.name} ${chapter}:${verse}-${verseEnd}` : `${book.name} ${chapter}:${verse}`;
    fetch(`https://bible-api.com/${encodeURIComponent(book.name)}+${chapter}:${rangeStr}?translation=kjv`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const verses = data.verses || [];
        // For ranges include verse numbers; for single verse just the text
        const text = verses.length > 1
          ? verses.map((v) => `[${v.verse}] ${v.text.trim()}`).join('  ')
          : verses[0]?.text?.trim() || '';
        if (text) setVersePreview({ ref, text, verses });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [verseHint?.book?.id, verseHint?.chapter, verseHint?.verse, verseHint?.verseEnd]);

  function handleBodyChange(e) {
    const val = e.target.value;
    setBody(val);
    setVerseHint(detectRefBeforeCursor(val, e.target.selectionStart));
  }

  function insertVerse() {
    if (!versePreview || !verseHint) return;
    const { originalText } = verseHint;
    const expanded = `${versePreview.ref} — "${versePreview.text}"`;
    const lastIdx = body.lastIndexOf(originalText);
    if (lastIdx >= 0) {
      setBody(body.slice(0, lastIdx) + expanded + body.slice(lastIdx + originalText.length));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.30)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal w-full max-w-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--tile-divider, rgba(185,140,40,0.12))' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--tile-text)', fontFamily: 'Georgia, serif' }}>
            {note ? 'Edit Note' : 'New Note'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: 'var(--tile-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Heading input */}
          <input
            type="text"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="Note title..."
            spellCheck={true}
            className="w-full rounded-xl px-4 py-3 text-base font-semibold glass-input"
            style={{ fontFamily: 'Georgia, serif' }}
          />

          {/* Body textarea */}
          <textarea
            ref={bodyRef}
            value={body}
            onChange={handleBodyChange}
            placeholder={note ? "Continue writing..." : "Write your notes here...\n\nTip: type a Bible reference like \"John 3:16\", \"Gen 4:3\", or a range like \"Psalm 23:1-6\" and tap \"Insert verse\" to expand it."}
            spellCheck={true}
            rows={9}
            className="w-full rounded-xl px-4 py-3 text-sm leading-relaxed glass-input resize-none"
            style={{ fontFamily: 'Georgia, serif' }}
          />

          {/* Verse preview card */}
          {verseHint && (
            <div className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--glass-content-bd)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

              {/* Reference header */}
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: 'var(--accent, #a86e10)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14 }}>📖</span>
                  <span className="text-sm font-bold" style={{ color: '#fff', fontFamily: 'Georgia, serif' }}>
                    {verseHint.book.name} {verseHint.chapter}:{verseHint.verse}
                  </span>
                </div>
                <button onClick={() => { setVerseHint(null); setVersePreview(null); }}
                  className="text-sm leading-none hover:opacity-70 transition"
                  style={{ color: 'rgba(255,255,255,0.75)' }}>✕</button>
              </div>

              {/* Verse text body */}
              <div className="px-4 py-3" style={{ background: 'var(--glass-content-bg)' }}>
                {loadingPreview && (
                  <p className="text-xs italic" style={{ color: 'var(--tile-muted)' }}>Loading verse…</p>
                )}
                {!loadingPreview && versePreview && (
                  <p className="text-sm leading-relaxed italic" style={{ color: 'var(--tile-sub)', fontFamily: 'Georgia, serif' }}>
                    {renderVerseText(versePreview.text)}
                  </p>
                )}
                {!loadingPreview && !versePreview && (
                  <p className="text-xs italic" style={{ color: 'var(--tile-muted)' }}>Could not load verse.</p>
                )}
              </div>

              {/* Insert action */}
              {versePreview && (
                <div className="px-4 py-2.5 flex justify-end"
                  style={{ background: 'var(--glass-content-bg)', borderTop: '1px solid var(--glass-content-bd)' }}>
                  <button
                    onClick={insertVerse}
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

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--tile-divider, rgba(185,140,40,0.12))' }}>
          {note ? (
            showDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--tile-muted)' }}>Delete this note?</span>
                <button onClick={handleDelete}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(185,28,28,0.10)', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.20)' }}>
                  Yes, delete
                </button>
                <button onClick={() => setShowDelete(false)}
                  className="text-xs px-3 py-1.5 rounded-lg hover:opacity-70 transition"
                  style={{ color: 'var(--tile-muted)' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setShowDelete(true)}
                className="text-sm px-4 py-2 rounded-xl transition-all hover:opacity-80"
                style={{ color: '#b91c1c', background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.15)' }}>
                Delete
              </button>
            )
          ) : <div />}

          <div className="flex gap-2">
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
  );
}
