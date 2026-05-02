import { useState, useEffect, useRef, useMemo } from 'react';
import { getAllVerseNotes, getFreeNotes, getHighlightList, removeHighlight } from '../utils/storage';
import { parseReference } from '../utils/searchUtils';
import NoteModal from './NoteModal';
import FreeNoteModal from './FreeNoteModal';

// Same abbrev map as FreeNoteModal / PrayerPage
const ABBREVS = {
  'gen':'genesis','ex':'exodus','exo':'exodus','lev':'leviticus','num':'numbers',
  'deut':'deuteronomy','josh':'joshua','judg':'judges','judge':'judges',
  'ps':'psalms','psa':'psalms','psalm':'psalms',
  'prov':'proverbs','pro':'proverbs','proverb':'proverbs','prv':'proverbs',
  'ecc':'ecclesiastes','eccl':'ecclesiastes','isa':'isaiah','jer':'jeremiah',
  'lam':'lamentations','ezek':'ezekiel','eze':'ezekiel','dan':'daniel',
  'hos':'hosea','mic':'micah','nah':'nahum','hab':'habakkuk','zeph':'zephaniah',
  'zep':'zephaniah','hag':'haggai','zech':'zechariah','zec':'zechariah','mal':'malachi',
  'matt':'matthew','mat':'matthew','mt':'matthew','mk':'mark','mar':'mark','lk':'luke',
  'jn':'john','joh':'john','rom':'romans',
  '1cor':'1 corinthians','2cor':'2 corinthians','1co':'1 corinthians','2co':'2 corinthians',
  'gal':'galatians','eph':'ephesians','phil':'philippians','php':'philippians',
  'col':'colossians','1thess':'1 thessalonians','2thess':'2 thessalonians',
  '1th':'1 thessalonians','2th':'2 thessalonians','1tim':'1 timothy','2tim':'2 timothy',
  '1ti':'1 timothy','2ti':'2 timothy','tit':'titus','phlm':'philemon','phm':'philemon',
  'heb':'hebrews','jas':'james','jms':'james',
  '1pet':'1 peter','2pet':'2 peter','1pe':'1 peter','2pe':'2 peter',
  '1jn':'1 john','2jn':'2 john','3jn':'3 john','1jo':'1 john','2jo':'2 john','3jo':'3 john',
  'rev':'revelation',
};

