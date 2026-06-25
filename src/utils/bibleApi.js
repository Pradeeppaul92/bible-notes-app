import bibleKjv   from '../data/bible-kjv.json';
import bibleAsv   from '../data/bible-asv.json';
import bibleYlt   from '../data/bible-ylt.json';
import bibleDarby from '../data/bible-darby.json';
import bibleBbe   from '../data/bible-bbe.json';
import { getCachedChapter, setCachedChapter } from './chapterCache';

// Local bundled datasets — fully offline, no internet needed
const LOCAL_BIBLES = { kjv: bibleKjv, asv: bibleAsv, ylt: bibleYlt, darby: bibleDarby, bbe: bibleBbe };

const API_BASE = 'https://bible-api.com';
const API_BIBLE_BASE = 'https://api.scripture.api.bible/v1';
const API_BIBLE_KEY = import.meta.env.VITE_BIBLE_API_KEY;
const NKJV_BIBLE_ID = '63097d2a0a2f7db3-01';

// Maps app book IDs → api.bible 3-letter codes
const API_BIBLE_BOOK_CODE = {
  genesis:'GEN', exodus:'EXO', leviticus:'LEV', numbers:'NUM', deuteronomy:'DEU',
  joshua:'JOS', judges:'JDG', ruth:'RUT', '1samuel':'1SA', '2samuel':'2SA',
  '1kings':'1KI', '2kings':'2KI', '1chronicles':'1CH', '2chronicles':'2CH',
  ezra:'EZR', nehemiah:'NEH', esther:'EST', job:'JOB', psalms:'PSA',
  proverbs:'PRO', ecclesiastes:'ECC', songofsolomon:'SNG', isaiah:'ISA',
  jeremiah:'JER', lamentations:'LAM', ezekiel:'EZK', daniel:'DAN', hosea:'HOS',
  joel:'JOL', amos:'AMO', obadiah:'OBA', jonah:'JON', micah:'MIC', nahum:'NAM',
  habakkuk:'HAB', zephaniah:'ZEP', haggai:'HAG', zechariah:'ZEC', malachi:'MAL',
  matthew:'MAT', mark:'MRK', luke:'LUK', john:'JHN', acts:'ACT', romans:'ROM',
  '1corinthians':'1CO', '2corinthians':'2CO', galatians:'GAL', ephesians:'EPH',
  philippians:'PHP', colossians:'COL', '1thessalonians':'1TH', '2thessalonians':'2TH',
  '1timothy':'1TI', '2timothy':'2TI', titus:'TIT', philemon:'PHM', hebrews:'HEB',
  james:'JAS', '1peter':'1PE', '2peter':'2PE', '1john':'1JN', '2john':'2JN',
  '3john':'3JN', jude:'JUD', revelation:'REV',
};

