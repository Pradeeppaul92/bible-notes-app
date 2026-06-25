import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getAllVerseNotes, getFreeNotes, getHighlightList, removeHighlight, deleteFreeNote, deleteVerseNote } from '../utils/storage';
import { parseReference } from '../utils/searchUtils';
import { NOTE_COLORS } from '../data/noteColors';
import NoteModal from './NoteModal';
import FreeNoteModal from './FreeNoteModal';
import { exportNotes } from '../utils/exportNotes';

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

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
  text:      'var(--tile-text, #1a1007)',
  textSub:   'var(--tile-sub, #5c4030)',
  textMuted: 'var(--tile-muted, rgba(110,75,22,0.45))',
  accent:    'var(--accent, #a86e10)',
  accentLight: 'var(--accent-light, rgba(168,110,16,0.10))',
  accentBorder: 'var(--glass-tile-bd, rgba(185,140,40,0.22))',
  divider:   'var(--tile-divider, rgba(185,140,40,0.12))',
  pageText:  'var(--page-text, rgba(255,245,215,0.92))',
  pageSub:   'var(--page-sub, rgba(255,238,195,0.65))',
  pageMuted: 'var(--page-muted, rgba(255,232,185,0.42))',
};

const ACCENTS = [
  { bg: 'rgba(109,40,217,0.05)',  border: 'rgba(109,40,217,0.16)',  dot: '#6d28d9',  light: 'rgba(109,40,217,0.08)'  },
  { bg: 'rgba(14,116,144,0.05)',  border: 'rgba(14,116,144,0.16)',  dot: '#0e7490',  light: 'rgba(14,116,144,0.08)'  },
  { bg: 'rgba(6,95,70,0.05)',     border: 'rgba(6,95,70,0.16)',     dot: '#065f46',  light: 'rgba(6,95,70,0.08)'     },
  { bg: 'rgba(146,64,14,0.05)',   border: 'rgba(146,64,14,0.16)',   dot: '#92400e',  light: 'rgba(146,64,14,0.08)'   },
  { bg: 'rgba(157,23,77,0.05)',   border: 'rgba(157,23,77,0.16)',   dot: '#9d174d',  light: 'rgba(157,23,77,0.08)'   },
];

const HL_COLORS = {
  yellow: '#fde68a', green: '#bbf7d0', blue: '#bfdbfe',
  pink: '#fecdd3', purple: '#e9d5ff', orange: '#fed7aa',
};

function resolveAccent(colorId, fallbackIndex) {
  if (colorId) {
    const c = NOTE_COLORS.find((x) => x.id === colorId);
    if (c) return c;
  }
  return ACCENTS[fallbackIndex % ACCENTS.length];
}

