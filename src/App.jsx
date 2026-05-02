import { useState, useEffect } from 'react';
import BibleReader from './components/BibleReader';
import NotesPage from './components/NotesPage';
import PrayerPage from './components/PrayerPage';
import ThemeSelector from './components/ThemeSelector';
import DailyVerseModal from './components/DailyVerseModal';
import { COLOR_THEMES, DEFAULT_THEME_ID } from './data/colorThemes';
import { getTodaysVerse, wasDailyVerseShownToday } from './data/dailyVerses';
import { TRANSLATIONS } from './utils/bibleApi';
import './index.css';

function applyTheme(themeId) {
  const theme = COLOR_THEMES.find((t) => t.id === themeId) || COLOR_THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.style.setProperty('--font', theme.font);
}

export default function App() {
  const [page, setPage]       = useState('reader');
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('sefer_theme') || DEFAULT_THEME_ID;
  });
  const [showDailyVerse, setShowDailyVerse] = useState(() => !wasDailyVerseShownToday());
  const [translation, setTranslation] = useState(() => localStorage.getItem('sefer_translation') || 'kjv');

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(themeId);
    localStorage.setItem('sefer_theme', themeId);
  }, [themeId]);

  const tileText = 'var(--tile-text, #fff8e8)';
  const tileMuted = 'var(--tile-muted, rgba(255,230,170,0.55))';

  return (
    <div className="sefer-bg">
      {showDailyVerse && (
        <DailyVerseModal
          verse={getTodaysVerse()}
          onClose={() => setShowDailyVerse(false)}
        />
      )}
      <div className="relative z-10">
        {/* ── Header ───────────────────────────────────── */}
        <header className="glass sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-5 py-3 flex items-center">
            {/* Logo + name */}
            <div className="flex items-center gap-3 flex-1">
              <img
                src="/my logo.png"
                alt="Sefer logo"
                style={{ width: 40, height: 40, objectFit: 'contain', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.18))' }}
              />
              <div>
                <h1 style={{ color: tileText, fontFamily: 'Georgia, serif' }}
                    className="font-bold text-lg leading-tight tracking-wide">
                  Sefer
                </h1>
                <p style={{ color: tileMuted }} className="text-xs">
                  {(() => { const t = TRANSLATIONS.find(t => t.id === translation); return `${t.label} · ${t.name}`; })()}
                </p>
              </div>
            </div>

            {/* Nav — centered */}
            <nav
              className="flex gap-1 p-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--header-bd, rgba(185,140,40,0.14))' }}
            >
              {[
                { id: 'reader', label: 'Bible' },
                { id: 'notes',  label: 'My Notes' },
                { id: 'prayer', label: '🙏 Prayer' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPage(tab.id)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                  style={
                    page === tab.id
                      ? { background: '#ffffff', color: 'var(--accent, #a86e10)', boxShadow: '0 1px 6px rgba(0,0,0,0.10)' }
                      : { color: tileText }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Daily verse + Theme — extreme right */}
            <div className="flex-1 flex justify-end items-center gap-2">
              <button
                onClick={() => setShowDailyVerse(true)}
                title="Today's verse"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid var(--header-bd, rgba(185,140,40,0.18))',
                  color: tileText,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
              >
                ✦ Daily verse
              </button>
              <ThemeSelector currentThemeId={themeId} onSelect={setThemeId} />
            </div>
          </div>
        </header>

        {/* ── Main ─────────────────────────────────────── */}
        <main className={`mx-auto px-4 py-6 ${page === 'prayer' || page === 'notes' ? 'max-w-5xl' : 'max-w-3xl'}`}>
          {page === 'reader' ? <BibleReader translation={translation} onTranslationChange={setTranslation} /> : page === 'notes' ? <NotesPage /> : <PrayerPage />}
        </main>
      </div>
    </div>
  );
}
