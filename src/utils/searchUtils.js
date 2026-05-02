import { BOOKS } from './bibleApi';

/**
 * Parses a Bible reference string like "John 3:16" or "Genesis 1"
 * Returns { book, chapter, verse } or null if not recognized.
 */
export function parseReference(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Sort longest name first so "song of solomon" matches before "song"
  const sorted = [...BOOKS].sort((a, b) => b.name.length - a.name.length);

  for (const book of sorted) {
    const name = book.name.toLowerCase();
    if (q.startsWith(name)) {
      const rest = q.slice(name.length).trim();
      // supports: "3", "3:16", "3:16-18"
      const match = rest.match(/^(\d+)(?::(\d+)(?:-(\d+))?)?$/);
      if (match) {
        const chapter  = parseInt(match[1]);
        const verse    = match[2] ? parseInt(match[2]) : null;
        const verseEnd = match[3] ? parseInt(match[3]) : null;
        if (chapter >= 1 && chapter <= book.chapters) {
          return { book, chapter, verse, verseEnd };
        }
      }
    }
  }
  return null;
}
