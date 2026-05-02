import { useState } from 'react';
import { getNotesForVerse, saveVerseNote, deleteVerseNote } from '../utils/storage';

export default function NoteModal({ verseId, verseRef, verseText, onClose }) {
  const existing = getNotesForVerse(verseId);
  // Merge any legacy multi-note data into a single string
  const initialText = existing.map((n) => n.text).join('\n\n');

  const [text, setText]           = useState(initialText);
  const [showDelete, setShowDelete] = useState(false);

  const isEdit = existing.length > 0;
  const canSave = text.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    saveVerseNote(verseId, verseRef, text, verseText);
    onClose();
  }

  function handleDelete() {
    deleteVerseNote(verseId);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.30)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-modal w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--tile-divider, rgba(185,140,40,0.12))' }}>
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--accent)' }}>
              {isEdit ? 'Edit Note' : 'New Note'}
            </p>
            <h2 className="font-bold text-lg" style={{ color: 'var(--tile-text)', fontFamily: 'Georgia, serif' }}>
              {verseRef}
            </h2>
            {verseText && (
              <p className="text-xs mt-1.5 leading-relaxed italic line-clamp-2"
                style={{ color: 'var(--tile-sub)', fontFamily: 'Georgia, serif' }}>
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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your note here..."
            spellCheck={true}
            rows={10}
            className="glass-input w-full rounded-xl px-4 py-3 text-sm leading-relaxed resize-none"
            style={{ fontFamily: 'Georgia, serif' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleSave(); }}
          />
          <p className="text-xs mt-2 text-right" style={{ color: 'var(--tile-muted)' }}>Cmd+Enter to save</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--tile-divider, rgba(185,140,40,0.12))' }}>
          {isEdit ? (
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
  );
}