function slugify(str) {
  return (str || 'note').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').slice(0, 48);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function buildWordHtml(title, dateStr, verseText, body) {
  const safeBody = (body || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\[(\d+)\]/g, '<sup>$1</sup>').replace(/\n/g, '<br>');
  const safeVerse = verseText
    ? verseText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\[(\d+)\]/g, '<sup>$1</sup>')
    : '';
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>${title}</title>
<style>
  body  { font-family: 'Lora', Georgia, serif; margin: 72pt 80pt; color: #1a1007; }
  h1    { font-size: 18pt; color: #a86e10; margin-bottom: 2pt; }
  .dt  { font-size: 9pt; color: #8a7060; margin-bottom: 14pt; }
  blockquote { font-style: italic; border-left: 3pt solid #a86e10; padding-left: 10pt; margin: 10pt 0 14pt; color: #5c4030; font-size: 11pt; line-height: 1.7; }
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

function ThreeDotsMenu({ id, menuOpen, setMenuOpen, onEdit, onDelete, txtContent, txtName, docContent, docName }) {
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pos, setPos] = useState(null);

  const isOpen = menuOpen === id;

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (!btnRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setMenuOpen(null); setConfirmDelete(false);
      }
    }
    document.addEventListener('mouseup', handleClick);
    return () => document.removeEventListener('mouseup', handleClick);
  }, [isOpen, setMenuOpen]);

  function handleToggle(e) {
    e.stopPropagation(); e.preventDefault();
    if (isOpen) { setMenuOpen(null); setConfirmDelete(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setMenuOpen(id); setConfirmDelete(false);
  }

  const menuItem = (label, icon, onClick, danger = false) => (
    <button key={label}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg transition-all"
      style={{ color: danger ? '#f87171' : 'rgba(255,255,255,0.82)', fontSize: 12.5, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.09)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontSize: 13, width: 16, textAlign: 'center' }}>{icon}</span>{label}
    </button>
  );

  const dropdown = isOpen && pos && createPortal(
    <div ref={dropdownRef} style={{
      position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999, width: 192,
      background: 'linear-gradient(160deg, rgba(52,46,42,0.97) 0%, rgba(30,24,20,0.99) 100%)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 4,
      boxShadow: '0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)',
    }} onClick={(e) => e.stopPropagation()}>
      {menuItem('Edit', '✏️', () => { setMenuOpen(null); onEdit(); })}
      {!confirmDelete
        ? menuItem('Delete', '🗑️', () => setConfirmDelete(true), true)
        : (
          <div className="px-3 py-2">
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>Delete this note?</p>
            <div className="flex gap-2">
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(null); setConfirmDelete(false); onDelete(); }}
                className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(248,113,113,0.18)', color: '#f87171', border: '1px solid rgba(248,113,113,0.28)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.28)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.18)'; }}
              >Yes, delete</button>
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false); }}
                className="flex-1 text-xs py-1.5 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >Cancel</button>
            </div>
          </div>
        )
      }
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 4px' }} />
      {menuItem('Export as .doc', '📄', () => { setMenuOpen(null); saveFile(docName, docContent, 'text/html'); })}
      {menuItem('Export as .txt', '📝', () => { setMenuOpen(null); saveFile(txtName, txtContent, 'text/plain'); })}
    </div>,
    document.body
  );

  return (
    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center justify-center rounded-lg transition-all duration-200"
        title="Options"
        style={{
          width: 28, height: 28,
          background: isOpen ? T.accentLight : 'transparent',
          border: '1px solid transparent',
          color: T.accent,
          fontSize: 16, letterSpacing: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.borderColor = T.accentBorder; }}
        onMouseLeave={(e) => { if (!isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
      >
        ···
      </button>
      {dropdown}
    </div>
  );
}

export default function NotesPage({ onReadInBible }) {
  const [verseNotes, setVerseNotes] = useState([]);
  const [freeNotes, setFreeNotes]   = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [hlTexts, setHlTexts]       = useState({});
  const [selected, setSelected]     = useState(null);
  const [editing, setEditing]       = useState(null);
  const [query, setQuery]           = useState('');
  const [menuOpen, setMenuOpen]     = useState(null);
  const [showPicker, setShowPicker]               = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [verseSelectOpen, setVerseSelectOpen]     = useState(false);
  const [verseInput, setVerseInput]               = useState('');
  const [verseSelectError, setVerseSelectError]   = useState('');
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
      setVerseSelectOpen(false); setVerseInput('');
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

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const buffer = await exportNotes();
      const date = new Date().toISOString().slice(0, 10);
      const result = await window.seferAPI.saveDocx(buffer, `Sefer-Notes-${date}.docx`);
      if (!result.success && result.error) console.error('Export failed:', result.error);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    const missing = highlights.filter((hl) => !hl.text && hl.ref);
    if (missing.length === 0) return;
    missing.forEach((hl) => {
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
      n.heading?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q)
    );
  }, [query, freeNotes]);

  const totalCount = verseNotes.length + freeNotes.length;

  return (
    <div className="flex gap-6 items-start">

      {/* ── Left: notes content ──────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '2.1rem', fontWeight: 700, letterSpacing: '-0.03em',
              color: 'var(--page-text)', margin: 0, lineHeight: 1,
            }}>
              My Notes
            </h2>
            {totalCount > 0 && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--page-sub)', fontFamily: "'DM Sans', sans-serif" }}>
                {freeNotes.length} personal · {verseNotes.length} verse{verseNotes.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            {/* Small export button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              title="Export all notes as Word document"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 500, padding: '5px 10px 5px 8px',
                borderRadius: 9999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.13)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                color: 'var(--page-sub)', cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                opacity: exporting ? 0.45 : 0.8,
                transition: 'opacity 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => { if (!exporting) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = exporting ? '0.45' : '0.8'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {exporting ? 'Exporting…' : 'Export'}
            </button>

            {/* New note button — button-in-button CTA */}
            <div ref={pickerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPicker((p) => !p)}
              className="group flex items-center gap-2 text-sm font-semibold text-white rounded-full transition-all duration-300 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, var(--accent, #a86e10), #c4911a)',
                padding: '0.55rem 0.75rem 0.55rem 1.1rem',
                boxShadow: '0 3px 12px rgba(168,110,16,0.28)',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(168,110,16,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(168,110,16,0.28)'; e.currentTarget.style.transform = ''; }}
            >
              <span>+ New Note</span>
              <span
                className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}
              >
                ✎
              </span>
            </button>

            {showPicker && (
              <div style={{
                position: 'absolute', top: 44, right: 0, zIndex: 100, width: 196,
                background: 'linear-gradient(160deg, rgba(52,46,42,0.97) 0%, rgba(30,24,20,0.99) 100%)',
                backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: 5,
                boxShadow: '0 20px 48px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}>
                {[
                  { label: 'Personal Note', sub: 'Free-form journal', icon: '✍️', action: () => { setEditing(false); setShowPicker(false); } },
                  { label: 'Verse Note',    sub: 'Attach to scripture', icon: '📖', action: () => { setVerseSelectOpen(true); setShowPicker(false); } },
                ].map(({ label, sub, icon, action }) => (
                  <button key={label} onClick={action}
                    className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg transition-all"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
                      <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Search */}
        {totalCount > 0 && (
          <div
            className="p-1 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}
          >
            <div
              className="flex items-center gap-2 rounded-[calc(1rem-4px)] px-3 py-2"
              style={{ background: 'var(--input-bg, rgba(255,253,242,1))', border: '1px solid var(--input-bd, rgba(185,140,40,0.18))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.textMuted, flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes, verses, keywords…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  color: T.text,
                  caretColor: 'var(--accent, #a86e10)',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-base leading-none transition-opacity w-5 h-5 flex items-center justify-center rounded-full"
                  style={{ color: T.textMuted, background: 'rgba(0,0,0,0.06)' }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalCount === 0 && (
          <div
            className="p-1.5 rounded-[1.625rem]"
            style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}
          >
            <div className="glass-card rounded-[calc(1.625rem-6px)] text-center py-24 px-8">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                style={{ background: T.accentLight, border: `1px solid ${T.accentBorder}`, fontSize: '2rem' }}
              >
                ✦
              </div>
              <h3
                className="text-xl font-bold mb-2"
                style={{ color: T.text, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif" }}
              >
                No notes yet
              </h3>
              <p
                className="text-sm mb-8 max-w-xs mx-auto leading-relaxed"
                style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}
              >
                Create a personal note or tap a verse number in the Bible reader to add verse notes.
              </p>
              <button
                onClick={() => setShowPicker(true)}
                className="group inline-flex items-center gap-2 text-sm font-semibold text-white rounded-full transition-all duration-300 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, var(--accent, #a86e10), #c4911a)',
                  padding: '0.6rem 0.8rem 0.6rem 1.2rem',
                  boxShadow: '0 3px 12px rgba(168,110,16,0.28)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(168,110,16,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(168,110,16,0.28)'; e.currentTarget.style.transform = ''; }}
              >
                Create your first note
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 group-hover:translate-x-0.5"
                  style={{ background: 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}
                >
                  →
                </span>
              </button>
            </div>
          </div>
        )}

        {/* No search results */}
        {totalCount > 0 && filteredFree.length === 0 && filteredVerse.length === 0 && (
          <div className="glass-card rounded-2xl text-center py-14 px-6">
            <p className="text-sm" style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
              No notes match <span style={{ color: T.text, fontWeight: 600 }}>"{query}"</span>
            </p>
          </div>
        )}

        {/* ── Personal Notes ──────────────────────────────── */}
        {filteredFree.length > 0 && (
          <div>
            {(filteredVerse.length > 0 || query) && (
              <div className="flex items-center gap-3 mb-4">
                <span className="sefer-eyebrow">Personal Notes</span>
                <div style={{ flex: 1, height: 1, background: T.divider }} />
                <span className="text-xs font-medium" style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                  {filteredFree.length}
                </span>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredFree.map((note, i) => {
                const a = resolveAccent(note.color, i);
                const hasColor = !!note.color;
                return (
                  <div
                    key={note.id}
                    className="p-1.5 rounded-[1.375rem] cursor-pointer group transition-all duration-350"
                    style={{
                      height: 168,
                      background: hasColor ? a.bg : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${a.border}`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(0,0,0,0.04)`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 24px rgba(0,0,0,0.09)`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(0,0,0,0.04)`; }}
                    onClick={() => setEditing(note)}
                  >
                    <div
                      className="rounded-[calc(1.375rem-6px)] p-4"
                      style={{
                        height: '100%',
                        display: 'flex', flexDirection: 'column',
                        background: 'var(--glass-content-bg)',
                        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                        borderLeft: hasColor ? `3px solid ${a.swatch || a.dot}` : undefined,
                        boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.72), inset 0 0 0 1px rgba(255,255,255,0.06)`,
                        overflow: 'hidden',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-px" style={{ background: a.dot }} />
                          <span
                            className="text-sm font-bold leading-snug truncate"
                            style={{ color: a.dot, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif" }}
                          >
                            {note.heading || 'Untitled'}
                          </span>
                        </div>
                        <ThreeDotsMenu
                          id={note.id} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
                          onEdit={() => setEditing(note)}
                          onDelete={() => { deleteFreeNote(note.id); refresh(); }}
                          txtContent={[note.heading || 'Untitled', fmtDate(note.updatedAt || note.createdAt), '', note.body || ''].join('\n')}
                          txtName={`${slugify(note.heading)}.txt`}
                          docContent={buildWordHtml(note.heading || 'Untitled', fmtDate(note.updatedAt || note.createdAt), null, note.body)}
                          docName={`${slugify(note.heading)}.doc`}
                        />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        {note.body && (
                          <div
                            className="note-preview-html"
                            style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', lineHeight: 1.6, maxHeight: '4.8em', overflow: 'hidden' }}
                            dangerouslySetInnerHTML={{ __html: note.body }}
                          />
                        )}
                      </div>
                      <div style={{ borderTop: `1px solid ${a.border}`, margin: '8px 0 6px', flexShrink: 0 }} />
                      <p
                        className="text-[10px] font-medium"
                        style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em', flexShrink: 0 }}
                      >
                        {fmtDateShort(note.updatedAt || note.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Verse Notes ─────────────────────────────────── */}
        {filteredVerse.length > 0 && (
          <div>
            {filteredFree.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="sefer-eyebrow">Verse Notes</span>
                <div style={{ flex: 1, height: 1, background: T.divider }} />
                <span className="text-xs font-medium" style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                  {filteredVerse.length}
                </span>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredVerse.map((entry, i) => {
                const a = resolveAccent(entry.color, i + filteredFree.length);
                return (
                  <div
                    key={entry.verseId}
                    className="cursor-pointer group"
                    style={{
                      height: 168,
                      borderRadius: 20,
                      display: 'flex', flexDirection: 'column',
                      background: 'var(--glass-content-bg)',
                      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                      border: `1px solid ${a.border}`,
                      borderTop: `3px solid ${a.dot}`,
                      boxShadow: `0 4px 20px rgba(0,0,0,0.12), inset 0 1.5px 0 rgba(255,255,255,0.6)`,
                      overflow: 'hidden',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 36px rgba(0,0,0,0.18), inset 0 1.5px 0 rgba(255,255,255,0.6)`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.12), inset 0 1.5px 0 rgba(255,255,255,0.6)`; }}
                    onClick={() => setSelected(entry)}
                  >
                    {/* Coloured top band */}
                    <div style={{ background: a.bg.replace(/,\s*[\d.]+\)$/, ', 0.22)'), padding: '14px 16px 12px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                      {/* Decorative quote mark */}
                      <span style={{
                        position: 'absolute', top: -6, right: 10,
                        fontSize: 72, lineHeight: 1, fontFamily: 'Georgia, serif',
                        color: a.dot, opacity: 0.10, pointerEvents: 'none', userSelect: 'none',
                      }}>"</span>
                      <div className="flex items-start justify-between gap-2">
                        <span style={{
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: '1.15rem', fontWeight: 700, fontStyle: 'italic',
                          color: a.dot, lineHeight: 1.2, letterSpacing: '-0.01em',
                        }}>
                          {entry.verseRef}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {onReadInBible && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onReadInBible(entry.verseRef); }}
                              title="Open in Bible reader"
                              style={{
                                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 9999,
                                background: 'rgba(0,0,0,0.07)', border: 'none', cursor: 'pointer',
                                color: a.dot, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = a.light; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; }}
                            >
                              📖
                            </button>
                          )}
                        <ThreeDotsMenu
                          id={entry.verseId} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
                          onEdit={() => setSelected(entry)}
                          onDelete={() => { deleteVerseNote(entry.verseId); refresh(); }}
                          txtContent={[entry.verseRef, fmtDate(entry.lastUpdated), '', entry.verseText ? `"${entry.verseText}"` : '', '', entry.notes.map((n) => n.text).join('\n\n')].join('\n')}
                          txtName={`${slugify(entry.verseRef)}.txt`}
                          docContent={buildWordHtml(entry.verseRef, fmtDate(entry.lastUpdated), entry.verseText, entry.notes.map((n) => n.text).join('\n\n'))}
                          docName={`${slugify(entry.verseRef)}.doc`}
                        />
                        </div>
                      </div>
                      {entry.verseText && (
                        <p style={{
                          fontFamily: 'Lora, Georgia, serif',
                          fontSize: '0.75rem', lineHeight: 1.8, fontStyle: 'italic',
                          color: T.textSub, margin: '8px 0 0',
                          display: '-webkit-box', WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {entry.verseText}
                        </p>
                      )}
                    </div>

                    {/* Note preview */}
                    <div style={{ padding: '10px 16px 12px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {entry.notes[0]?.text ? (
                        <div
                          className="note-preview-html"
                          style={{ fontSize: '0.72rem', lineHeight: 1.65, color: T.textMuted, fontFamily: "'DM Sans', sans-serif", maxHeight: '3.2em', overflow: 'hidden', marginBottom: 8 }}
                          dangerouslySetInnerHTML={{ __html: entry.notes[0].text }}
                        />
                      ) : (
                        <p style={{ fontSize: '0.68rem', color: T.textMuted, fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic', marginBottom: 8, opacity: 0.7 }}>
                          No note text yet…
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '0.62rem', fontWeight: 500, color: T.textMuted, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em' }}>
                          {fmtDateShort(entry.lastUpdated)}
                        </span>
                        {entry.notes.length > 1 && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: a.light, color: a.dot, fontFamily: "'DM Sans', sans-serif" }}>
                            {entry.notes.length} notes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────────── */}
      {highlights.length > 0 && (
        <div
          className="shrink-0 self-stretch hidden md:block"
          style={{ width: 1, background: T.divider }}
        />
      )}

      {/* ── Highlights sidebar ───────────────────────────── */}
      {highlights.length > 0 && (
        <div className="shrink-0 hidden md:block" style={{ width: '22%' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="sefer-eyebrow">Highlights</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                minWidth: 20,
                textAlign: 'center',
              }}
            >
              {highlights.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {highlights.map((hl) => {
              const bgHex = HL_COLORS[hl.color] || '#fde68a';
              return (
                <div
                  key={hl.verseId}
                  className="rounded-xl p-3 relative group"
                  style={{
                    background: bgHex + 'cc',
                    border: `1px solid ${bgHex}`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 5px rgba(0,0,0,0.05)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span
                      className="text-xs font-bold leading-snug"
                      style={{ color: T.text, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif" }}
                    >
                      {hl.ref || hl.verseId}
                    </span>
                    <button
                      onClick={() => { removeHighlight(hl.verseId); refresh(); }}
                      className="shrink-0 text-xs w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: T.textMuted, background: 'rgba(0,0,0,0.08)' }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                  {(hl.text || hlTexts[hl.verseId]) ? (
                    <p
                      className="text-xs leading-relaxed italic line-clamp-3"
                      style={{ color: T.textSub, fontFamily: "Lora, Georgia, serif" }}
                    >
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
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-14"
          style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setVerseSelectOpen(false); setVerseInput(''); setVerseSelectError(''); } }}
        >
          <div className="glass-modal w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="sefer-eyebrow mb-1" style={{ display: 'block' }}>Add note</span>
                <h3
                  className="font-bold text-lg"
                  style={{ color: T.text, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif", marginTop: 4 }}
                >
                  Choose a Verse
                </h3>
              </div>
              <button
                onClick={() => { setVerseSelectOpen(false); setVerseInput(''); setVerseSelectError(''); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                style={{ color: T.textMuted, background: 'rgba(0,0,0,0.05)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.10)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
              >
                ✕
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
              Enter a Bible reference to attach your note to.
            </p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={verseInput}
                onChange={(e) => { setVerseInput(e.target.value); setVerseSelectError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerseSelect(); }}
                placeholder='e.g. John 3:16'
                className="glass-input flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              <button
                onClick={handleVerseSelect}
                disabled={!verseInput.trim() || verseSelectLoading}
                className="text-sm font-semibold px-4 py-2 rounded-xl transition-all shrink-0"
                style={{
                  background: verseInput.trim() && !verseSelectLoading ? 'var(--accent)' : 'rgba(0,0,0,0.08)',
                  color: verseInput.trim() && !verseSelectLoading ? '#fff' : T.textMuted,
                  cursor: verseInput.trim() && !verseSelectLoading ? 'pointer' : 'not-allowed',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {verseSelectLoading ? '…' : 'Go'}
              </button>
            </div>
            {verseSelectError && (
              <p className="text-xs mt-2 font-medium" style={{ color: '#b91c1c' }}>{verseSelectError}</p>
            )}
          </div>
        </div>
      )}

      {/* Modals — portalled to body to escape page-enter animation containing block */}
      {selected && createPortal(
        <NoteModal
          verseId={selected.verseId}
          verseRef={selected.verseRef}
          verseText={selected.verseText}
          onClose={() => { setSelected(null); refresh(); }}
        />,
        document.body
      )}
      {editing !== null && createPortal(
        <FreeNoteModal
          note={editing || null}
          onClose={() => { setEditing(null); refresh(); }}
        />,
        document.body
      )}
    </div>
  );
}
