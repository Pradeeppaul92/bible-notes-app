import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPrayerBlocks, savePrayerBlock, savePrayerBlocks, deletePrayerBlock,
         getProclamations, saveProclamation, deleteProclamation } from '../utils/storage';
import { parseReference, suggestReference } from '../utils/searchUtils';
import { getNkjvPassage } from '../utils/bibleApi';

const T = {
  text:      'var(--tile-text, #1a1007)',
  sub:       'var(--tile-sub, #5c4030)',
  muted:     'var(--tile-muted, #8a7060)',
  accent:    'var(--accent, #6d28d9)',
  divider:   'var(--tile-divider, rgba(160,120,50,0.15))',
  pageText:  'var(--page-text, rgba(255,245,215,0.92))',
  pageSub:   'var(--page-sub, rgba(255,238,195,0.65))',
  pageMuted: 'var(--page-muted, rgba(255,232,185,0.42))',
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

// ── PIN utility ────────────────────────────────────────
async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── PIN modal (unlock) ─────────────────────────────────
function PinModal({ title, onVerify, onCancel, pinHash, customVerify }) {
  const [digits, setDigits] = useState([]);
  const [error, setError]   = useState('');
  const [busy, setBusy]     = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onCancel(); return; }
      if (/^[0-9]$/.test(e.key)) pressDigit(Number(e.key));
      if (e.key === 'Backspace') setDigits(d => { setError(''); return d.slice(0, -1); });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, busy]);

  async function pressDigit(d) {
    if (busy || digits.length >= 6) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 6) {
      setBusy(true);
      const pin = next.join('');
      if (customVerify) {
        const ok = await customVerify(pin);
        if (ok) { onVerify(); }
        else { setError('Incorrect PIN. Try again.'); setDigits([]); setBusy(false); }
      } else {
        const hash = await hashPin(pin);
        if (hash === pinHash) { onVerify(); }
        else { setError('Incorrect PIN. Try again.'); setDigits([]); setBusy(false); }
      }
    }
  }

  function backspace() {
    if (busy) return;
    setError('');
    setDigits(d => d.slice(0, -1));
  }

  const PAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--glass-card-bg)',
          border: '1px solid var(--glass-card-bd)',
          borderRadius: 22,
          padding: '28px 32px 24px',
          width: 280,
          boxShadow: '0 24px 64px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.9)',
          textAlign: 'center',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>🔒</div>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.1rem', fontWeight: 600, fontStyle: 'italic',
          color: T.text, margin: '0 0 20px',
        }}>
          {title || 'Enter PIN'}
        </p>

        {/* 6 dot indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: error ? 10 : 20 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{
              width: 13, height: 13, borderRadius: '50%',
              background: i < digits.length ? 'var(--accent)' : 'transparent',
              border: '2px solid var(--accent)',
              transition: 'background 0.12s',
            }} />
          ))}
        </div>

        {error && (
          <p style={{
            fontSize: 11, color: '#b91c1c', margin: '0 0 14px',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {error}
          </p>
        )}

        {/* Number pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {PAD.map((k, i) => (
            k === null ? <div key={i} /> :
            k === 'del' ? (
              <button key={i} type="button" onClick={backspace}
                style={{
                  height: 52, borderRadius: 13, fontSize: 18,
                  background: 'rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  cursor: 'pointer', color: T.sub,
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
              >⌫</button>
            ) : (
              <button key={i} type="button" onClick={() => pressDigit(k)}
                style={{
                  height: 52, borderRadius: 13,
                  fontSize: 18, fontWeight: 600,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  cursor: 'pointer', color: T.text,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              >{k}</button>
            )
          ))}
        </div>

        <button type="button" onClick={onCancel}
          style={{
            marginTop: 18, fontSize: 12, color: T.muted,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Toolbar button ─────────────────────────────────────
function TBtn({ title, active, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 7,
        background: active ? 'var(--accent)' : 'transparent',
        border: active ? '1px solid transparent' : '1px solid transparent',
        color: active ? '#fff' : T.sub,
        fontSize: 13, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; } }}
    >
      {children}
    </button>
  );
}

// ── Inline PIN input (6 boxes) ─────────────────────────
function PinInput({ label, value, onChange }) {
  return (
    <div>
      {label && (
        <p style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif", margin: '0 0 6px', letterSpacing: '0.04em' }}>
          {label}
        </p>
      )}
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="● ● ● ● ● ●"
        style={{
          width: '100%',
          background: 'rgba(0,0,0,0.04)',
          border: `1px solid ${T.divider}`,
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 20,
          letterSpacing: 8,
          color: T.text,
          outline: 'none',
          fontFamily: 'monospace',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ── Prayer editor ──────────────────────────────────────
function PrayerEditor({ block, onSave, onCancel }) {
  const editorRef    = useRef(null);
  const [title, setTitle]             = useState(block?.title || '');
  const [activeColor, setActiveColor] = useState('inherit');
  const [, forceUpdate]               = useState(0);
  const refresh = () => forceUpdate((n) => n + 1);

  // PIN state
  const [pinEnabled, setPinEnabled] = useState(!!block?.pinHash);
  const [pinInput, setPinInput]     = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError]     = useState('');

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

  function isInList(tag) {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return false;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    return !!node.closest?.(tag);
  }

  function toggleList(listTag) {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;

    const sameList  = node.closest?.(listTag);
    const otherTag  = listTag === 'UL' ? 'OL' : 'UL';
    const otherList = node.closest?.(otherTag);

    if (sameList) {
      // Unwrap: each <li> becomes a <div>
      const frag = document.createDocumentFragment();
      sameList.querySelectorAll('li').forEach(li => {
        const div = document.createElement('div');
        div.innerHTML = li.innerHTML || '<br>';
        frag.appendChild(div);
      });
      sameList.replaceWith(frag);
    } else if (otherList) {
      // Switch list type
      const newList = document.createElement(listTag);
      newList.innerHTML = otherList.innerHTML;
      otherList.replaceWith(newList);
      placeCursorIn(newList.querySelector('li') || newList);
    } else {
      // Wrap current block in a new list
      let block = node;
      while (block && block !== ed && !['DIV','P','BR'].includes(block.tagName)) {
        block = block.parentNode;
      }
      const newList = document.createElement(listTag);
      const li      = document.createElement('li');
      if (block && block !== ed && block.tagName !== 'BR') {
        li.innerHTML = block.innerHTML || '<br>';
        newList.appendChild(li);
        block.replaceWith(newList);
      } else {
        li.innerHTML = '<br>';
        newList.appendChild(li);
        sel.getRangeAt(0).insertNode(newList);
      }
      placeCursorIn(li);
    }
    refresh();
  }

  function placeCursorIn(el) {
    const sel = window.getSelection();
    const range = document.createRange();
    const target = el.lastChild || el;
    if (target.nodeType === 3) {
      range.setStart(target, target.length);
    } else {
      range.setStartAfter(target);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  async function handleSave() {
    const html = editorRef.current?.innerHTML || '';
    if (!title.trim() && !html.trim()) return;

    let pinHash = block?.pinHash || null;

    if (pinEnabled) {
      if (pinInput.length > 0 || !block?.pinHash) {
        // Setting or changing PIN
        if (pinInput.length !== 6) { setPinError('PIN must be exactly 6 digits.'); return; }
        if (pinInput !== pinConfirm) { setPinError('PINs do not match.'); return; }
        pinHash = await hashPin(pinInput);
      }
      // else: keep existing hash (user left fields blank = keep current PIN)
    } else {
      pinHash = null;
    }

    onSave({
      id: block?.id || Date.now().toString(),
      title: title.trim() || 'Prayer',
      html,
      pinHash,
      updatedAt: new Date().toISOString(),
    });
  }

  function applyColor(color) {
    setActiveColor(color);
    exec('foreColor', color === 'inherit' ? '#1a1007' : color);
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-bd)', boxShadow: '0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)' }}>

      {/* Title input */}
      <div className="px-5 pt-5 pb-3">
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Prayer title…"
          className="w-full bg-transparent outline-none"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, fontStyle: 'italic', color: T.text, letterSpacing: '-0.01em' }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-4 py-2"
        style={{ borderTop: `1px solid ${T.divider}`, borderBottom: `1px solid ${T.divider}`, background: 'rgba(0,0,0,0.018)' }}>
        <TBtn title="Bold"      active={queryActive('bold')}      onClick={() => { exec('bold');      refresh(); }}><strong>B</strong></TBtn>
        <TBtn title="Italic"    active={queryActive('italic')}    onClick={() => { exec('italic');    refresh(); }}><em>I</em></TBtn>
        <TBtn title="Underline" active={queryActive('underline')} onClick={() => { exec('underline'); refresh(); }}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </TBtn>
        <div style={{ width: 1, height: 16, background: T.divider, margin: '0 4px', flexShrink: 0 }} />
        <TBtn title="Bullet list"   active={isInList('ul')} onClick={() => toggleList('UL')}>≡</TBtn>
        <TBtn title="Numbered list" active={isInList('ol')} onClick={() => toggleList('OL')}>#</TBtn>
        <div style={{ width: 1, height: 16, background: T.divider, margin: '0 4px', flexShrink: 0 }} />
        {FONT_COLORS.map((fc) => (
          <button key={fc.value} type="button" title={fc.label}
            onMouseDown={(e) => { e.preventDefault(); applyColor(fc.value); }}
            style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: fc.value === 'inherit' ? 'conic-gradient(#1a1007 0deg 180deg, #6d28d9 180deg 360deg)' : fc.value,
              border: activeColor === fc.value ? '2px solid var(--accent)' : '1.5px solid rgba(0,0,0,0.14)',
              cursor: 'pointer', transition: 'transform 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
        ))}
      </div>

      {/* Editor body */}
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        className="px-5 py-4 outline-none min-h-[130px] prayer-editor-body"
        style={{ color: T.text, fontFamily: "Lora, Georgia, serif", fontSize: '0.92rem', lineHeight: 1.9 }}
        onInput={refresh}
        onKeyDown={(e) => {
          if (e.key === 'Tab') { e.preventDefault(); exec('insertHTML', '&emsp;'); return; }
          if (e.key === 'Enter') {
            const sel = window.getSelection();
            if (!sel?.rangeCount) return;
            let n = sel.getRangeAt(0).commonAncestorContainer;
            if (n.nodeType === 3) n = n.parentNode;
            const li = n.closest?.('li');
            if (li && !li.textContent.trim()) {
              // Empty list item → exit list
              e.preventDefault();
              const list = li.closest('ul, ol');
              const div  = document.createElement('div');
              div.innerHTML = '<br>';
              list.after(div);
              li.remove();
              if (!list.querySelector('li')) list.remove();
              placeCursorIn(div);
              refresh();
            }
          }
        }}
        data-placeholder="Write your prayer here…"
      />

      {/* PIN section */}
      <div className="px-5 py-4" style={{ borderTop: `1px solid ${T.divider}`, background: 'rgba(0,0,0,0.018)' }}>
        <button
          type="button"
          onClick={() => { setPinEnabled(p => !p); setPinInput(''); setPinConfirm(''); setPinError(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <div style={{
            width: 32, height: 18, borderRadius: 9,
            background: pinEnabled ? 'var(--accent)' : 'rgba(0,0,0,0.15)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: pinEnabled ? 16 : 2,
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.sub, fontFamily: "'DM Sans', sans-serif" }}>
            {pinEnabled ? '🔒 PIN lock enabled' : '🔓 Lock with PIN'}
          </span>
        </button>

        {pinEnabled && (
          <div className="space-y-3" style={{ marginTop: 14 }}>
            {block?.pinHash && (
              <p style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                PIN is already set. Leave both fields blank to keep it unchanged.
              </p>
            )}
            <PinInput
              label={block?.pinHash ? 'New PIN (6 digits)' : 'Set PIN (6 digits)'}
              value={pinInput}
              onChange={v => { setPinInput(v); setPinError(''); }}
            />
            <PinInput
              label="Confirm PIN"
              value={pinConfirm}
              onChange={v => { setPinConfirm(v); setPinError(''); }}
            />
            {pinError && (
              <p style={{ fontSize: 11, color: '#b91c1c', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                {pinError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: `1px solid ${T.divider}` }}>
        <span style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>↵ Enter to save</span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel}
            style={{ fontSize: 13, padding: '6px 16px', borderRadius: 10, color: T.muted, background: 'transparent', border: `1px solid ${T.divider}`, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            style={{ fontSize: 13, fontWeight: 600, padding: '6px 20px', borderRadius: 10, color: '#fff', background: 'var(--accent)', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Prayer card ────────────────────────────────────────
function PrayerCard({ block, isUnlocked, onUnlock, onEdit, onDelete, onRelock, onTogglePin, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const [showPin, setShowPin] = useState(false);
  const isLocked = !!block.pinHash && !isUnlocked;
  const date = new Date(block.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const iconBtn = (title, onClick, children, extra = {}) => (
    <button onClick={onClick} title={title} style={{
      width: 28, height: 28, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
      cursor: 'pointer', fontSize: 13, flexShrink: 0, ...extra,
    }}>{children}</button>
  );

  return (
    <>
      <div
        className="group relative rounded-2xl overflow-hidden"
        onClick={isLocked ? () => setShowPin(true) : undefined}
        style={{
          background: 'var(--glass-card-bg)',
          borderTop: '1px solid var(--glass-card-bd)',
          borderRight: '1px solid var(--glass-card-bd)',
          borderBottom: '1px solid var(--glass-card-bd)',
          borderLeft: '3px solid var(--accent)',
          boxShadow: block.pinned
            ? '0 2px 18px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.75)'
            : '0 2px 18px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.75)',
          transition: 'box-shadow 0.2s, transform 0.2s',
          cursor: isLocked ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.11), inset 0 1px 0 rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = block.pinned ? '0 2px 18px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.75)' : '0 2px 18px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.75)'; e.currentTarget.style.transform = 'none'; }}
      >
        {/* Card header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            {block.pinned && (
              <span style={{ fontSize: 11, flexShrink: 0, color: 'var(--accent)' }}>📌</span>
            )}
            {block.pinHash && (
              <span style={{ fontSize: 12, flexShrink: 0 }}>{isUnlocked ? '🔓' : '🔒'}</span>
            )}
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.12rem', fontWeight: 600, fontStyle: 'italic', color: T.text, lineHeight: 1.25, margin: 0 }}>
              {block.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0" style={{ transition: 'opacity 0.18s', paddingTop: 2 }}>
            {/* Move up/down */}
            {iconBtn('Move up', onMoveUp, '↑', {
              opacity: canMoveUp ? 1 : 0.3,
              cursor: canMoveUp ? 'pointer' : 'default',
              color: T.sub,
            })}
            {iconBtn('Move down', onMoveDown, '↓', {
              opacity: canMoveDown ? 1 : 0.3,
              cursor: canMoveDown ? 'pointer' : 'default',
              color: T.sub,
            })}
            <div style={{ width: 1, height: 16, background: T.divider, margin: '0 2px' }} />
            {/* Pin / unpin */}
            {iconBtn(block.pinned ? 'Unpin' : 'Pin to top', onTogglePin, '📌', {
              background: block.pinned ? 'rgba(var(--accent-rgb,109,40,217),0.10)' : 'rgba(0,0,0,0.05)',
              border: block.pinned ? '1px solid var(--accent)' : '1px solid rgba(0,0,0,0.08)',
              fontSize: 12,
            })}
            {/* Re-lock (only when unlocked and has PIN) */}
            {isUnlocked && block.pinHash && iconBtn('Lock again', (e) => { e.stopPropagation(); onRelock(); }, '🔒', {
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.08)',
              fontSize: 12,
            })}
            {!isLocked && (
              <>
                <div style={{ width: 1, height: 16, background: T.divider, margin: '0 2px' }} />
                {iconBtn('Edit', onEdit, '✎', { color: T.accent })}
                {iconBtn('Delete', onDelete, '✕', { background: 'rgba(185,28,28,0.06)', border: '1px solid rgba(185,28,28,0.13)', color: '#b91c1c', fontSize: 12 })}
              </>
            )}
          </div>
        </div>

        {/* Body — blurred when locked */}
        <div
          className="px-5 pb-3 text-sm prose-sm"
          style={{
            color: T.sub,
            fontFamily: "Lora, Georgia, serif",
            fontSize: '0.88rem',
            lineHeight: 1.85,
            maxHeight: 210,
            overflowY: 'auto',
            filter: isLocked ? 'blur(5px)' : 'none',
            userSelect: isLocked ? 'none' : 'auto',
            pointerEvents: isLocked ? 'none' : 'auto',
            transition: 'filter 0.2s',
          }}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />

        {/* Lock overlay */}
        {isLocked && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.12)',
          }}>
            <span style={{ fontSize: 22 }}>🔒</span>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: '0.04em' }}>
              Tap to unlock
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2 flex justify-end" style={{ borderTop: `1px solid ${T.divider}` }}>
          <span style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.01em' }}>{date}</span>
        </div>
      </div>

      {showPin && (
        <PinModal
          title={`Unlock "${block.title}"`}
          pinHash={block.pinHash}
          onVerify={() => { onUnlock(); setShowPin(false); }}
          onCancel={() => setShowPin(false)}
        />
      )}
    </>
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

function renderVerseText(text) {
  if (!text) return null;
  return text.split(/(\[\d+\])/).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) return <sup key={i} style={{ fontSize: '0.58em', fontWeight: 700, fontStyle: 'normal', color: T.accent, marginRight: 2, marginLeft: i > 0 ? 4 : 0, verticalAlign: 'super' }}>{m[1]}</sup>;
    return part;
  });
}

function ProclamationsPanel({ proclamations, onRefresh, onReadInBible }) {
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    const stale = proclamations.filter((p) => p.translation !== 'nkjv');
    if (stale.length === 0) return;
    let active = true;
    (async () => {
      for (const p of stale) {
        if (!active) break;
        const parsed = tryParseRef(p.ref);
        if (!parsed?.verse) continue;
        const { book, chapter, verse, verseEnd } = parsed;
        try {
          const text = await getNkjvPassage(book.id, chapter, verse, verseEnd || null);
          saveProclamation({ ...p, text, translation: 'nkjv' });
        } catch { /* skip on network error */ }
      }
      if (active) onRefresh();
    })();
    return () => { active = false; };
  }, []);

  async function handleAdd(override) {
    const raw = (override || input).trim();
    const parsed = tryParseRef(raw);
    if (!parsed?.verse) {
      const sug = suggestReference(raw);
      if (sug) { setSuggestion(sug); setError(''); }
      else { setError('Could not recognise that reference. Try "John 3:16" or "Psalm 23:1"'); setSuggestion(null); }
      return;
    }
    setSuggestion(null); setError(''); setLoading(true);
    const { book, chapter, verse, verseEnd } = parsed;
    const ref = verseEnd ? `${book.name} ${chapter}:${verse}–${verseEnd}` : `${book.name} ${chapter}:${verse}`;
    try {
      const text = await getNkjvPassage(book.id, chapter, verse, verseEnd || null);
      saveProclamation({ id: Date.now().toString(), ref, text, translation: 'nkjv' });
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
      <div className="mb-5">
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.pageMuted, fontFamily: "'DM Sans', sans-serif", margin: '0 0 5px 0' }}>
          Declare daily
        </p>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', fontWeight: 600, fontStyle: 'italic', color: T.pageText, lineHeight: 1, margin: 0, letterSpacing: '-0.01em' }}>
          Proclamations
        </h3>
      </div>

      <div className="mb-5">
        <div className="flex gap-2 mb-1.5">
          <input
            type="text" value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); setSuggestion(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="e.g. Philippians 4:13"
            className="glass-input flex-1 rounded-xl px-3.5 py-2 text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          <button
            onClick={() => handleAdd()}
            disabled={!input.trim() || loading}
            style={{
              fontSize: 13, fontWeight: 600, padding: '0 16px', borderRadius: 10, flexShrink: 0,
              background: input.trim() && !loading ? 'var(--accent)' : 'rgba(255,255,255,0.14)',
              color: input.trim() && !loading ? '#fff' : T.pageSub,
              border: input.trim() && !loading ? 'none' : '1px solid rgba(255,255,255,0.22)',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {loading ? '…' : 'Add'}
          </button>
        </div>
        {error && <p style={{ fontSize: 11, color: 'rgba(255,160,160,0.95)', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{error}</p>}
        {suggestion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <p style={{ fontSize: 12, color: T.pageSub, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
              Did you mean <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{suggestion}</span>?
            </p>
            <button onClick={() => { setInput(suggestion); handleAdd(suggestion); setSuggestion(null); }}
              style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Yes
            </button>
            <button onClick={() => setSuggestion(null)}
              style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: T.pageText, border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              No
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5">
        {proclamations.length === 0 && (
          <div className="rounded-2xl text-center py-10 px-4"
            style={{ background: 'var(--glass-content-bg)', border: '1px solid var(--glass-content-bd)' }}>
            <p style={{ fontSize: 22, marginBottom: 8 }}>✦</p>
            <p style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
              Add a verse to start your daily declarations.
            </p>
          </div>
        )}
        {proclamations.map((p) => (
          <div key={p.id} className="group relative rounded-xl"
            style={{
              background: 'var(--glass-content-bg)',
              border: '1px solid var(--glass-content-bd)',
              padding: '13px 15px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
            }}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-strong, var(--accent))', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {p.ref}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 0.15s' }}>
                {onReadInBible && (
                  <button
                    onClick={() => onReadInBible(p.ref)}
                    title="Open in Bible reader"
                    style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', borderRadius: 6, color: T.muted }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; }}
                  >📖</button>
                )}
                <button
                  onClick={() => { deleteProclamation(p.id); onRefresh(); }}
                  style={{ fontSize: 12, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, paddingTop: 2 }}
                  title="Remove"
                >✕</button>
              </div>
            </div>
            {p.text && (
              <p style={{ fontFamily: "Lora, Georgia, serif", fontSize: '0.78rem', lineHeight: 1.75, fontStyle: 'italic', color: T.sub, margin: 0 }}>
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
export default function PrayerPage({ onReadInBible }) {
  const [blocks, setBlocks]           = useState([]);
  const [proclamations, setProclamations] = useState([]);
  const [editing, setEditing]         = useState(null);
  const [query, setQuery]             = useState('');
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [showUnlockAll, setShowUnlockAll] = useState(false);

  function refresh() {
    setBlocks(getPrayerBlocks());
    setProclamations(getProclamations());
  }
  useEffect(() => { refresh(); }, []);

  function handleSave(block)  { savePrayerBlock(block); refresh(); setEditing(null); }
  function handleDelete(id)   { deletePrayerBlock(id);  refresh(); }
  function handleUnlock(id)   { setUnlockedIds(s => new Set([...s, id])); }
  function handleRelock(id)   { setUnlockedIds(s => { const n = new Set(s); n.delete(id); return n; }); }

  function handleCancel() {
    // Re-lock the card that was being edited so blur is restored
    if (editing && editing !== 'new' && editing.pinHash) {
      handleRelock(editing.id);
    }
    setEditing(null);
  }

  function handleTogglePin(block) {
    savePrayerBlock({ ...block, pinned: !block.pinned });
    refresh();
  }

  function handleMove(id, direction) {
    const pinned  = blocks.filter(b => b.pinned);
    const regular = blocks.filter(b => !b.pinned);
    const block   = blocks.find(b => b.id === id);
    if (!block) return;
    const group   = block.pinned ? pinned : regular;
    const idx     = group.findIndex(b => b.id === id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= group.length) return;
    const newGroup = [...group];
    [newGroup[idx], newGroup[swapIdx]] = [newGroup[swapIdx], newGroup[idx]];
    savePrayerBlocks(block.pinned ? [...newGroup, ...regular] : [...pinned, ...newGroup]);
    refresh();
  }

  // Pinned blocks always shown first, then regular, each in stored order
  const pinnedBlocks  = blocks.filter(b => b.pinned);
  const regularBlocks = blocks.filter(b => !b.pinned);
  const sortedBlocks  = [...pinnedBlocks, ...regularBlocks];

  const filtered = sortedBlocks.filter((b) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.html.toLowerCase().includes(q);
  });

  return (
    <div className="flex gap-6 items-start">

      {/* ── Left: Prayer Journal ─────────────────────── */}
      <div className="flex-1 min-w-0">

        <div className="flex items-end justify-between mb-6">
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.pageMuted, fontFamily: "'DM Sans', sans-serif", margin: '0 0 5px 0' }}>
              🙏 Prayer Journal
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.75rem', fontWeight: 600, fontStyle: 'italic', color: T.pageText, lineHeight: 1, margin: 0, letterSpacing: '-0.01em' }}>
              Prayer Points
            </h2>
          </div>
          {!editing && (
            <div className="flex items-center gap-2">
              {/* Unlock all — only shown when at least one locked block exists */}
              {blocks.some(b => b.pinHash && !unlockedIds.has(b.id)) && (
                <button
                  onClick={() => setShowUnlockAll(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 600, padding: '8px 16px',
                    borderRadius: 12, color: 'var(--accent)',
                    background: 'rgba(var(--accent-rgb,109,40,217),0.09)',
                    border: '1px solid rgba(var(--accent-rgb,109,40,217),0.22)',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
                >
                  🔓 Unlock all
                </button>
              )}
              <button
                onClick={() => setEditing('new')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 600, padding: '8px 18px',
                  borderRadius: 12, color: '#fff', background: 'var(--accent)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 2px 14px rgba(0,0,0,0.16)',
                  transition: 'opacity 0.15s, transform 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Prayer
              </button>
            </div>
          )}
        </div>

        {blocks.length > 0 && !editing && (
          <div className="relative mb-5">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prayer points…"
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm pr-9"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
                style={{ color: T.muted }}>×</button>
            )}
          </div>
        )}

        {editing === 'new' && (
          <div className="mb-5">
            <PrayerEditor
              block={null}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}

        {blocks.length === 0 && !editing && (
          <div className="glass-card rounded-2xl text-center py-16 px-6">
            <p style={{ fontSize: 36, marginBottom: 12 }}>🙏</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 600, fontStyle: 'italic', color: T.text, margin: '0 0 8px 0' }}>
              Begin your prayer journey
            </p>
            <p style={{ fontSize: 13, color: T.muted, fontFamily: "'DM Sans', sans-serif", margin: '0 0 20px 0' }}>
              Write your first prayer point above.
            </p>
            <button
              onClick={() => setEditing('new')}
              style={{ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 12, color: '#fff', background: 'var(--accent)', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              + New Prayer
            </button>
          </div>
        )}

        {blocks.length > 0 && filtered.length === 0 && !editing && (
          <div className="glass-card rounded-2xl text-center py-10 px-6">
            <p style={{ fontSize: 13, color: T.muted, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
              No results for <span style={{ color: T.text }}>"{query}"</span>
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((block) => {
            const isPinned   = !!block.pinned;
            const group      = isPinned ? pinnedBlocks : regularBlocks;
            const groupIdx   = group.findIndex(b => b.id === block.id);
            return editing && editing !== 'new' && editing.id === block.id ? (
              <PrayerEditor key={block.id} block={block} onSave={handleSave} onCancel={handleCancel} />
            ) : (
              <PrayerCard
                key={block.id}
                block={block}
                isUnlocked={unlockedIds.has(block.id)}
                onUnlock={() => handleUnlock(block.id)}
                onEdit={() => setEditing(block)}
                onDelete={() => handleDelete(block.id)}
                onRelock={() => handleRelock(block.id)}
                onTogglePin={() => handleTogglePin(block)}
                onMoveUp={() => handleMove(block.id, -1)}
                onMoveDown={() => handleMove(block.id, 1)}
                canMoveUp={groupIdx > 0}
                canMoveDown={groupIdx < group.length - 1}
              />
            );
          })}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────── */}
      <div className="shrink-0 self-stretch" style={{ width: 1, background: 'var(--tile-divider)' }} />

      {/* ── Right: Proclamations ─────────────────────── */}
      <div className="shrink-0" style={{ width: 300 }}>
        <ProclamationsPanel proclamations={proclamations} onRefresh={refresh} onReadInBible={onReadInBible} />
      </div>

      {showUnlockAll && (
        <PinModal
          title="Unlock all prayer points"
          onCancel={() => setShowUnlockAll(false)}
          customVerify={async (pin) => {
            const hash = await hashPin(pin);
            const lockedBlocks = blocks.filter(b => b.pinHash && !unlockedIds.has(b.id));
            const matching = lockedBlocks.filter(b => b.pinHash === hash);
            if (matching.length === 0) return false;
            setUnlockedIds(s => new Set([...s, ...matching.map(b => b.id)]));
            return true;
          }}
          onVerify={() => setShowUnlockAll(false)}
        />
      )}

      <style>{`
        .prayer-editor-body[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgba(90,65,30,0.35);
          pointer-events: none;
          font-style: italic;
        }
        .prayer-editor-body ul { list-style-type: disc; padding-left: 1.4em; margin: 0.3em 0; }
        .prayer-editor-body ol { list-style-type: decimal; padding-left: 1.4em; margin: 0.3em 0; }
        .prayer-editor-body li { margin: 0.15em 0; }
        .prose-sm ul { list-style-type: disc; padding-left: 1.4em; margin: 0.3em 0; }
        .prose-sm ol { list-style-type: decimal; padding-left: 1.4em; margin: 0.3em 0; }
        .prose-sm li { margin: 0.15em 0; }
      `}</style>
    </div>
  );
}