export const BOOKS = [
  // Old Testament
  { id: 'genesis',        name: 'Genesis',        chapters: 50 },
  { id: 'exodus',         name: 'Exodus',         chapters: 40 },
  { id: 'leviticus',      name: 'Leviticus',      chapters: 27 },
  { id: 'numbers',        name: 'Numbers',        chapters: 36 },
  { id: 'deuteronomy',    name: 'Deuteronomy',    chapters: 34 },
  { id: 'joshua',         name: 'Joshua',         chapters: 24 },
  { id: 'judges',         name: 'Judges',         chapters: 21 },
  { id: 'ruth',           name: 'Ruth',           chapters: 4  },
  { id: '1samuel',        name: '1 Samuel',       chapters: 31 },
  { id: '2samuel',        name: '2 Samuel',       chapters: 24 },
  { id: '1kings',         name: '1 Kings',        chapters: 22 },
  { id: '2kings',         name: '2 Kings',        chapters: 25 },
  { id: '1chronicles',    name: '1 Chronicles',   chapters: 29 },
  { id: '2chronicles',    name: '2 Chronicles',   chapters: 36 },
  { id: 'ezra',           name: 'Ezra',           chapters: 10 },
  { id: 'nehemiah',       name: 'Nehemiah',       chapters: 13 },
  { id: 'esther',         name: 'Esther',         chapters: 10 },
  { id: 'job',            name: 'Job',            chapters: 42 },
  { id: 'psalms',         name: 'Psalms',         chapters: 150 },
  { id: 'proverbs',       name: 'Proverbs',       chapters: 31 },
  { id: 'ecclesiastes',   name: 'Ecclesiastes',   chapters: 12 },
  { id: 'songofsolomon',  name: 'Song of Solomon',chapters: 8  },
  { id: 'isaiah',         name: 'Isaiah',         chapters: 66 },
  { id: 'jeremiah',       name: 'Jeremiah',       chapters: 52 },
  { id: 'lamentations',   name: 'Lamentations',   chapters: 5  },
  { id: 'ezekiel',        name: 'Ezekiel',        chapters: 48 },
  { id: 'daniel',         name: 'Daniel',         chapters: 12 },
  { id: 'hosea',          name: 'Hosea',          chapters: 14 },
  { id: 'joel',           name: 'Joel',           chapters: 3  },
  { id: 'amos',           name: 'Amos',           chapters: 9  },
  { id: 'obadiah',        name: 'Obadiah',        chapters: 1  },
  { id: 'jonah',          name: 'Jonah',          chapters: 4  },
  { id: 'micah',          name: 'Micah',          chapters: 7  },
  { id: 'nahum',          name: 'Nahum',          chapters: 3  },
  { id: 'habakkuk',       name: 'Habakkuk',       chapters: 3  },
  { id: 'zephaniah',      name: 'Zephaniah',      chapters: 3  },
  { id: 'haggai',         name: 'Haggai',         chapters: 2  },
  { id: 'zechariah',      name: 'Zechariah',      chapters: 14 },
  { id: 'malachi',        name: 'Malachi',        chapters: 4  },
  // New Testament
  { id: 'matthew',        name: 'Matthew',        chapters: 28 },
  { id: 'mark',           name: 'Mark',           chapters: 16 },
  { id: 'luke',           name: 'Luke',           chapters: 24 },
  { id: 'john',           name: 'John',           chapters: 21 },
  { id: 'acts',           name: 'Acts',           chapters: 28 },
  { id: 'romans',         name: 'Romans',         chapters: 16 },
  { id: '1corinthians',   name: '1 Corinthians',  chapters: 16 },
  { id: '2corinthians',   name: '2 Corinthians',  chapters: 13 },
  { id: 'galatians',      name: 'Galatians',      chapters: 6  },
  { id: 'ephesians',      name: 'Ephesians',      chapters: 6  },
  { id: 'philippians',    name: 'Philippians',    chapters: 4  },
  { id: 'colossians',     name: 'Colossians',     chapters: 4  },
  { id: '1thessalonians', name: '1 Thessalonians',chapters: 5  },
  { id: '2thessalonians', name: '2 Thessalonians',chapters: 3  },
  { id: '1timothy',       name: '1 Timothy',      chapters: 6  },
  { id: '2timothy',       name: '2 Timothy',      chapters: 4  },
  { id: 'titus',          name: 'Titus',          chapters: 3  },
  { id: 'philemon',       name: 'Philemon',       chapters: 1  },
  { id: 'hebrews',        name: 'Hebrews',        chapters: 13 },
  { id: 'james',          name: 'James',          chapters: 5  },
  { id: '1peter',         name: '1 Peter',        chapters: 5  },
  { id: '2peter',         name: '2 Peter',        chapters: 3  },
  { id: '1john',          name: '1 John',         chapters: 5  },
  { id: '2john',          name: '2 John',         chapters: 1  },
  { id: '3john',          name: '3 John',         chapters: 1  },
  { id: 'jude',           name: 'Jude',           chapters: 1  },
  { id: 'revelation',     name: 'Revelation',     chapters: 22 },
];

export async function getBooks() {
  return BOOKS;
}

export async function getChapters(bookId) {
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book) return [];
  return Array.from({ length: book.chapters }, (_, i) => ({
    id: `${bookId}.${i + 1}`,
    number: String(i + 1),
  }));
}

export const TRANSLATIONS = [
  { id: 'kjv',   label: 'KJV',   name: 'King James Version',         year: '1611' },
  { id: 'nkjv',  label: 'NKJV',  name: 'New King James Version',     year: '1982', requiresNet: true },
  { id: 'asv',   label: 'ASV',   name: 'American Standard Version',   year: '1901' },
  { id: 'ylt',   label: 'YLT',   name: "Young's Literal Translation", year: '1898', ntOnly: true },
  { id: 'bbe',   label: 'BBE',   name: 'Bible in Basic English',      year: '1965' },
  { id: 'darby', label: 'Darby', name: 'Darby Translation',           year: '1890' },
  { id: 'web',   label: 'WEB',   name: 'World English Bible',         year: '2000', requiresNet: true },
];

function getLocalChapter(chapterId, translation) {
  const bibleData = LOCAL_BIBLES[translation];
  if (!bibleData) return null;

  const dotIndex = chapterId.lastIndexOf('.');
  const bookId = chapterId.slice(0, dotIndex);
  const chapterNum = parseInt(chapterId.slice(dotIndex + 1));
  const bookIndex = BOOKS.findIndex((b) => b.id === bookId);
  if (bookIndex === -1) return null;

  const bookData = bibleData[bookIndex];
  const verseTexts = bookData?.chapters?.[chapterNum - 1];
  if (!verseTexts) return null;

  const book = BOOKS[bookIndex];
  return {
    reference: `${book.name} ${chapterNum}`,
    bookId,
    bookName: book.name,
    chapter: chapterNum,
    verses: verseTexts.map((text, i) => ({
      book_id: bookId,
      book_name: book.name,
      chapter: chapterNum,
      verse: i + 1,
      text,
    })),
    translation,
  };
}

