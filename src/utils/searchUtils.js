import { BOOKS } from './bibleApi';

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
    for (let j = 1; j <= n; j++) {
      dp[i][j] = i === 0 ? j : Math.min(
        dp[i-1][j] + 1, dp[i][j-1] + 1,
        dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

// Given a mistyped reference like "Philippins 4:13", returns "Philippians 4:13" or null
export function suggestReference(input) {
  const text = input.trim().toLowerCase();
  // Split into book-part and numbers-part
  const m = text.match(/^(.*?)\s+(\d+(?::\d+(?:-\d+)?)?)$/);
  if (!m) return null;
  const [, rawBook, numPart] = m;
  const bookNorm = rawBook.replace(/\s+/g, '');

  let best = null, bestDist = Infinity, bestSim = -1;
  for (const book of BOOKS) {
    const nameNorm = book.name.toLowerCase().replace(/\s+/g, '');
    const dist = levenshtein(bookNorm, nameNorm);
    const maxLen = Math.max(bookNorm.length, nameNorm.length);
    const threshold = Math.ceil(maxLen * 0.42);
    if (dist === 0 || dist > threshold) continue;
    // Among equal edit-distance ties, prefer the longer book name match:
    // "jon"→"john" (dist 1, maxLen 4, sim 0.75) beats "job" (dist 1, maxLen 3, sim 0.67)
    const sim = 1 - dist / maxLen;
    if (dist < bestDist || (dist === bestDist && sim > bestSim)) {
      best = book;
      bestDist = dist;
      bestSim = sim;
    }
  }
  if (!best) return null;
  return `${best.name} ${numPart}`;
}

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
