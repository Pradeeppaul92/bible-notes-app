import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { parseReference, suggestReference } from '../utils/searchUtils';
import { getChapterContent } from '../utils/bibleApi';
import { getRhemaEntries, saveRhemaEntry, deleteRhemaEntry, getHighlightList, removeHighlight } from '../utils/storage';
import { RHEMA_PALETTES, RHEMA_SLOT_COUNT } from '../data/rhemaPalette';
import RichTextEditor from './RichTextEditor';

// ── Constants ─────────────────────────────────────────

const HL_COLORS = {
  yellow: '#fde68a', green: '#bbf7d0', blue: '#bfdbfe',
  pink: '#fecdd3', purple: '#e9d5ff', orange: '#fed7aa',
};

const TYPES = [
  { id: 'word',       label: 'Word',        icon: '✦' },
  { id: 'sermon',     label: 'Sermon',      icon: '🎙' },
  { id: 'prophecy',   label: 'Prophecy',    icon: '🌟' },
  { id: 'vision',     label: 'Vision',      icon: '👁' },
  { id: 'dream',      label: 'Dream',       icon: '🌙' },
];

const T = {
  text:        'var(--tile-text, #1a1007)',
  textSub:     'var(--tile-sub, #5c4030)',
  textMuted:   'var(--tile-muted, rgba(110,75,22,0.45))',
  accent:      'var(--accent, #a86e10)',
  accentLight: 'var(--accent-light, rgba(168,110,16,0.10))',
  accentBorder:'var(--glass-tile-bd, rgba(185,140,40,0.22))',
  divider:     'var(--tile-divider, rgba(185,140,40,0.12))',
};

// ── Abbreviation map (same as FreeNoteModal) ──────────

const ABBREVS = {
  'gen':'genesis','ex':'exodus','exo':'exodus','lev':'leviticus','num':'numbers',
  'deut':'deuteronomy','deu':'deuteronomy','josh':'joshua','jos':'joshua',
  'judg':'judges','jdg':'judges','judge':'judges',
  'ps':'psalms','psa':'psalms','psalm':'psalms',
  'prov':'proverbs','pro':'proverbs','prv':'proverbs','proverb':'proverbs',
  'ecc':'ecclesiastes','eccl':'ecclesiastes',
  'isa':'isaiah','jer':'jeremiah','lam':'lamentations',
  'ezek':'ezekiel','eze':'ezekiel','dan':'daniel',
  'hos':'hosea','mic':'micah','nah':'nahum','hab':'habakkuk',
  'zeph':'zephaniah','zep':'zephaniah','hag':'haggai',
  'zech':'zechariah','zec':'zechariah','mal':'malachi',
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
  // Samuel
  'sam':'1 samuel','1sam':'1 samuel','2sam':'2 samuel',
  '1sa':'1 samuel','2sa':'2 samuel',
  // Kings / Chronicles / additional
  '1kgs':'1 kings','2kgs':'2 kings','1ki':'1 kings','2ki':'2 kings',
  '1chr':'1 chronicles','2chr':'2 chronicles','1ch':'1 chronicles','2ch':'2 chronicles',
  'acts':'acts','act':'acts',
};

// ── Helpers ───────────────────────────────────────────

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slugify(str) {
  return (str || 'rhema').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').slice(0, 48);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
  // Compact format: "SAM316", "JN316", "ROM828" (no space/colon)
  // Handles optional leading digit: "1SAM316", "2SA316"
  const compact = lower.match(/^(\d?[a-z]+)(\d{2,6})$/);
  if (compact) {
    const [, bookPart, numPart] = compact;
    const fullBook = ABBREVS[bookPart] || bookPart;
    // Try all chapter/verse splits; prefer short chapters (e.g. 3:16 over 31:6)
    for (let chLen = 1; chLen <= numPart.length - 1; chLen++) {
      const chapter = numPart.slice(0, chLen);
      const verse = numPart.slice(chLen);
      if (parseInt(verse) < 1 || parseInt(chapter) < 1) continue;
      const parsed = parseReference(`${fullBook} ${chapter}:${verse}`);
      if (parsed?.verse) return parsed;
    }
  }
  return null;
}

function detectRefBeforeCursor(text, cursorPos) {
  if (!text || cursorPos == null) return null;
  const before = text.slice(0, cursorPos).trimEnd();
  if (before.length < 3) return null;
  const tail = before.slice(Math.max(0, before.length - 70));
  const starts = [0];
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] === ' ' || tail[i] === '\n') starts.push(i + 1);
  }
  for (let i = starts.length - 1; i >= 0; i--) {
    const candidate = tail.slice(starts[i]).trim();
    if (candidate.length < 3) continue;
    const parsed = tryParseRef(candidate);
    if (parsed?.verse) return { ...parsed, originalText: tail.slice(starts[i]).trimStart() };
  }
  return null;
}