async function getNkjvChapterContent(chapterId) {
  const dotIndex = chapterId.lastIndexOf('.');
  const bookId = chapterId.slice(0, dotIndex);
  const chapterNum = parseInt(chapterId.slice(dotIndex + 1));
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error(`Unknown book: ${bookId}`);

  const code = API_BIBLE_BOOK_CODE[bookId];
  if (!code) throw new Error(`No api.bible code for: ${bookId}`);

  const url = `${API_BIBLE_BASE}/bibles/${NKJV_BIBLE_ID}/chapters/${code}.${chapterNum}?content-type=text&include-verse-numbers=true&include-titles=false`;
  const res = await fetch(url, { headers: { 'api-key': API_BIBLE_KEY } });
  if (!res.ok) throw new Error(`NKJV fetch failed (HTTP ${res.status})`);
  const data = await res.json();

  // Parse "[1] verse text [2] verse text ..." format
  const parts = data.data.content.split(/\[(\d+)\]/);
  const verses = [];
  for (let i = 1; i < parts.length; i += 2) {
    const text = parts[i + 1]?.trim();
    if (text) {
      verses.push({
        book_id: bookId,
        book_name: book.name,
        chapter: chapterNum,
        verse: parseInt(parts[i]),
        text,
      });
    }
  }

  return {
    reference: `${book.name} ${chapterNum}`,
    bookId,
    bookName: book.name,
    chapter: chapterNum,
    verses,
    translation: 'nkjv',
  };
}

export async function getNkjvPassage(bookId, chapter, verse, verseEnd) {
  const code = API_BIBLE_BOOK_CODE[bookId];
  if (!code) throw new Error(`No api.bible code for: ${bookId}`);

  const start = `${code}.${chapter}.${verse}`;
  const passageId = verseEnd ? `${start}-${code}.${chapter}.${verseEnd}` : start;

  const url = `${API_BIBLE_BASE}/bibles/${NKJV_BIBLE_ID}/passages/${passageId}?content-type=text&include-verse-numbers=true&include-titles=false`;
  const res = await fetch(url, { headers: { 'api-key': API_BIBLE_KEY } });
  if (!res.ok) throw new Error(`NKJV fetch failed (HTTP ${res.status})`);
  const json = await res.json();

  const content = json.data.content.trim();
  // Single verse: strip the leading [n] marker; ranges keep it for renderVerseText
  return verseEnd ? content : content.replace(/^\[\d+\]\s*/, '');
}

export async function getChapterContent(chapterId, translation = 'kjv') {
  // chapterId format: "genesis.1"
  const dotIndex = chapterId.lastIndexOf('.');
  const bookId = chapterId.slice(0, dotIndex);
  const chapter = chapterId.slice(dotIndex + 1);
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error(`Unknown book: ${bookId}`);

  // Bundled translations — fully offline
  if (LOCAL_BIBLES[translation]) {
    return getLocalChapter(chapterId, translation);
  }

  // NKJV via api.bible (cached after first read)
  if (translation === 'nkjv') {
    const cached = getCachedChapter(chapterId, 'nkjv');
    if (cached) return cached;
    const result = await getNkjvChapterContent(chapterId);
    setCachedChapter(chapterId, result, 'nkjv');
    return result;
  }

  // WEB and any other translations: cache first, then fetch
  const cached = getCachedChapter(chapterId, translation);
  if (cached) return cached;

  const url = `${API_BASE}/${encodeURIComponent(book.name)}+${chapter}?translation=${translation}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch chapter (HTTP ${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const result = {
    reference: data.reference,
    bookId,
    bookName: book.name,
    chapter: parseInt(chapter),
    verses: data.verses,
    translation,
  };

  setCachedChapter(chapterId, result, translation);
  return result;
}

// ── Full-text Bible search (searches bundled KJV) ─────
const SEARCH_STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','could','should','may','might','shall','must','i','me','my','we',
  'our','you','your','he','him','his','she','her','it','its','they','them','their',
  'this','that','these','those','not','no','so','if','as','all','am','unto','thee',
  'thou','thy','thine','ye','hath','doth','shall','who','whom','which','what','there',
]);

export function searchBible(query, maxResults = 25) {
  const tokens = query.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !SEARCH_STOPWORDS.has(w));

  if (tokens.length === 0) return [];

  const results = [];

  for (let bi = 0; bi < bibleKjv.length; bi++) {
    const book = BOOKS[bi];
    if (!book) continue;
    const chapters = bibleKjv[bi]?.chapters || [];
    for (let ci = 0; ci < chapters.length; ci++) {
      const verses = chapters[ci];
      for (let vi = 0; vi < verses.length; vi++) {
        // Strip KJV editorial notes in curly braces
        const raw = verses[vi] || '';
        const clean = raw.replace(/\{[^}]*\}/g, '').toLowerCase();
        let matchCount = 0;
        for (const token of tokens) {
          if (clean.includes(token)) matchCount++;
        }
        if (matchCount === 0) continue;
        const score = matchCount / tokens.length;
        results.push({
          score,
          matchCount,
          ref: `${book.name} ${ci + 1}:${vi + 1}`,
          text: raw.replace(/\{[^}]*\}/g, '').trim(),
          bookId: book.id,
          chapter: ci + 1,
          verse: vi + 1,
        });
      }
    }
  }

  // Sort: full matches first, then partial; within each tier, canonical order
  results.sort((a, b) => b.score - a.score || b.matchCount - a.matchCount);
  return results.slice(0, maxResults);
}
