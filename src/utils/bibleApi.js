// No API key required — uses bible-api.com (public domain KJV)
// Chapters are cached to localStorage so previously read content works offline
const API_BASE = 'https://bible-api.com';
import { getCachedChapter, setCachedChapter } from './chapterCache';

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
  { id: 'web',   label: 'WEB',   name: 'World English Bible',         year: '2000' },
  { id: 'asv',   label: 'ASV',   name: 'American Standard Version',   year: '1901' },
  { id: 'ylt',   label: 'YLT',   name: "Young's Literal Translation", year: '1898', ntOnly: true },
  { id: 'bbe',   label: 'BBE',   name: 'Bible in Basic English',      year: '1965' },
  { id: 'darby', label: 'Darby', name: 'Darby Translation',           year: '1890' },
];

export async function getChapterContent(chapterId, translation = 'kjv') {
  // chapterId format: "genesis.1"
  const dotIndex = chapterId.lastIndexOf('.');
  const bookId = chapterId.slice(0, dotIndex);
  const chapter = chapterId.slice(dotIndex + 1);
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error(`Unknown book: ${bookId}`);

  // Return from cache if available (works offline)
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