function renderVerseText(text) {
  const parts = text.split(/(\[\d+\])/);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) return (
      <sup key={i} style={{ fontSize: '0.6em', fontWeight: 700, fontStyle: 'normal', color: 'var(--accent)', marginRight: 2, marginLeft: i > 0 ? 6 : 0, verticalAlign: 'super' }}>
        {m[1]}
      </sup>
    );
    return part;
  });
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

function buildDocHtml(entry) {
  const type = TYPES.find((t) => t.id === entry.type) || TYPES[0];
  const safeBody = stripHtml(entry.body || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>${entry.title || 'Rhema'}</title>
<style>
  body { font-family: 'Lora', Georgia, serif; margin: 72pt 80pt; color: #1a1007; }
  h1 { font-size: 18pt; color: #a86e10; margin-bottom: 2pt; }
  .meta { font-size: 9pt; color: #8a7060; margin-bottom: 14pt; }
  p { font-size: 12pt; line-height: 1.75; }
  hr { border: none; border-top: 1pt solid #e7d9c0; margin: 18pt 0 10pt; }
  .ft { font-size: 8pt; color: #b09070; }
</style></head>
<body>
  <h1>${entry.title || 'Untitled'}</h1>
  <div class="meta">${type.icon} ${type.label}${entry.source ? ` · ${entry.source}` : ''} · ${fmtDate(entry.createdAt)}</div>
  ${safeBody ? `<p>${safeBody.replace(/\n/g, '<br>')}</p>` : ''}
  <hr><p class="ft">Sefer · Rhema Journal</p>
</body></html>`;
}

// ── Three-dots menu ───────────────────────────────────

function ThreeDotsMenu({ id, menuOpen, setMenuOpen, onEdit, onDelete, entry }) {
  const btnRef     = useRef(null);
  const dropRef    = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pos, setPos] = useState(null);
  const isOpen = menuOpen === id;

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (!btnRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
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

  const item = (label, icon, onClick, danger = false) => (
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
    <div ref={dropRef} style={{
      position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999, width: 192,
      background: 'linear-gradient(160deg, rgba(52,46,42,0.97) 0%, rgba(30,24,20,0.99) 100%)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 4,
      boxShadow: '0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)',
    }} onClick={(e) => e.stopPropagation()}>
      {item('Edit', '✏️', () => { setMenuOpen(null); onEdit(); })}
      {!confirmDelete
        ? item('Delete', '🗑️', () => setConfirmDelete(true), true)
        : (
          <div className="px-3 py-2">
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>Delete this entry?</p>
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
      {item('Export as .doc', '📄', () => {
        setMenuOpen(null);
        saveFile(`${slugify(entry.title)}.doc`, buildDocHtml(entry), 'text/html');
      })}
      {item('Export as .txt', '📝', () => {
        setMenuOpen(null);
        const type = TYPES.find((t) => t.id === entry.type) || TYPES[0];
        const txt  = [
          entry.title || 'Untitled',
          `${type.label}${entry.source ? ` · ${entry.source}` : ''} · ${fmtDate(entry.createdAt)}`,
          '',
          stripHtml(entry.body || ''),
        ].join('\n');
        saveFile(`${slugify(entry.title)}.txt`, txt, 'text/plain');
      })}
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

// ── Rhema Modal ───────────────────────────────────────

const RHEMA_DRAFT_KEY = 'sefer_rhema_draft';

export function RhemaModal({ entry, palette, onClose, defaultType, defaultSource }) {
  // Restore autosave draft for new entries
  const savedDraft = !entry ? (() => { try { return JSON.parse(localStorage.getItem(RHEMA_DRAFT_KEY) || 'null'); } catch { return null; } })() : null;

  const [title,  setTitle]  = useState(entry?.title  || savedDraft?.title  || '');
  const [type,   setType]   = useState(entry?.type   || defaultType || savedDraft?.type || 'word');
  const [source, setSource] = useState(entry?.source || defaultSource || savedDraft?.source || '');
  const [body,   setBody]   = useState(entry?.body   || savedDraft?.body   || '');

  const [verseHint,       setVerseHint]       = useState(null);
  const [fuzzyHint,       setFuzzyHint]       = useState(null);
  const [versePreview,    setVersePreview]    = useState(null);
  const [loadingPreview,  setLoadingPreview]  = useState(false);
  const [showDelete,      setShowDelete]      = useState(false);
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
  const [isDirty,         setIsDirty]         = useState(false);

  const pal = palette;

  const hasContent = title.trim().length > 0 || body.trim().length > 0;

  // Prompt if: new entry with content, OR existing entry that has been touched
  const shouldProtect = entry ? isDirty : hasContent;

  function markDirty() { setIsDirty(true); }

  // Autosave draft to localStorage every 5 seconds while typing (new entries only)
  useEffect(() => {
    if (entry) return;
    if (!hasContent) { localStorage.removeItem(RHEMA_DRAFT_KEY); return; }
    const id = setInterval(() => {
      localStorage.setItem(RHEMA_DRAFT_KEY, JSON.stringify({ title, type, source, body }));
    }, 5000);
    return () => clearInterval(id);
  }, [title, type, source, body, hasContent, entry]);

  function attemptClose() {
    if (shouldProtect) {
      setShowLeavePrompt(true);
    } else {
      onClose();
    }
  }

  function saveAsDraft() {
    saveRhemaEntry({
      id:        `draft-${Date.now()}`,
      title:     title.trim() || 'Untitled draft',
      type,
      source:    source.trim(),
      body:      body.trim(),
      isDraft:   true,
      colorSlot: getRhemaEntries().length % RHEMA_SLOT_COUNT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    localStorage.removeItem(RHEMA_DRAFT_KEY);
    onClose();
  }

  function discard() {
    localStorage.removeItem(RHEMA_DRAFT_KEY);
    onClose();
  }

  useEffect(() => {
    if (!verseHint?.verse) { setVersePreview(null); return; }
    let cancelled = false;
    setVersePreview(null);
    setLoadingPreview(true);
    const { book, chapter, verse, verseEnd } = verseHint;
    const ref = verseEnd ? `${book.name} ${chapter}:${verse}-${verseEnd}` : `${book.name} ${chapter}:${verse}`;
    const chapterId = `${book.id}.${chapter}`;

    function extractVerses(chapterData, usedTranslation) {
      const verses = (chapterData.verses || []).filter((v) => v.verse >= verse && v.verse <= (verseEnd || verse));
      const text = verses.length > 1
        ? verses.map((v) => `[${v.verse}] ${v.text.trim()}`).join('  ')
        : verses[0]?.text?.trim() || '';
      if (text) setVersePreview({ ref, text, usedTranslation });
    }

    // Always load in NKJV; fall back to KJV (bundled) if unavailable
    getChapterContent(chapterId, 'nkjv')
      .then((data) => { if (!cancelled) extractVerses(data, 'nkjv'); })
      .catch(() => {
        if (cancelled) return;
        getChapterContent(chapterId, 'kjv')
          .then((data) => { if (!cancelled) extractVerses(data, 'kjv'); })
          .catch(() => {});
      })
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [verseHint?.book?.id, verseHint?.chapter, verseHint?.verse, verseHint?.verseEnd]);

  function handleCursorChange(textBefore) {
    const hint = detectRefBeforeCursor(textBefore, textBefore.length);
    if (hint) { setVerseHint(hint); setFuzzyHint(null); return; }
    const tail = textBefore.slice(Math.max(0, textBefore.length - 80));
    const refMatch = tail.match(/(\b[a-zA-Z]+\s+\d+:\d+(?:-\d+)?)\s*$/);
    if (refMatch) {
      const suggested = suggestReference(refMatch[1]);
      if (suggested && suggested.toLowerCase() !== refMatch[1].toLowerCase()) {
        const parsed = tryParseRef(suggested);
        if (parsed?.verse) { setFuzzyHint({ original: refMatch[1], suggested, parsed }); setVerseHint(null); return; }
      }
    }
    setVerseHint(null); setFuzzyHint(null);
  }

  function acceptFuzzy() {
    if (!fuzzyHint) return;
    const lastIdx = body.lastIndexOf(fuzzyHint.original);
    if (lastIdx >= 0) {
      setBody(body.slice(0, lastIdx) + fuzzyHint.suggested + body.slice(lastIdx + fuzzyHint.original.length));
    }
    setVerseHint({ ...fuzzyHint.parsed, originalText: fuzzyHint.suggested });
    setFuzzyHint(null);
  }

  function insertVerse() {
    if (!versePreview || !verseHint) return;
    const expanded = `${versePreview.ref} — "${versePreview.text}"`;
    const lastIdx = body.lastIndexOf(verseHint.originalText);
    if (lastIdx >= 0) {
      setBody(body.slice(0, lastIdx) + expanded + body.slice(lastIdx + verseHint.originalText.length));
    } else {
      setBody(body.replace(/<\/p>$/, '') + ' ' + expanded + '</p>');
    }
    setVerseHint(null); setVersePreview(null);
  }

  function handleSave() {
    if (!title.trim() && !body.trim()) return;
    saveRhemaEntry({
      id:        entry?.id || Date.now().toString(),
      title:     title.trim(),
      type,
      source:    source.trim(),
      body:      body.trim(),
      isDraft:   false,
      colorSlot: entry?.colorSlot ?? (getRhemaEntries().filter((e) => e.id !== entry?.id).length % RHEMA_SLOT_COUNT),
      createdAt: entry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    localStorage.removeItem(RHEMA_DRAFT_KEY);
    onClose();
  }

  function handleDelete() {
    if (entry?.id) deleteRhemaEntry(entry.id);
    onClose();
  }

  const canSave = title.trim().length > 0 || body.trim().length > 0;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-14"
      style={{ background: 'rgba(0,0,0,0.30)' }}
      onClick={(e) => { if (e.target === e.currentTarget) attemptClose(); }}>
      <div className="glass-modal w-full max-w-2xl flex flex-col" style={{
        maxHeight: '90vh',
        position: 'relative',
        borderColor: pal?.border || undefined,
        transition: 'border-color 0.3s',
      }}>

        {/* Color accent bar */}
        <div style={{
          height: 4,
          borderRadius: '1.5rem 1.5rem 0 0',
          background: pal?.dot || 'var(--accent)',
          transition: 'background 0.3s',
        }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4"
          style={{ borderBottom: `1px solid ${pal?.border || 'var(--tile-divider)'}` }}>
          <div>
            <h2 className="font-bold text-lg"
              style={{ color: pal?.dot || 'var(--tile-text)', fontFamily: "Lora, Georgia, serif" }}>
              {entry?.isDraft ? 'Edit Draft' : entry ? 'Edit Rhema' : 'New Rhema'}
            </h2>
            {savedDraft && !entry && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--tile-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                ✦ Draft restored
              </p>
            )}
          </div>
          <button onClick={attemptClose} className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: 'var(--tile-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty(); }}
            placeholder="Title…"
            spellCheck={true}
            className="w-full rounded-xl px-4 py-3 text-base font-semibold glass-input"
            style={{ fontFamily: "Lora, Georgia, serif", borderColor: pal?.border || undefined }}
          />

          {/* Type selector + Source */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setType(t.id); markDirty(); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    background: type === t.id ? (pal?.dot || 'var(--accent)') : 'rgba(0,0,0,0.06)',
                    color:      type === t.id ? '#fff' : T.textMuted,
                    border:     `1px solid ${type === t.id ? (pal?.border || 'var(--accent)') : 'transparent'}`,
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={source}
              onChange={(e) => { setSource(e.target.value); markDirty(); }}
              placeholder="Source (optional – who, where…)"
              className="flex-1 min-w-[180px] rounded-xl px-3 py-2 text-sm glass-input"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>

          {/* Body editor */}
          <RichTextEditor
            content={body}
            onChange={(val) => { setBody(val); markDirty(); }}
            onCursorChange={handleCursorChange}
            placeholder="Write what the Lord said…"
            minHeight={220}
            accentColor={pal?.dot}
          />

          {/* Verse hint / fuzzy hint */}
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
                    <button onClick={() => setFuzzyHint(null)} style={{ color: 'rgba(255,255,255,0.75)' }}>✕</button>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-end gap-3"
                    style={{ background: 'var(--glass-content-bg)', borderTop: '1px solid var(--glass-content-bd)' }}>
                    <span className="text-xs" style={{ color: 'var(--tile-muted)' }}>Correct "{fuzzyHint.original}" and load verse</span>
                    <button onClick={acceptFuzzy}
                      className="text-xs font-semibold px-4 py-1.5 rounded-lg"
                      style={{ background: pal?.dot || 'var(--accent)', color: '#fff' }}>
                      Yes, use this
                    </button>
                  </div>
                </div>
              )}

              {verseHint && (
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--glass-content-bd)', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: pal?.dot || 'var(--accent)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14 }}>📖</span>
                      <span className="text-sm font-bold" style={{ color: '#fff', fontFamily: "Lora, Georgia, serif" }}>
                        {verseHint.book.name} {verseHint.chapter}:{verseHint.verse}
                      </span>
                      {versePreview?.usedTranslation && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {versePreview.usedTranslation}
                        </span>
                      )}
                    </div>
                    <button onClick={() => { setVerseHint(null); setVersePreview(null); }}
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
                        className="text-xs font-semibold px-4 py-1.5 rounded-lg"
                        style={{ background: pal?.dot || 'var(--accent)', color: '#fff' }}>
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
        <div className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${pal?.border || 'var(--tile-divider)'}` }}>
          {entry && !showDelete ? (
            <button onClick={() => setShowDelete(true)}
              className="text-sm px-4 py-2 rounded-xl transition-all hover:opacity-80 shrink-0"
              style={{ color: '#b91c1c', background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.15)' }}>
              Delete
            </button>
          ) : entry && showDelete ? (
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

          <div className="flex gap-2 ml-auto shrink-0">
            <button onClick={attemptClose}
              className="text-sm px-4 py-2 rounded-xl transition-all"
              style={{ color: 'var(--tile-sub)', background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)' }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="text-sm px-5 py-2 rounded-xl font-semibold transition-all"
              style={{
                background: canSave ? (pal?.dot || 'var(--accent)') : 'rgba(0,0,0,0.12)',
                color: canSave ? '#fff' : 'rgba(0,0,0,0.35)',
                cursor: canSave ? 'pointer' : 'not-allowed',
              }}>
              Save
            </button>
          </div>
        </div>

      </div>
    </div>

    {/* Leave / draft prompt — separate portal so z-index is never clipped */}
    {showLeavePrompt && createPortal(
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
        <div className="rounded-2xl p-6 text-center mx-6" style={{
          background: 'var(--glass-content-bg)',
          border: '1px solid var(--glass-content-bd)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          maxWidth: 360,
        }}>
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--tile-text)', fontFamily: "Lora, Georgia, serif" }}>
            Save your work?
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--tile-muted)', fontFamily: "'DM Sans', sans-serif" }}>
            {entry ? 'You have unsaved changes.' : 'You have unsaved content. Save it as a draft to come back to it later.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={discard}
              className="text-sm px-4 py-2 rounded-xl transition-all hover:opacity-80"
              style={{ color: '#b91c1c', background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.18)', fontFamily: "'DM Sans', sans-serif" }}>
              Discard
            </button>
            <button onClick={() => setShowLeavePrompt(false)}
              className="text-sm px-4 py-2 rounded-xl transition-all hover:opacity-80"
              style={{ color: 'var(--tile-sub)', background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)', fontFamily: "'DM Sans', sans-serif" }}>
              Keep editing
            </button>
            {entry ? (
              <button onClick={() => { setShowLeavePrompt(false); handleSave(); }}
                className="text-sm px-5 py-2 rounded-xl font-semibold transition-all hover:opacity-90"
                style={{ background: pal?.dot || 'var(--accent)', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
                Save
              </button>
            ) : (
              <button onClick={saveAsDraft}
                className="text-sm px-5 py-2 rounded-xl font-semibold transition-all hover:opacity-90"
                style={{ background: pal?.dot || 'var(--accent)', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
                Save as draft
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

// ── Rhema Card ────────────────────────────────────────

function RhemaCard({ entry, pal, onEdit, menuOpen, setMenuOpen }) {
  const typeObj = TYPES.find((t) => t.id === entry.type) || TYPES[0];
  const bodyText = stripHtml(entry.body || '');

  return (
    <div
      className="cursor-pointer group"
      style={{
        height: 230,
        borderRadius: 20,
        display: 'flex', flexDirection: 'column',
        background: 'var(--glass-content-bg)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${pal.border}`,
        borderLeft: `3.5px solid ${pal.dot}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.10), inset 0 1.5px 0 rgba(255,255,255,0.72)`,
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 36px rgba(0,0,0,0.16), inset 0 1.5px 0 rgba(255,255,255,0.72)`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.10), inset 0 1.5px 0 rgba(255,255,255,0.72)`; }}
      onClick={onEdit}
    >
      {/* Header band — dark solid accent */}
      <div style={{
        background: `linear-gradient(135deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.10) 100%), ${pal.dot}`,
        padding: '14px 16px 12px 18px',
        borderBottom: `1px solid ${pal.border}`,
        flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative: large rising orb bottom-left */}
        <div style={{
          position: 'absolute', bottom: -30, left: -20,
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
          border: '1.5px solid rgba(255,255,255,0.20)',
          pointerEvents: 'none',
        }} />
        {/* Decorative: medium orb top-left */}
        <div style={{
          position: 'absolute', top: -18, left: 48,
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          pointerEvents: 'none',
        }} />
        {/* Decorative: small ring bottom-center */}
        <div style={{
          position: 'absolute', bottom: 6, left: '35%',
          width: 20, height: 20, borderRadius: '50%',
          background: 'transparent',
          border: '1.5px solid rgba(255,255,255,0.20)',
          pointerEvents: 'none',
        }} />
        {/* Decorative: tiny solid dot */}
        <div style={{
          position: 'absolute', bottom: 12, left: '50%',
          width: 5, height: 5, borderRadius: '50%',
          background: 'rgba(255,255,255,0.28)',
          pointerEvents: 'none',
        }} />
        {/* Decorative: radial glow behind star */}
        <div style={{
          position: 'absolute', top: -6, right: -6,
          width: 70, height: 70, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,220,80,0.22) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        {/* Star icon */}
        <span style={{
          position: 'absolute', top: 6, right: 10,
          fontSize: 34, lineHeight: 1,
          opacity: 0.55,
          pointerEvents: 'none', userSelect: 'none',
          filter: 'sepia(0.5) saturate(1.6) brightness(1.15) drop-shadow(0 2px 5px rgba(180,130,0,0.4))',
        }}>{typeObj.icon}</span>

        {/* Top row: badge + source + three-dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.09em',
              textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif",
              color: pal.dot,
              background: 'rgba(255,255,255,0.90)',
              border: 'none',
              padding: '2px 8px', borderRadius: 9999,
              flexShrink: 0,
            }}>
              {typeObj.icon} {typeObj.label}
            </span>
            {entry.isDraft && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.11em',
                textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif",
                color: '#fff',
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '2px 7px', borderRadius: 9999,
                flexShrink: 0,
              }}>
                ✏ Draft
              </span>
            )}
            {entry.source && (
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.65)',
                fontFamily: "'DM Sans', sans-serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {entry.source}
              </span>
            )}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.70)', flexShrink: 0 }}>
            <ThreeDotsMenu
              id={entry.id} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
              onEdit={onEdit}
              onDelete={() => { deleteRhemaEntry(entry.id); }}
              entry={entry}
            />
          </div>
        </div>

        {/* Title — light on dark */}
        <div style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.3,
          color: 'rgba(255,255,255,0.95)',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {entry.title || 'Untitled'}
        </div>
      </div>

      {/* Body preview */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '14px 18px 16px',
        overflow: 'hidden',
      }}>
        {bodyText ? (
          <p style={{
            fontSize: '0.74rem', lineHeight: 1.7,
            color: 'var(--tile-sub)',
            fontFamily: "'DM Sans', sans-serif",
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {bodyText}
          </p>
        ) : (
          <p style={{ fontSize: '0.69rem', color: 'var(--tile-muted)', fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif" }}>
            No content yet…
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <p style={{
            fontSize: '0.61rem', fontWeight: 600,
            color: 'var(--tile-muted)', fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.03em', textTransform: 'uppercase',
          }}>
            {fmtDateShort(entry.updatedAt || entry.createdAt)}
          </p>
          {/* Small dot accent */}
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: pal.dot, opacity: 0.5, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────

export default function RhemaPage({ themeId }) {
  const [entries,         setEntries]         = useState([]);
  const [editing,         setEditing]         = useState(null);
  const [query,           setQuery]           = useState('');
  const [menuOpen,        setMenuOpen]        = useState(null);
  const [typeFilter,      setTypeFilter]      = useState('all');
  const [highlights,      setHighlights]      = useState(() => getHighlightList());
  const [hlTexts,         setHlTexts]         = useState({});
  const [activeHighlight, setActiveHighlight] = useState(null);

  const palette = RHEMA_PALETTES[themeId] || RHEMA_PALETTES['shiloh'];

  function refresh() {
    setEntries(getRhemaEntries());
    setHighlights(getHighlightList());
  }
  useEffect(() => { refresh(); }, []);

  // Fetch verse text for highlights that only have a ref but no cached text
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

  const filtered = useMemo(() => {
    let list = entries;
    if (typeFilter !== 'all') list = list.filter((e) => e.type === typeFilter);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) =>
      e.title?.toLowerCase().includes(q) ||
      e.source?.toLowerCase().includes(q) ||
      stripHtml(e.body || '').toLowerCase().includes(q)
    );
  }, [entries, query, typeFilter]);

  // Pick palette slot for new entry based on current count
  function getNewPalette() {
    return palette[entries.length % RHEMA_SLOT_COUNT];
  }

  function getPalette(entry) {
    return palette[entry.colorSlot % RHEMA_SLOT_COUNT] || palette[0];
  }

  return (
    <div className="flex items-start">
    {/* ── Left: main Rhema content ───────────────────────── */}
    <div className="flex-1 min-w-0" style={{ paddingRight: '1.5rem' }}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '2.1rem', fontWeight: 700, letterSpacing: '-0.03em',
            color: 'var(--page-text)', margin: 0, lineHeight: 1,
          }}>
            Rhema
          </h2>
          {entries.length > 0 && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--page-sub)', fontFamily: "'DM Sans', sans-serif" }}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>

        <button
          onClick={() => setEditing(false)}
          className="group flex items-center gap-2 text-sm font-semibold text-white rounded-full transition-all duration-300 active:scale-[0.97] flex-shrink-0 mt-1"
          style={{
            background: 'linear-gradient(135deg, var(--accent, #a86e10), #c4911a)',
            padding: '0.55rem 0.75rem 0.55rem 1.1rem',
            boxShadow: '0 3px 12px rgba(168,110,16,0.28)',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(168,110,16,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(168,110,16,0.28)'; e.currentTarget.style.transform = ''; }}
        >
          <span>+ New Tablet</span>
          <span
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 group-hover:translate-x-0.5"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <svg width="15" height="18" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="stoneGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6b7280"/>
                  <stop offset="60%" stopColor="#374151"/>
                  <stop offset="100%" stopColor="#1f2937"/>
                </linearGradient>
              </defs>
              {/* Drop shadow */}
              <path d="M2.5 8.5V15C2.5 15.3 2.7 15.5 3 15.5H12.5C12.8 15.5 13 15.3 13 15V8.5H2.5Z" fill="#111827" opacity="0.5" transform="translate(0.5,0.8)"/>
              <path d="M2.5 8.5C2.5 4.5 7.5 1.5 7.5 1.5C7.5 1.5 13 4.5 13 8.5H2.5Z" fill="#111827" opacity="0.5" transform="translate(0.5,0.8)"/>
              {/* Main tablet body */}
              <path d="M1.5 7.5V14C1.5 14.8 2.2 15.5 3 15.5H12C12.8 15.5 13.5 14.8 13.5 14V7.5H1.5Z" fill="url(#stoneGrad)" stroke="#1f2937" strokeWidth="0.5"/>
              {/* Arched top */}
              <path d="M1.5 7.5C1.5 7.5 1.5 1.5 7.5 1.5C13.5 1.5 13.5 7.5 13.5 7.5H1.5Z" fill="url(#stoneGrad)" stroke="#1f2937" strokeWidth="0.5"/>
              {/* Light edge highlight (top-left) */}
              <path d="M2 7C2 7 2.2 3 7.5 2.2" stroke="#9ca3af" strokeWidth="0.7" strokeLinecap="round" fill="none"/>
              <line x1="2" y1="7.5" x2="2" y2="13" stroke="#9ca3af" strokeWidth="0.7" strokeLinecap="round"/>
              {/* Engraved text lines */}
              <line x1="3.5" y1="9.5" x2="11.5" y2="9.5" stroke="rgba(209,213,219,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
              <line x1="3.5" y1="11.5" x2="11.5" y2="11.5" stroke="rgba(209,213,219,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
              <line x1="3.5" y1="13.5" x2="8.5" y2="13.5" stroke="rgba(209,213,219,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
            </svg>
          </span>
        </button>
      </div>

      {/* Search + type filter */}
      {entries.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 p-1 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <div className="flex items-center gap-2 rounded-[calc(1rem-4px)] px-3 py-2"
              style={{ background: 'var(--input-bg, rgba(255,253,242,1))', border: '1px solid var(--input-bd, rgba(185,140,40,0.18))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.textMuted, flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Rhema entries…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", color: T.text, caretColor: 'var(--accent)' }}
              />
              {query && (
                <button onClick={() => setQuery('')}
                  className="text-base leading-none w-5 h-5 flex items-center justify-center rounded-full"
                  style={{ color: T.textMuted, background: 'rgba(0,0,0,0.06)' }}>×</button>
              )}
            </div>
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTypeFilter('all')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                background: typeFilter === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                color: typeFilter === 'all' ? '#fff' : 'var(--page-sub)',
                border: typeFilter === 'all' ? 'none' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              All
            </button>
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(typeFilter === t.id ? 'all' : t.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  background: typeFilter === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                  color: typeFilter === t.id ? '#fff' : 'var(--page-sub)',
                  border: typeFilter === t.id ? 'none' : '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="p-1.5 rounded-[1.625rem]"
          style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="glass-card rounded-[calc(1.625rem-6px)] text-center py-24 px-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
              style={{ background: T.accentLight, border: `1px solid ${T.accentBorder}`, fontSize: '2rem' }}>
              ✦
            </div>
            <h3 className="text-xl font-bold mb-2"
              style={{ color: T.text, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif" }}>
              No Rhema words yet
            </h3>
            <p className="text-sm mb-8 max-w-xs mx-auto leading-relaxed"
              style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
              Record direct words from God — sermons, prophecies, visions, dreams, and personal impressions.
            </p>
            <button
              onClick={() => setEditing(false)}
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
              Record your first tablet
              <span className="flex items-center justify-center w-7 h-7 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <svg width="15" height="18" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="stoneGrad2" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#6b7280"/>
                        <stop offset="60%" stopColor="#374151"/>
                        <stop offset="100%" stopColor="#1f2937"/>
                      </linearGradient>
                    </defs>
                    <path d="M2.5 8.5V15C2.5 15.3 2.7 15.5 3 15.5H12.5C12.8 15.5 13 15.3 13 15V8.5H2.5Z" fill="#111827" opacity="0.5" transform="translate(0.5,0.8)"/>
                    <path d="M2.5 8.5C2.5 4.5 7.5 1.5 7.5 1.5C7.5 1.5 13 4.5 13 8.5H2.5Z" fill="#111827" opacity="0.5" transform="translate(0.5,0.8)"/>
                    <path d="M1.5 7.5V14C1.5 14.8 2.2 15.5 3 15.5H12C12.8 15.5 13.5 14.8 13.5 14V7.5H1.5Z" fill="url(#stoneGrad2)" stroke="#1f2937" strokeWidth="0.5"/>
                    <path d="M1.5 7.5C1.5 7.5 1.5 1.5 7.5 1.5C13.5 1.5 13.5 7.5 13.5 7.5H1.5Z" fill="url(#stoneGrad2)" stroke="#1f2937" strokeWidth="0.5"/>
                    <path d="M2 7C2 7 2.2 3 7.5 2.2" stroke="#9ca3af" strokeWidth="0.7" strokeLinecap="round" fill="none"/>
                    <line x1="2" y1="7.5" x2="2" y2="13" stroke="#9ca3af" strokeWidth="0.7" strokeLinecap="round"/>
                    <line x1="3.5" y1="9.5" x2="11.5" y2="9.5" stroke="rgba(209,213,219,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                    <line x1="3.5" y1="11.5" x2="11.5" y2="11.5" stroke="rgba(209,213,219,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                    <line x1="3.5" y1="13.5" x2="8.5" y2="13.5" stroke="rgba(209,213,219,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                  </svg>
                </span>
            </button>
          </div>
        </div>
      )}

      {/* No search results */}
      {entries.length > 0 && filtered.length === 0 && (
        <div className="glass-card rounded-2xl text-center py-14 px-6">
          <p className="text-sm" style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
            No entries match <span style={{ color: T.text, fontWeight: 600 }}>"{query}"</span>
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <RhemaCard
              key={entry.id}
              entry={entry}
              pal={getPalette(entry)}
              onEdit={() => setEditing(entry)}
              menuOpen={menuOpen}
              setMenuOpen={(id) => {
                setMenuOpen(id);
                if (!id) refresh(); // refresh after menu closes (could be after delete)
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {editing !== null && createPortal(
        <RhemaModal
          entry={editing || null}
          palette={editing ? getPalette(editing) : getNewPalette()}
          onClose={() => { setEditing(null); refresh(); }}
        />,
        document.body
      )}
    </div>{/* end left column */}

    {/* ── Right: Highlights sidebar ──────────────────────── */}
    <>
      <div className="shrink-0 self-stretch" style={{ width: 1, background: 'var(--tile-divider, rgba(185,140,40,0.12))' }} />
      <div className="shrink-0 flex flex-col gap-3" style={{ width: 220 }}>
        <div className="flex items-center gap-2">
          <span className="sefer-eyebrow">Highlights</span>
          {highlights.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent)', color: '#fff', fontFamily: "'DM Sans', sans-serif", minWidth: 20, textAlign: 'center' }}>
              {highlights.length}
            </span>
          )}
        </div>
        {highlights.length === 0 ? (
          <div className="rounded-xl p-4 text-center"
            style={{ border: '1px dashed var(--tile-divider, rgba(185,140,40,0.22))', background: 'rgba(0,0,0,0.02)' }}>
            <p className="text-xs leading-relaxed" style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
              Highlighted verses will appear here.
            </p>
          </div>
        ) : highlights.map((hl) => {
          const bgHex = HL_COLORS[hl.color] || '#fde68a';
          const verseText = hl.text || hlTexts[hl.verseId];
          return (
            <div key={hl.verseId} className="rounded-xl p-3 relative group cursor-pointer"
              onClick={() => setActiveHighlight({ ...hl, resolvedText: verseText })}
              style={{
                background: bgHex + 'cc',
                border: `1px solid ${bgHex}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 5px rgba(0,0,0,0.05)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 12px rgba(0,0,0,0.12)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 5px rgba(0,0,0,0.05)'; }}
            >
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold leading-snug"
                  style={{ color: T.text, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif" }}>
                  {hl.ref || hl.verseId}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeHighlight(hl.verseId); refresh(); }}
                  className="shrink-0 text-xs w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: T.textMuted, background: 'rgba(0,0,0,0.08)' }}
                  title="Remove">×</button>
              </div>
              {verseText ? (
                <p className="text-xs leading-relaxed italic line-clamp-3"
                  style={{ color: T.textSub, fontFamily: "Lora, Georgia, serif" }}>
                  "{verseText}"
                </p>
              ) : (
                <p className="text-xs italic" style={{ color: T.textMuted }}>Loading…</p>
              )}
              {/* Expand hint */}
              <p className="text-xs mt-1.5 opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                Click to read full verse
              </p>
            </div>
          );
        })}
      </div>
    </>

    {/* ── Highlight detail modal ─────────────────────────── */}
    {activeHighlight && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.35)' }}
        onClick={() => setActiveHighlight(null)}>
        <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--glass-content-bg)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--glass-content-bd)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          }}
          onClick={(e) => e.stopPropagation()}>
          {/* Colour bar */}
          <div style={{ height: 5, background: HL_COLORS[activeHighlight.color] || '#fde68a' }} />
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--tile-divider)' }}>
            <span className="font-bold text-base"
              style={{ color: T.text, fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif", fontSize: '1.15rem' }}>
              {activeHighlight.ref || activeHighlight.verseId}
            </span>
            <button onClick={() => setActiveHighlight(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-sm transition hover:opacity-60"
              style={{ color: T.textMuted, background: 'rgba(0,0,0,0.06)' }}>✕</button>
          </div>
          {/* Body */}
          <div className="px-6 py-6">
            {activeHighlight.resolvedText ? (
              <p className="leading-loose italic"
                style={{ color: T.textSub, fontFamily: "Lora, Georgia, serif", fontSize: '1rem' }}>
                "{activeHighlight.resolvedText}"
              </p>
            ) : (
              <p className="text-sm italic" style={{ color: T.textMuted }}>Loading verse…</p>
            )}
          </div>
          {/* Footer */}
          <div className="px-6 pb-5 flex justify-end">
            <button
              onClick={() => { removeHighlight(activeHighlight.verseId); refresh(); setActiveHighlight(null); }}
              className="text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80"
              style={{ color: '#b91c1c', background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.15)', fontFamily: "'DM Sans', sans-serif" }}>
              Remove highlight
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </div>
  );
}
