import { useState, useEffect, useRef, useCallback } from 'react';
import { getPrayerBlocks, savePrayerBlock, deletePrayerBlock,
         getProclamations, saveProclamation, deleteProclamation } from '../utils/storage';
import { parseReference } from '../utils/searchUtils';

// ── colour tokens ──────────────────────────────────────
const T = {
  text:    'var(--tile-text, #1a1007)',
  sub:     'var(--tile-sub, #5c4030)',
  muted:   'var(--tile-muted, #8a7060)',
  accent:  'var(--accent, #6d28d9)',
  divider: 'var(--tile-divider, rgba(160,120,50,0.15))',
};

const FONT_COLORS = [
  { label: 'Default', value: 'inherit' },
  { label: 'Purple',  value: '#6d28d9' },
  { label: 'Blue',    value: '#1d4ed8' },
  { label: 'Red',     value: '#b91c1c' },
  { label: 'Green',   value: '#065f46' },
  { label: 'Gold',    value: '#92400e' },
  { label: 'Gray',    value: '#4b5563' },
];

// ── Toolbar button ─────────────────────────────────────
function TBtn({ title, active, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="flex items-center justify-center rounded transition-all"
      style={{
        width: 28, height: 28,
        background: active ? 'rgba(109,40,217,0.18)' : 'transparent',
        border: active ? '1px solid rgba(109,40,217,0.38)' : '1px solid transparent',
        color: active ? '#6d28d9' : T.sub,
        fontSize: 13, fontWeight: 700,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(109,40,217,0.07)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ── Rich text editor block ─────────────────────────────
function PrayerEditor({ block, onSave, onCancel }) {
  const editorRef = useRef(null);
  const [title, setTitle] = useState(block?.title || '');
  const [activeColor, setActiveColor] = useState('inherit');

  useEffect(() => {
    if (editorRef.current && block?.html) {
      editorRef.current.innerHTML = block.html;
    }
  }, []);

  const exec = useCallback((cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }, []);

  function queryActive(cmd) {
    try { return document.queryCommandState(cmd); } catch { return false; }
  }

  function handleSave() {
    const html = editorRef.current?.innerHTML || '';
    if (!title.trim() && !html.trim()) return;
    onSave({
      id: block?.id || Date.now().toString(),
      title: title.trim() || 'Prayer',
      html,
      updatedAt: new Date().toISOString(),
    });
  }

  function applyColor(color) {
    setActiveColor(color);
    exec('foreColor', color === 'inherit' ? '#1a1007' : color);
  }

  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate((n) => n + 1);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--glass-card-bg)', border: `1px solid rgba(109,40,217,0.2)`, boxShadow: '0 8px 32px rgba(80,30,0,0.10)' }}>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${T.divider}` }}>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Prayer title..."
          className="w-full bg-transparent text-base font-bold outline-none"
          style={{ color: T.text, fontFamily: 'Georgia, serif' }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1 px-3 py-2"
        style={{ borderBottom: `1px solid ${T.divider}`, background: 'var(--glass-content-bg)' }}>
        <TBtn title="Bold" active={queryActive('bold')} onClick={() => { exec('bold'); refresh(); }}><strong>B</strong></TBtn>
        <TBtn title="Italic" active={queryActive('italic')} onClick={() => { exec('italic'); refresh(); }}><em>I</em></TBtn>
        <TBtn title="Underline" active={queryActive('underline')} onClick={() => { exec('underline'); refresh(); }}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </TBtn>
        <div style={{ width: 1, height: 18, background: T.divider, margin: '0 4px' }} />
        <TBtn title="Bullet list" active={queryActive('insertUnorderedList')} onClick={() => { exec('insertUnorderedList'); refresh(); }}>≡</TBtn>
        <TBtn title="Numbered list" active={queryActive('insertOrderedList')} onClick={() => { exec('insertOrderedList'); refresh(); }}>#</TBtn>
        <div style={{ width: 1, height: 18, background: T.divider, margin: '0 4px' }} />
        {FONT_COLORS.map((fc) => (
          <button key={fc.value} type="button" title={fc.label}
            onMouseDown={(e) => { e.preventDefault(); applyColor(fc.value); }}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: fc.value === 'inherit' ? 'linear-gradient(135deg,#1a1007,#6d28d9)' : fc.value,
              border: activeColor === fc.value ? '2.5px solid #1a1007' : '2px solid rgba(0,0,0,0.12)',
              cursor: 'pointer', flexShrink: 0, transition: 'transform 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
        ))}
        <div style={{ width: 1, height: 18, background: T.divider, margin: '0 4px' }} />
        <TBtn title="Remove formatting" active={false} onClick={() => exec('removeFormat')}>✕<sub style={{ fontSize: 8 }}>fmt</sub></TBtn>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        className="px-5 py-4 outline-none min-h-[120px] text-sm leading-relaxed"
        style={{ color: T.text, fontFamily: 'Georgia, serif', lineHeight: 1.8 }}
        onInput={refresh}
        onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); exec('insertHTML', '&emsp;'); } }}
        data-placeholder="Write your prayer points here..."
      />
      <div className="flex justify-between items-center px-4 py-3"
        style={{ borderTop: `1px solid ${T.divider}`, background: 'var(--glass-content-bg)' }}>
        <span className="text-xs" style={{ color: T.muted }}>Cmd+S to save</span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="text-sm px-4 py-1.5 rounded-xl transition-all"
            style={{ color: T.muted, background: 'var(--glass-tile-bg)', border: `1px solid ${T.divider}` }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            className="text-sm font-semibold px-5 py-1.5 rounded-xl text-white transition-all"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rendered prayer block card ─────────────────────────
function PrayerCard({ block, onEdit, onDelete }) {
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return (
    <div className="rounded-2xl overflow-hidden group"
      style={{ background: 'var(--glass-card-bg)', border: `1px solid var(--glass-card-bd)`, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${T.divider}`, background: 'var(--glass-content-bg)' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>🙏</span>
          <h3 className="font-bold text-sm" style={{ color: T.accent, fontFamily: 'Georgia, serif' }}>{block.title}</h3>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onEdit} className="text-xs px-2.5 py-1 rounded-lg transition"
            style={{ color: T.accent, background: 'rgba(109,40,217,0.07)', border: '1px solid rgba(109,40,217,0.15)' }}>
            Edit
          </button>
          <button onClick={onDelete} className="text-xs px-2.5 py-1 rounded-lg transition"
            style={{ color: '#b91c1c', background: 'rgba(185,28,28,0.06)', border: '1px solid rgba(185,28,28,0.15)' }}>
            Delete
          </button>
        </div>
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed prose-sm"
        style={{ color: T.text, fontFamily: 'Georgia, serif', lineHeight: 1.85, maxHeight: 240, overflowY: 'auto' }}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
      <div className="px-5 py-2 flex justify-end" style={{ borderTop: `1px solid ${T.divider}` }}>
        <span className="text-xs" style={{ color: T.muted }}>{formatDate(block.updatedAt)}</span>
      </div>
    </div>
  );
}

// ── Proclamations panel ────────────────────────────────
const ABBREVS = {
  'gen':'genesis','ex':'exodus','exo':'exodus','lev':'leviticus','num':'numbers',
  'deut':'deuteronomy','josh':'joshua','judg':'judges','judge':'judges',
  'ps':'psalms','psa':'psalms','psalm':'psalms',
  'prov':'proverbs','pro':'proverbs','proverb':'proverbs','isa':'isaiah','jer':'jeremiah','eze':'ezekiel',
  'ezek':'ezekiel','dan':'daniel','mal':'malachi','matt':'matthew','mat':'matthew',
  'mt':'matthew','mk':'mark','lk':'luke','jn':'john','joh':'john','rom':'romans',
  '1cor':'1 corinthians','2cor':'2 corinthians','1co':'1 corinthians','2co':'2 corinthians',
  'gal':'galatians','eph':'ephesians','phil':'philippians','php':'philippians',
  'col':'colossians','heb':'hebrews','jas':'james','rev':'revelation',
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

// Render text with [n] markers as styled verse-number superscripts
function renderVerseText(text) {
  if (!text) return null;
  const parts = text.split(/(\[\d+\])/);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      return (
        <sup key={i} style={{
          fontSize: '0.6em', fontWeight: 700, fontStyle: 'normal',
          color: T.accent, marginRight: 2, marginLeft: i > 0 ? 5 : 0,
          verticalAlign: 'super',
        }}>{m[1]}</sup>
      );
    }
    return part;
  });
}

function ProclamationsPanel({ proclamations, onRefresh }) {
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleAdd() {
    const parsed = tryParseRef(input.trim());
    if (!parsed?.verse) { setError('Could not recognise that reference. Try "John 3:16" or "Psalm 23:1-6".'); return; }
    setError('');
    setLoading(true);
    const { book, chapter, verse, verseEnd } = parsed;
    const rangeStr = verseEnd ? `${verse}-${verseEnd}` : `${verse}`;
    const ref = verseEnd ? `${book.name} ${chapter}:${verse}-${verseEnd}` : `${book.name} ${chapter}:${verse}`;
    try {
      const res  = await fetch(`https://bible-api.com/${encodeURIComponent(book.name)}+${chapter}:${rangeStr}?translation=kjv`);
      const data = await res.json();
      const verses = data.verses || [];
      const text = verses.length > 1
        ? verses.map((v) => `[${v.verse}] ${v.text.trim()}`).join('  ')
        : verses[0]?.text?.trim() || '';
      saveProclamation({ id: Date.now().toString(), ref, text });
      onRefresh();
      setInput('');
    } catch {
      setError('Could not fetch verse. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-4">
        <span style={{ fontSize: 16 }}>✦</span>
        <h3 className="font-bold text-base" style={{ color: T.text, fontFamily: 'Georgia, serif' }}>
          Daily Proclamations
        </h3>
      </div>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: T.muted }}>
        Bible verses to declare over yourself every day.
      </p>

      {/* Add verse input */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="e.g. Philippians 4:13"
            className="glass-input flex-1 rounded-xl px-3 py-2 text-sm"
            style={{ fontFamily: 'Georgia, serif' }}
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim() || loading}
            className="text-sm font-semibold px-3 py-2 rounded-xl transition-all shrink-0"
            style={{
              background: input.trim() && !loading ? 'var(--accent)' : 'rgba(0,0,0,0.10)',
              color: input.trim() && !loading ? '#fff' : T.muted,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? '…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs mt-1.5" style={{ color: '#b91c1c' }}>{error}</p>}
      </div>

      {/* Verse tiles */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
        {proclamations.length === 0 && (
          <div className="rounded-2xl text-center py-10 px-4"
            style={{ background: 'var(--glass-content-bg)', border: '1px solid var(--glass-content-bd)' }}>
            <p className="text-2xl mb-2">✦</p>
            <p className="text-xs" style={{ color: T.muted }}>Add a verse above to start your daily proclamations.</p>
          </div>
        )}
        {proclamations.map((p) => (
          <div key={p.id} className="rounded-xl p-4 relative group"
            style={{
              background: 'var(--glass-content-bg)',
              border: '1px solid var(--glass-content-bd)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-bold" style={{ color: T.accent, fontFamily: 'Georgia, serif' }}>
                {p.ref}
              </span>
              <button
                onClick={() => { deleteProclamation(p.id); onRefresh(); }}
                className="shrink-0 text-xs leading-none opacity-0 group-hover:opacity-100 transition"
                style={{ color: T.muted }}
                title="Remove"
              >
                ✕
              </button>
            </div>
            {p.text && (
              <p className="text-xs leading-relaxed italic"
                style={{ color: T.sub, fontFamily: 'Georgia, serif' }}>
                {renderVerseText(p.text)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function PrayerPage() {
  const [blocks, setBlocks]           = useState([]);
  const [proclamations, setProclamations] = useState([]);
  const [editing, setEditing]         = useState(null);
  const [query, setQuery]             = useState('');

  function refresh() {
    setBlocks(getPrayerBlocks());
    setProclamations(getProclamations());
  }
  useEffect(() => { refresh(); }, []);

  function handleSave(block) { savePrayerBlock(block); refresh(); setEditing(null); }
  function handleDelete(id)  { deletePrayerBlock(id); refresh(); }

  const filtered = blocks.filter((b) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.html.toLowerCase().includes(q);
  });

  return (
    <div className="flex gap-6 items-start">

      {/* ── Left: Prayer Points ─────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl" style={{ color: T.text, fontFamily: 'Georgia, serif' }}>Prayer Points</h2>
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            + New Prayer
          </button>
        </div>

        {/* Search */}
        {blocks.length > 0 && !editing && (
          <div className="relative mb-5">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prayer points..."
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm pr-9" />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
                style={{ color: T.muted }}>×</button>
            )}
          </div>
        )}

        {/* New / Edit editor */}
        {editing && (
          <div className="mb-5">
            <PrayerEditor
              block={editing === 'new' ? null : editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}

        {/* Empty state */}
        {blocks.length === 0 && !editing && (
          <div className="glass-card rounded-2xl text-center py-16 px-6">
            <p className="text-4xl mb-4">🙏</p>
            <p className="text-base font-semibold" style={{ color: T.text }}>No prayer points yet</p>
            <p className="text-sm mt-2" style={{ color: T.muted }}>
              Click "+ New Prayer" above to write your first prayer block.
            </p>
          </div>
        )}

        {blocks.length > 0 && filtered.length === 0 && !editing && (
          <div className="glass-card rounded-2xl text-center py-10 px-6">
            <p className="text-sm" style={{ color: T.muted }}>
              No prayer points match <span style={{ color: T.text }}>"{query}"</span>
            </p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((block) =>
            editing && editing !== 'new' && editing.id === block.id ? (
              <PrayerEditor key={block.id} block={block} onSave={handleSave} onCancel={() => setEditing(null)} />
            ) : (
              <PrayerCard key={block.id} block={block} onEdit={() => setEditing(block)} onDelete={() => handleDelete(block.id)} />
            )
          )}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────── */}
      <div className="shrink-0 self-stretch" style={{ width: 1, background: 'var(--tile-divider)' }} />

      {/* ── Right: Proclamations ─────────────────────── */}
      <div className="shrink-0" style={{ width: 300 }}>
        <ProclamationsPanel proclamations={proclamations} onRefresh={refresh} />
      </div>

      {/* Inline styles */}
      <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgba(90,65,30,0.4);
          pointer-events: none;
        }
        .prose-sm ul { list-style-type: disc; padding-left: 1.4em; margin: 0.3em 0; }
        .prose-sm ol { list-style-type: decimal; padding-left: 1.4em; margin: 0.3em 0; }
        .prose-sm li { margin: 0.15em 0; }
      `}</style>
    </div>
  );
}
