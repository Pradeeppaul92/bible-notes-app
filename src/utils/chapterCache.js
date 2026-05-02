// Chapter cache — in-memory for session + localStorage persistence
// Keeps the last MAX_CACHED chapters so previously read content works offline

const CACHE_KEY   = 'sefer_chapter_cache_v1';
const MAX_CACHED  = 120; // ~120 chapters ≈ ~3 MB, well within localStorage limits

let memCache = null; // { [chapterId]: { data, ts } }

function loadCache() {
  if (memCache) return memCache;
  try {
    memCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    memCache = {};
  }
  return memCache;
}

function persistCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memCache));
  } catch {
    // Storage full — evict oldest half and retry
    const entries = Object.entries(memCache).sort((a, b) => a[1].ts - b[1].ts);
    entries.slice(0, Math.floor(entries.length / 2)).forEach(([k]) => delete memCache[k]);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(memCache)); } catch {}
  }
}

function cacheKey(chapterId, translation) {
  return translation && translation !== 'kjv' ? `${chapterId}__${translation}` : chapterId;
}

export function getCachedChapter(chapterId, translation = 'kjv') {
  return loadCache()[cacheKey(chapterId, translation)]?.data || null;
}

export function setCachedChapter(chapterId, data, translation = 'kjv') {
  const cache = loadCache();
  const key = cacheKey(chapterId, translation);

  // Evict oldest entries if over limit
  const keys = Object.keys(cache);
  if (keys.length >= MAX_CACHED) {
    const oldest = keys.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, 20);
    oldest.forEach((k) => delete cache[k]);
  }

  cache[key] = { data, ts: Date.now() };
  persistCache();
}

export function getCacheStats() {
  const cache = loadCache();
  return { count: Object.keys(cache).length, max: MAX_CACHED };
}
