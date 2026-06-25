import { useState } from 'react';
import { getNotesForVerse, saveVerseNote, deleteVerseNote, getVerseNoteColor, saveRhemaEntry, getRhemaEntries } from '../utils/storage';
import { NOTE_COLORS } from '../data/noteColors';
import { RHEMA_SLOT_COUNT } from '../data/rhemaPalette';
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

export default function NoteModal({ verseId, verseRef, verseText, onClose }) {
  const existing = getNotesForVerse(verseId);
  const initialText = existing.map((n) => n.text).join('\n\n');

  const [text, setText]           = useState(initialText);
  const [color, setColor]         = useState(() => getVerseNoteColor(verseId));
  const [showDelete, setShowDelete] = useState(false);

  const isEdit = existing.length > 0;
  const canSave = text.trim().length > 0;
  const activeColor = NOTE_COLORS.find((c) => c.id === color) || null;

  function handleSave() {
    if (!canSave) return;
    saveVerseNote(verseId, verseRef, text, verseText, color);

    // Auto-create a Rhema entry under "Word" type
    const plainNote = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const existingCount = getRhemaEntries().length;
    saveRhemaEntry({
      id:        `verse-note-${verseId}-${Date.now()}`,
      title:     verseRef,
      type:      'word',
      source:    verseText || '',
      body:      plainNote,
      colorSlot: existingCount % RHEMA_SLOT_COUNT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    onClose();
  }

  function handleDelete() {
    deleteVerseNote(verseId);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-modal w-full max-w-2xl flex flex-col" style={{
        maxHeight: '85vh',
        borderColor: activeColor?.border || undefined,
        transition: 'border-color 0.3s',
        overflow: 'hidden',
      }}>
        {/* Color accent bar */}
        <div style={{
          height: 4,
          borderRadius: '1.5rem 1.5rem 0 0',
          background: activeColor ? activeColor.swatch : 'transparent',
          transition: 'background 0.3s',
        }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-4 pb-4"
          style={{ borderBottom: `1px solid ${activeColor?.border || 'var(--tile-divider, rgba(185,140,40,0.12))'}`, transition: 'border-color 0.3s' }}>
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--accent)' }}>
              {isEdit ? 'Edit Note' : 'New Note'}
            </p>
            <h2 className="font-bold text-lg" style={{ color: 'var(--tile-text)', fontFamily: "Lora, Georgia, serif" }}>
              {verseRef}
            </h2>
            {verseText && (
              <p className="text-xs mt-1.5 leading-relaxed italic line-clamp-2"
                style={{ color: 'var(--tile-sub)', fontFamily: "Lora, Georgia, serif" }}>
                "{verseText}"
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 text-sm"
            style={{ background: 'var(--glass-tile-bg)', border: '1px solid var(--glass-tile-bd)', color: 'var(--tile-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{
          minHeight: 0,
          background: activeColor?.card || 'transparent',
          transition: 'background 0.3s',
        }}>
          <RichTextEditor content={text} onChange={setText} placeholder="Write your note here…" minHeight={180} accentColor={activeColor?.dot} />
          <p className="text-xs mt-2 text-right" style={{ color: 'var(--tile-muted)' }}>Cmd+Enter to save</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0" style={{
          borderTop: `1px solid ${activeColor?.border || 'var(--tile-divider, rgba(185,140,40,0.12))'}`,
          background: activeColor ? activeColor.card : 'transparent',
          transition: 'border-color 0.3s, background 0.3s',
        }}>
          {isEdit && !showDelete ? (
            <button onClick={() => setShowDelete(true)}
              className="text-sm px-4 py-2 rounded-xl transition-all hover:opacity-80 shrink-0"
              style={{ color: '#b91c1c', background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.15)' }}>
              Delete
            </button>
          ) : isEdit && showDelete ? (
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
                style={{
                  background: canSave ? 'var(--accent)' : 'rgba(0,0,0,0.12)',
                  color: canSave ? '#fff' : 'rgba(0,0,0,0.35)',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                }}>
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
