const STORAGE_KEY = 'bible_notes_v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getNotesForVerse(verseId) {
  const data = load();
  return data[verseId]?.notes || [];
}

export function addNote(verseId, verseRef, noteText, verseText) {
  const data = load();
  if (!data[verseId]) {
    data[verseId] = { verseRef, verseText: verseText || '', notes: [] };
  } else if (verseText && !data[verseId].verseText) {
    data[verseId].verseText = verseText;
  }
  data[verseId].notes.push({
    id: Date.now().toString(),
    text: noteText.trim(),
    createdAt: new Date().toISOString(),
  });
  save(data);
}

export function deleteNote(verseId, noteId) {
  const data = load();
  if (!data[verseId]) return;
  data[verseId].notes = data[verseId].notes.filter((n) => n.id !== noteId);
  if (data[verseId].notes.length === 0) {
    delete data[verseId];
  }
  save(data);
}

// Replace all notes for a verse with a single edited note
export function saveVerseNote(verseId, verseRef, noteText, verseText) {
  const data = load();
  const existing = data[verseId];
  const id = existing?.notes?.[0]?.id || Date.now().toString();
  const createdAt = existing?.notes?.[0]?.createdAt || new Date().toISOString();
  data[verseId] = {
    verseRef,
    verseText: verseText || existing?.verseText || '',
    notes: [{ id, text: noteText.trim(), createdAt, updatedAt: new Date().toISOString() }],
  };
  save(data);
}

export function deleteVerseNote(verseId) {
  const data = load();
  delete data[verseId];
  save(data);
}

// ── Highlights ────────────────────────────────────────
const HIGHLIGHTS_KEY = 'sefer_highlights_v1';

export function getHighlights() {
  try {
    return JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || '{}');
  } catch {
    return {};
  }
}

// highlights[verseId] = { color, ref, text }  (color may be a bare string for legacy data)
export function setHighlight(verseId, colorId, ref = '', text = '') {
  const highlights = getHighlights();
  const existing = highlights[verseId];
  highlights[verseId] = {
    color: colorId,
    ref:   ref  || (typeof existing === 'object' ? existing.ref  : '') || '',
    text:  text || (typeof existing === 'object' ? existing.text : '') || '',
  };
  localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
}

export function removeHighlight(verseId) {
  const highlights = getHighlights();
  delete highlights[verseId];
  localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
}

// Return array of { verseId, color, ref, text } sorted by insertion order
export function getHighlightList() {
  const raw = getHighlights();
  return Object.entries(raw).map(([verseId, val]) => ({
    verseId,
    color: typeof val === 'object' ? val.color : val,
    ref:   typeof val === 'object' ? val.ref   : '',
    text:  typeof val === 'object' ? val.text  : '',
  }));
}

// ── Proclamations ─────────────────────────────────────
const PROCLAMATIONS_KEY = 'sefer_proclamations_v1';

export function getProclamations() {
  try { return JSON.parse(localStorage.getItem(PROCLAMATIONS_KEY) || '[]'); }
  catch { return []; }
}

export function saveProclamation(p) { // { id, ref, text }
  const list = getProclamations();
  if (!list.find((x) => x.id === p.id)) {
    list.push(p);
    localStorage.setItem(PROCLAMATIONS_KEY, JSON.stringify(list));
  }
}

export function deleteProclamation(id) {
  const list = getProclamations().filter((p) => p.id !== id);
  localStorage.setItem(PROCLAMATIONS_KEY, JSON.stringify(list));
}

// ── Prayer blocks ─────────────────────────────────────
const PRAYER_KEY = 'sefer_prayers_v1';

export function getPrayerBlocks() {
  try {
    return JSON.parse(localStorage.getItem(PRAYER_KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePrayerBlock(block) {
  const blocks = getPrayerBlocks();
  const idx = blocks.findIndex((b) => b.id === block.id);
  if (idx >= 0) {
    blocks[idx] = block;
  } else {
    blocks.unshift(block);
  }
  localStorage.setItem(PRAYER_KEY, JSON.stringify(blocks));
}

export function deletePrayerBlock(id) {
  const blocks = getPrayerBlocks().filter((b) => b.id !== id);
  localStorage.setItem(PRAYER_KEY, JSON.stringify(blocks));
}

// ── Free notes (heading + body) ───────────────────────
const FREE_NOTES_KEY = 'sefer_free_notes_v1';

export function getFreeNotes() {
  try { return JSON.parse(localStorage.getItem(FREE_NOTES_KEY) || '[]'); }
  catch { return []; }
}

export function saveFreeNote(note) {
  const notes = getFreeNotes();
  const idx = notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) notes[idx] = note; else notes.unshift(note);
  localStorage.setItem(FREE_NOTES_KEY, JSON.stringify(notes));
}

export function deleteFreeNote(id) {
  const notes = getFreeNotes().filter((n) => n.id !== id);
  localStorage.setItem(FREE_NOTES_KEY, JSON.stringify(notes));
}

// ── Notes ─────────────────────────────────────────────
export function getAllVerseNotes() {
  const data = load();
  return Object.entries(data)
    .map(([verseId, entry]) => ({
      verseId,
      verseRef: entry.verseRef,
      verseText: entry.verseText || '',
      noteCount: entry.notes.length,
      notes: entry.notes,
      lastUpdated: entry.notes[entry.notes.length - 1]?.createdAt,
    }))
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
}
