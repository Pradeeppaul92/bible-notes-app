import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';

const FONTS = [
  { label: 'Lora',        value: 'Lora, Georgia, serif' },
  { label: 'DM Sans',     value: '"DM Sans", sans-serif' },
  { label: 'Cormorant',   value: '"Cormorant Garamond", serif' },
  { label: 'Georgia',     value: 'Georgia, serif' },
  { label: 'Palatino',    value: '"Palatino Linotype", Palatino, serif' },
  { label: 'Merriweather',value: 'Merriweather, Georgia, serif' },
  { label: 'Playfair',    value: '"Playfair Display", Georgia, serif' },
  { label: 'Crimson',     value: '"Crimson Text", Georgia, serif' },
  { label: 'Mono',        value: 'ui-monospace, monospace' },
];

const SIZES = ['10px','12px','14px','16px','18px','20px','22px','24px'];

const btnBase = {
  width: 28, height: 28, borderRadius: 6, fontSize: 13, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid transparent', transition: 'all 0.15s',
  background: 'transparent', flexShrink: 0,
};

function ToolBtn({ active, onClick, title, children, accentColor }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        ...btnBase,
        background: active ? (accentColor || 'var(--accent)') : 'var(--glass-tile-bg)',
        color: active ? '#fff' : 'var(--tile-text)',
        borderColor: active ? 'transparent' : 'var(--glass-tile-bd)',
      }}
    >{children}</button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: 'var(--tile-divider)', margin: '0 2px', flexShrink: 0 }} />;
}

export default function RichTextEditor({ content, onChange, onCursorChange, placeholder = 'Write here…', minHeight = 180, accentColor = null }) {
  const onCursorChangeRef = useRef(onCursorChange);
  useEffect(() => { onCursorChangeRef.current = onCursorChange; }, [onCursorChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      TextStyle,
      FontFamily,
      FontSize,
      Underline,
    ],
    content: content || '',
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: {
      attributes: {
        style: `min-height:${minHeight}px; outline:none; padding: 12px 14px; font-family: Lora, Georgia, serif; font-size: 15px; line-height: 1.85; color: var(--tile-text);`,
      },
    },
  });

  // Attach cursor-position listeners directly on the editor instance (most reliable in Tiptap v3)
  useEffect(() => {
    if (!editor) return;
    function fire() {
      const textBefore = editor.state.doc.textBetween(0, editor.state.selection.anchor, '\n');
      onCursorChangeRef.current?.(textBefore);
    }
    editor.on('update', fire);
    editor.on('selectionUpdate', fire);
    return () => { editor.off('update', fire); editor.off('selectionUpdate', fire); };
  }, [editor]);

  // Sync externally-changed content (e.g. insertVerse replacing body state)
  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
    }
  }, [content, editor]);

  if (!editor) return null;

  const currentFont = FONTS.find(f =>
    editor.isActive('textStyle', { fontFamily: f.value })
  )?.label || 'Font';

  const currentSize = SIZES.find(s =>
    editor.isActive('textStyle', { fontSize: s })
  ) || 'Size';

  const selectStyle = {
    background: 'var(--glass-tile-bg)',
    border: '1px solid var(--glass-tile-bd)',
    borderRadius: 6, fontSize: 11, padding: '0 6px',
    height: 28, cursor: 'pointer', color: 'var(--tile-text)',
    outline: 'none', flexShrink: 0,
  };

  const borderColor = accentColor ? `${accentColor}55` : 'var(--glass-tile-bd)';
  const toolbarBg   = accentColor ? `${accentColor}0d` : 'var(--glass-card-bg)';

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      overflow: 'hidden',
      background: 'transparent',
      transition: 'border-color 0.3s',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
        padding: '6px 10px',
        borderBottom: `1px solid ${borderColor}`,
        background: toolbarBg,
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" accentColor={accentColor}>
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" accentColor={accentColor}>
          <em>I</em>
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline" accentColor={accentColor}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </ToolBtn>

        <Divider />

        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list" accentColor={accentColor}>
          ≡
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list" accentColor={accentColor}>
          1.
        </ToolBtn>

        <Divider />

        <select
          value={currentFont}
          onChange={(e) => {
            const f = FONTS.find(f => f.label === e.target.value);
            if (f) editor.chain().focus().setFontFamily(f.value).run();
          }}
          style={{ ...selectStyle, width: 96 }}
          title="Font family"
        >
          <option value="Font" disabled>Font</option>
          {FONTS.map(f => <option key={f.value} value={f.label}>{f.label}</option>)}
        </select>

        <select
          value={currentSize}
          onChange={(e) => {
            if (e.target.value !== 'Size') editor.chain().focus().setFontSize(e.target.value).run();
          }}
          style={{ ...selectStyle, width: 60 }}
          title="Font size"
        >
          <option value="Size" disabled>Size</option>
          {SIZES.map(s => <option key={s} value={s}>{s.replace('px', '')}</option>)}
        </select>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {!content && (
        <style>{`
          .tiptap p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            color: var(--tile-muted);
            pointer-events: none;
            float: left;
            height: 0;
          }
        `}</style>
      )}
    </div>
  );
}