function tryParseRef(text) {
  const lower = text.trim().toLowerCase();
  const direct = parseReference(lower);
  if (direct?.verse) return direct;
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

const T = {
  text:      '#1a1007',
  textSub:   '#5c4030',
  textMuted: '#8a7060',
  accent:    'var(--accent, #a86e10)',
  divider:   'var(--tile-divider, rgba(185,140,40,0.12))',
};

const ACCENTS = [
  { bg: 'rgba(109,40,217,0.06)',  border: 'rgba(109,40,217,0.18)',  dot: '#6d28d9' },
  { bg: 'rgba(14,116,144,0.06)',  border: 'rgba(14,116,144,0.18)',  dot: '#0e7490' },
  { bg: 'rgba(6,95,70,0.06)',     border: 'rgba(6,95,70,0.18)',     dot: '#065f46' },
  { bg: 'rgba(146,64,14,0.06)',   border: 'rgba(146,64,14,0.18)',   dot: '#92400e' },
  { bg: 'rgba(157,23,77,0.06)',   border: 'rgba(157,23,77,0.18)',   dot: '#9d174d' },
];

// highlight color map (matches BibleReader HIGHLIGHT_COLORS)
const HL_COLORS = {
  yellow: '#fde68a', green: '#bbf7d0', blue: '#bfdbfe',
  pink: '#fecdd3', purple: '#e9d5ff', orange: '#fed7aa',
};

function slugify(str) {
  return (str || 'note').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').slice(0, 48);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function saveFile(filename, content, mimeType) {
  if (window.showSaveFilePicker) {
    const ext    = filename.split('.').pop();
    const accept = ext === 'doc' ? { 'text/html': ['.doc'] } : { 'text/plain': ['.txt'] };
    window.showSaveFilePicker({ suggestedName: filename, types: [{ accept }] })
      .then((h) => h.createWritable())
      .then((w) => w.write(new Blob([content], { type: mimeType })).then(() => w.close()))
      .catch((err) => { if (err.name !== 'AbortError') blobDownload(filename, content); });
    return;
  }
  blobDownload(filename, content);
}

function blobDownload(filename, content) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function buildWordHtml(title, dateStr, verseText, body) {
  const safeBody = (body || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\[(\d+)\]/g, '<sup>$1</sup>')
    .replace(/\n/g, '<br>');
  const safeVerse = verseText
    ? verseText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
               .replace(/\[(\d+)\]/g, '<sup>$1</sup>')
    : '';
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>${title}</title>
<style>
  body  { font-family: Georgia, serif; margin: 72pt 80pt; color: #1a1007; }
  h1    { font-size: 18pt; color: #a86e10; margin-bottom: 2pt; }
  .dt  { font-size: 9pt; color: #8a7060; margin-bottom: 14pt; }
  blockquote { font-style: italic; border-left: 3pt solid #a86e10; padding-left: 10pt;
               margin: 10pt 0 14pt; color: #5c4030; font-size: 11pt; line-height: 1.7; }
  p     { font-size: 12pt; line-height: 1.75; }
  hr    { border: none; border-top: 1pt solid #e7d9c0; margin: 18pt 0 10pt; }
  .ft   { font-size: 8pt; color: #b09070; }
  sup   { font-size: 7pt; color: #a86e10; vertical-align: super; }
</style></head>
<body>
  <h1>${title}</h1>
  <div class="dt">${dateStr} &nbsp;·&nbsp; Sefer Bible Study</div>
  ${safeVerse ? `<blockquote>"${safeVerse}"</blockquote>` : ''}
  ${safeBody ? `<p>${safeBody}</p>` : ''}
  <hr><p class="ft">Sefer · KJV Bible Study App</p>
</body></html>`;
}

function ShareMenu({ id, shareOpen, setShareOpen, txtContent, txtName, docContent, docName }) {
  const ref = useRef(null);
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setShareOpen(null);
    }
    document.addEventListener('mouseup', handleClick);
    return () => document.removeEventListener('mouseup', handleClick);
  }, [setShareOpen]);

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShareOpen(shareOpen === id ? null : id); }}
        className="flex items-center justify-center rounded-lg transition-all"
        style={{
          width: 28, height: 28,
          background: shareOpen === id ? 'rgba(168,110,16,0.12)' : 'transparent',
          border: '1px solid transparent',
          color: '#a86e10',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,110,16,0.12)'; e.currentTarget.style.borderColor = 'rgba(168,110,16,0.22)'; }}
        onMouseLeave={(e) => { if (shareOpen !== id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
        title="Save / Export"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>
      {shareOpen === id && (
        <div style={{
          position: 'absolute', top: 30, right: 0, zIndex: 9999, width: 178,
          background: 'linear-gradient(160deg, rgba(58,58,62,0.97) 0%, rgba(36,36,40,0.99) 100%)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '5px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          {[
            { label: 'Word document (.doc)', icon: '📄', content: docContent, name: docName, mime: 'text/html' },
            { label: 'Plain text (.txt)',    icon: '📝', content: txtContent, name: txtName, mime: 'text/plain' },
          ].map(({ label, icon, content, name, mime }) => (
            <button key={name}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShareOpen(null); saveFile(name, content, mime); }}
              className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: 500 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  const [verseNotes, setVerseNotes] = useState([]);
  const [freeNotes, setFreeNotes]   = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [hlTexts, setHlTexts]       = useState({});
  const [selected, setSelected]     = useState(null);
  const [editing, setEditing]       = useState(null);
  const [query, setQuery]           = useState('');
  const [shareOpen, setShareOpen]   = useState(null);

  // New-note type picker
  const [showPicker, setShowPicker]         = useState(false);
  const [verseSelectOpen, setVerseSelectOpen] = useState(false);
  const [verseInput, setVerseInput]         = useState('');
  const [verseSelectError, setVerseSelectError] = useState('');
  const [verseSelectLoading, setVerseSelectLoading] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleVerseSelect() {
    const parsed = tryParseRef(verseInput.trim());
    if (!parsed?.verse) { setVerseSelectError('Could not recognise that reference. Try "John 3:16".'); return; }
    setVerseSelectError('');
    setVerseSelectLoading(true);
    const { book, chapter, verse } = parsed;
    try {
      const res  = await fetch(`https://bible-api.com/${encodeURIComponent(book.name)}+${chapter}:${verse}?translation=kjv`);
      const data = await res.json();
      const text = data.verses?.[0]?.text?.trim() || '';
      const verseId  = `${book.id}.${chapter}.${verse}`;
      const verseRef = `${book.name} ${chapter}:${verse}`;
      setVerseSelectOpen(false);
      setVerseInput('');
      setSelected({ verseId, verseRef, verseText: text });
    } catch {
      setVerseSelectError('Could not fetch verse. Check your connection.');
    } finally {
      setVerseSelectLoading(false);
    }
  }

  function refresh() {
    setVerseNotes(getAllVerseNotes());
    setFreeNotes(getFreeNotes());
    setHighlights(getHighlightList());
  }
  useEffect(() => { refresh(); }, []);

  // Fetch verse text for any highlight that's missing it
  useEffect(() => {
    const missing = highlights.filter((hl) => !hl.text && hl.ref);
    if (missing.length === 0) return;
    missing.forEach((hl) => {
      // parse "Book chapter:verse" from ref
      const m = hl.ref.match(/^(.+?)\s+(\d+):(\d+(?:-\d+)?)$/);
      if (!m) return;
      const [, book, chapter, verseRange] = m;
      fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}:${verseRange}?translation=kjv`)
        .then((r) => r.json())
        .then((data) => {
          const verses = data.verses || [];
          const text = verses.length > 1
            ? verses.map((v) => `[${v.verse}] ${v.text.trim()}`).join('  ')
            : verses[0]?.text?.trim() || '';
          if (text) setHlTexts((prev) => ({ ...prev, [hl.verseId]: text }));
        })
        .catch(() => {});
    });
  }, [highlights]);

  const filteredVerse = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return verseNotes;
    return verseNotes.filter((e) =>
      e.verseRef.toLowerCase().includes(q) ||
      e.verseText?.toLowerCase().includes(q) ||
      e.notes.some((n) => n.text.toLowerCase().includes(q))
    );
  }, [query, verseNotes]);

  const filteredFree = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return freeNotes;
    return freeNotes.filter((n) =>
      n.heading?.toLowerCase().includes(q) ||
      n.body?.toLowerCase().includes(q)
    );
  }, [query, freeNotes]);

  const totalCount = verseNotes.length + freeNotes.length;

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (

    <div className="flex gap-5 items-start">

      {/* ── Left 75%: notes content ───────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-xl" style={{ color: T.text, fontFamily: 'Georgia, serif' }}>My Notes</h2>
            {totalCount > 0 && (
              <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                {freeNotes.length} note{freeNotes.length !== 1 ? 's' : ''} · {verseNotes.length} verse{verseNotes.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
          <div ref={pickerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPicker((p) => !p)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              + New Note
            </button>

            {showPicker && (
              <div style={{
                position: 'absolute', top: 42, right: 0, zIndex: 9999, width: 200,
                background: 'linear-gradient(160deg, rgba(58,58,62,0.97) 0%, rgba(36,36,40,0.99) 100%)',
                backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14,
                padding: '6px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
              }}>
                {[
                  { label: 'Personal Note', icon: '✍️', action: () => { setEditing(false); setShowPicker(false); } },
                  { label: 'Verse Note',    icon: '📖', action: () => { setVerseSelectOpen(true); setShowPicker(false); } },
                ].map(({ label, icon, action }) => (
                  <button key={label} onClick={action}
                    className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg transition-all"
                    style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: 500 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 15 }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Search */}
        {totalCount > 0 && (
          <div className="relative mb-5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, verses, or keywords..."
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm pr-9"
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none transition"
                style={{ color: T.textMuted }}>×</button>
            )}
          </div>
        )}

        {/* Empty state */}
        {totalCount === 0 && (
          <div className="glass-card rounded-2xl text-center py-20 px-6">
            <p className="text-4xl mb-5">✦</p>
            <p className="text-lg font-semibold" style={{ color: T.text }}>No notes yet</p>
            <p className="text-sm mt-2 mb-6" style={{ color: T.textMuted }}>
              Create a personal note or tap a verse number in the Bible reader to add verse notes.
            </p>
            <button
              onClick={() => setShowPicker(true)}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              + Create your first note
            </button>
          </div>
        )}

        {/* No search results */}
        {totalCount > 0 && filteredFree.length === 0 && filteredVerse.length === 0 && (
          <div className="glass-card rounded-2xl text-center py-14 px-6">
            <p className="text-sm" style={{ color: T.textMuted }}>
              No notes match <span style={{ color: T.text }}>"{query}"</span>
            </p>
          </div>
        )}

        {/* ── Free notes section ─────────────────────── */}
        {filteredFree.length > 0 && (
          <div className="mb-6">
            {(filteredVerse.length > 0 || query) && (
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textMuted }}>Personal Notes</p>
                <div style={{ flex: 1, height: 1, background: T.divider }} />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredFree.map((note, i) => {
                const a = ACCENTS[i % ACCENTS.length];
                return (
                  <div
                    key={note.id}
                    className="relative rounded-2xl p-5 transition-all duration-200"
                    style={{ background: '#ffffff', border: `1.5px solid ${a.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.11)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'; }}
                    onClick={() => setEditing(note)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-bold leading-snug" style={{ color: a.dot, fontFamily: 'Georgia, serif' }}>
                        {note.heading || 'Untitled'}
                      </span>
                      <ShareMenu
                        id={note.id}
                        shareOpen={shareOpen}
                        setShareOpen={setShareOpen}
                        txtContent={[note.heading || 'Untitled', fmtDate(note.updatedAt || note.createdAt), '', note.body || ''].join('\n')}
                        txtName={`${slugify(note.heading)}.txt`}
                        docContent={buildWordHtml(note.heading || 'Untitled', fmtDate(note.updatedAt || note.createdAt), null, note.body)}
                        docName={`${slugify(note.heading)}.doc`}
                      />
                    </div>
                    {note.body && (
                      <p className="text-xs leading-relaxed line-clamp-3 mt-1" style={{ color: T.textMuted }}>
                        {note.body}
                      </p>
                    )}
                    <div style={{ borderTop: `1px solid ${T.divider}`, margin: '8px 0 6px' }} />
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.dot }} />
                      <span className="text-xs" style={{ color: T.textMuted }}>
                        {formatDate(note.updatedAt || note.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Verse notes section ────────────────────── */}
        {filteredVerse.length > 0 && (
          <div>
            {filteredFree.length > 0 && (
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textMuted }}>Verse Notes</p>
                <div style={{ flex: 1, height: 1, background: T.divider }} />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredVerse.map((entry, i) => {
                const a = ACCENTS[(i + filteredFree.length) % ACCENTS.length];
                return (
                  <div
                    key={entry.verseId}
                    className="relative rounded-2xl p-5 transition-all duration-200"
                    style={{ background: '#ffffff', border: `1.5px solid ${a.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.11)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'; }}
                    onClick={() => setSelected(entry)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-bold" style={{ color: a.dot, fontFamily: 'Georgia, serif' }}>
                        {entry.verseRef}
                      </span>
                      <ShareMenu
                        id={entry.verseId}
                        shareOpen={shareOpen}
                        setShareOpen={setShareOpen}
                        txtContent={[entry.verseRef, fmtDate(entry.lastUpdated), '', entry.verseText ? `"${entry.verseText}"` : '', '', entry.notes.map((n) => n.text).join('\n\n')].join('\n')}
                        txtName={`${slugify(entry.verseRef)}.txt`}
                        docContent={buildWordHtml(entry.verseRef, fmtDate(entry.lastUpdated), entry.verseText, entry.notes.map((n) => n.text).join('\n\n'))}
                        docName={`${slugify(entry.verseRef)}.doc`}
                      />
                    </div>
                    {entry.verseText && (
                      <p className="text-xs leading-relaxed italic mb-2 line-clamp-2"
                        style={{ color: T.textSub, fontFamily: 'Georgia, serif' }}>
                        "{entry.verseText}"
                      </p>
                    )}
                    <div style={{ borderTop: `1px solid ${T.divider}`, margin: '6px 0' }} />
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: T.textMuted }}>
                      {entry.notes[0]?.text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-4">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.dot }} />
                      <span className="text-xs" style={{ color: T.textMuted }}>{formatDate(entry.lastUpdated)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      {highlights.length > 0 && (
        <div className="shrink-0 self-stretch" style={{ width: 1, background: T.divider }} />
      )}

      {/* ── Right 25%: highlighted verses ────────────── */}
      {highlights.length > 0 && (
        <div className="shrink-0" style={{ width: '24%' }}>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textMuted }}>Highlights</p>
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--glass-content-bg)', color: T.textMuted, border: `1px solid ${T.divider}` }}>
              {highlights.length}
            </span>
          </div>
          <div className="space-y-2">
            {highlights.map((hl) => {
              const bgColor = HL_COLORS[hl.color] || '#fde68a';
              return (
                <div
                  key={hl.verseId}
                  className="rounded-xl p-3 relative group"
                  style={{
                    background: bgColor + 'bb',
                    border: `1.5px solid ${bgColor}`,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-bold leading-snug" style={{ color: T.text, fontFamily: 'Georgia, serif' }}>
                      {hl.ref || hl.verseId}
                    </span>
                    <button
                      onClick={() => { removeHighlight(hl.verseId); refresh(); }}
                      className="shrink-0 text-xs leading-none opacity-0 group-hover:opacity-100 transition ml-1"
                      style={{ color: T.textMuted }}
                      title="Remove highlight"
                    >
                      ✕
                    </button>
                  </div>
                  {(hl.text || hlTexts[hl.verseId]) ? (
                    <p className="text-xs leading-relaxed italic line-clamp-3"
                      style={{ color: T.textSub, fontFamily: 'Georgia, serif' }}>
                      "{hl.text || hlTexts[hl.verseId]}"
                    </p>
                  ) : (
                    <p className="text-xs italic" style={{ color: T.textMuted }}>Loading…</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verse-select modal */}
      {verseSelectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.30)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setVerseSelectOpen(false); setVerseInput(''); setVerseSelectError(''); } }}>
          <div className="glass-modal w-full max-w-sm p-6" style={{ borderRadius: 20 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--tile-text)', fontFamily: 'Georgia, serif' }}>
                Choose a Verse
              </h3>
              <button onClick={() => { setVerseSelectOpen(false); setVerseInput(''); setVerseSelectError(''); }}
                className="text-lg leading-none hover:opacity-60 transition"
                style={{ color: 'var(--tile-muted)' }}>✕</button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--tile-muted)' }}>
              Enter a Bible reference to attach your note to.
            </p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={verseInput}
                onChange={(e) => { setVerseInput(e.target.value); setVerseSelectError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerseSelect(); }}
                placeholder="e.g. John 3:16"
                className="glass-input flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{ fontFamily: 'Georgia, serif' }}
              />
              <button
                onClick={handleVerseSelect}
                disabled={!verseInput.trim() || verseSelectLoading}
                className="text-sm font-semibold px-4 py-2 rounded-xl transition-all shrink-0"
                style={{
                  background: verseInput.trim() && !verseSelectLoading ? 'var(--accent)' : 'rgba(0,0,0,0.10)',
                  color: verseInput.trim() && !verseSelectLoading ? '#fff' : 'var(--tile-muted)',
                  cursor: verseInput.trim() && !verseSelectLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {verseSelectLoading ? '…' : 'Go'}
              </button>
            </div>
            {verseSelectError && (
              <p className="text-xs mt-2" style={{ color: '#b91c1c' }}>{verseSelectError}</p>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {selected && (
        <NoteModal
          verseId={selected.verseId}
          verseRef={selected.verseRef}
          verseText={selected.verseText}
          onClose={() => { setSelected(null); refresh(); }}
        />
      )}
      {editing !== null && (
        <FreeNoteModal
          note={editing || null}
          onClose={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}
