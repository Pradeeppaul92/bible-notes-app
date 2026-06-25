import { useState, useEffect } from 'react';
import seferLogo from './assets/sefer-logo.png';
import BibleReader from './components/BibleReader';
import PrayerPage from './components/PrayerPage';
import RhemaPage from './components/RhemaPage';
import ThemeSelector from './components/ThemeSelector';
import DailyVerseModal from './components/DailyVerseModal';
import OnboardingModal from './components/OnboardingModal';
import { COLOR_THEMES, DEFAULT_THEME_ID } from './data/colorThemes';
import { getTodaysVerse, wasDailyVerseShownToday } from './data/dailyVerses';
import { TRANSLATIONS } from './utils/bibleApi';
import { initStorage, forceSyncNow } from './utils/storage';
import './index.css';

function applyTheme(themeId) {
  const theme = COLOR_THEMES.find((t) => t.id === themeId) || COLOR_THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.style.setProperty('--font', theme.font);
}

const TABS = [
  { id: 'reader', label: 'Bible'  },
  { id: 'prayer', label: 'Prayer' },
  { id: 'rhema',  label: 'Rhema'  },
];

export default function App() {
  const [ready, setReady]           = useState(false);
  const [syncInfo, setSyncInfo]     = useState(null);
  const [syncing, setSyncing]       = useState(false);
  const [page, setPage]             = useState(() => localStorage.getItem('sefer_last_page') || 'reader');
  const [pageKey, setPageKey]       = useState(0);
  const [readerTarget, setReaderTarget] = useState(null);
  const [themeId, setThemeId]       = useState(() => localStorage.getItem('sefer_theme') || DEFAULT_THEME_ID);
  const [showDailyVerse, setShowDailyVerse] = useState(() => !wasDailyVerseShownToday());
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('sefer_onboarded'));
  const [translation, setTranslation]       = useState(() => localStorage.getItem('sefer_translation') || 'nkjv');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    initStorage().finally(() => setReady(true));
    window.seferAPI?.syncStatus?.().then(setSyncInfo).catch(() => {});
  }, []);

  useEffect(() => {
    applyTheme(themeId);
    localStorage.setItem('sefer_theme', themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem('sefer_translation', translation);
  }, [translation]);

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  function switchPage(id) {
    setPage(id);
    setPageKey((k) => k + 1);
    setMobileOpen(false);
    localStorage.setItem('sefer_last_page', id);
  }

  function navigateToReader(refStr) {
    setReaderTarget(refStr);
    setPage('reader');
    setPageKey((k) => k + 1);
    setMobileOpen(false);
    localStorage.setItem('sefer_last_page', 'reader');
  }

  async function handleManualSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await forceSyncNow();
      const info = await window.seferAPI?.syncStatus?.();
      if (info) setSyncInfo(info);
    } catch { /* silent */ } finally {
      setSyncing(false);
    }
  }

  const translationObj = TRANSLATIONS.find((t) => t.id === translation);

  if (!ready) return (
    <div className="sefer-bg" style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--accent, #8E6B28)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="sefer-bg" style={{ height: '100dvh', overflow: 'hidden' }}>
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
      {!showOnboarding && showDailyVerse && (
        <DailyVerseModal verse={getTodaysVerse()} onClose={() => setShowDailyVerse(false)} />
      )}

      {/* ── Floating Nav ──────────────────────────────────── */}
      <div className="fixed top-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <nav className="sefer-nav pointer-events-auto w-full max-w-3xl">

          {/* Logo + wordmark */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="sefer-nav-logo">
              <img
                src={seferLogo}
                alt="Sefer"
                style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.14))' }}
              />
            </div>
            <span className="sefer-wordmark hidden lg:inline">Sefer</span>
          </div>

          {/* Desktop tabs */}
          <div className="hidden md:flex items-center gap-0.5 sefer-tab-group">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchPage(tab.id)}
                className={`sefer-tab ${page === tab.id ? 'sefer-tab-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Translation label (desktop) */}
            {translationObj && (
              <span
                className="hidden lg:flex items-center sefer-eyebrow"
                style={{ fontSize: '0.58rem' }}
              >
                {translationObj.label}
              </span>
            )}

            <button
              onClick={() => setShowDailyVerse(true)}
              className="sefer-action-btn hidden sm:flex"
              title="Today's verse"
            >
              ✦ Daily
            </button>

            {syncInfo?.icloudAvailable && (
              <button
                className="hidden sm:flex items-center gap-1"
                onClick={handleManualSync}
                disabled={syncing}
                style={{
                  position: 'relative',
                  padding: '3px 9px 3px 7px',
                  borderRadius: 9999,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '0.01em',
                  cursor: syncing ? 'default' : 'pointer',
                  userSelect: 'none',
                  background: syncInfo.icloudSynced
                    ? 'rgba(var(--accent-rgb, 168,110,16), 0.12)'
                    : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${syncInfo.icloudSynced ? 'var(--accent)' : 'rgba(255,255,255,0.18)'}`,
                  color: syncInfo.icloudSynced ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
                  outline: 'none',
                  opacity: syncing ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { const t = e.currentTarget.querySelector('.sync-tooltip'); if (t) t.style.opacity = '1'; }}
                onMouseLeave={(e) => { const t = e.currentTarget.querySelector('.sync-tooltip'); if (t) t.style.opacity = '0'; }}
              >
                <span style={{ fontSize: 13 }}>☁</span>
                {syncing ? 'Syncing…' : syncInfo.icloudSynced ? 'Synced' : 'Pending'}
                <span
                  className="sync-tooltip"
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(20,14,6,0.92)',
                    color: 'rgba(255,240,210,0.95)',
                    fontSize: '0.65rem', fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    padding: '5px 10px', borderRadius: 7,
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    opacity: 0, transition: 'opacity 0.15s',
                    zIndex: 9999,
                  }}
                >
                  {syncing
                    ? 'Syncing now…'
                    : syncInfo.lastSyncTime
                      ? `Last synced: ${new Date(syncInfo.lastSyncTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
                      : 'Click to sync'}
                </span>
              </button>
            )}

            <div className="hidden md:block">
              <ThemeSelector currentThemeId={themeId} onSelect={setThemeId} />
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="sefer-hamburger md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <span className={`sefer-bar ${mobileOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
              <span className={`sefer-bar transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`sefer-bar ${mobileOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
            </button>
          </div>
        </nav>
      </div>

      {/* ── Mobile Overlay ────────────────────────────────── */}
      <div className={`sefer-mobile-overlay ${mobileOpen ? 'sefer-mobile-overlay-open' : ''}`}>
        <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => switchPage(tab.id)}
              className={`sefer-mobile-link ${mobileOpen ? 'sefer-mobile-link-in' : ''}`}
              style={{
                transitionDelay: mobileOpen ? `${i * 75 + 80}ms` : '0ms',
                color: page === tab.id ? 'var(--accent, #a86e10)' : 'var(--tile-text, #3a2008)',
              }}
            >
              {tab.label}
            </button>
          ))}

          <div
            className={`flex flex-col items-center gap-3 mt-2 ${mobileOpen ? 'sefer-mobile-link-in' : ''}`}
            style={{ transitionDelay: mobileOpen ? '320ms' : '0ms' }}
          >
            <button
              onClick={() => { setShowDailyVerse(true); setMobileOpen(false); }}
              className="sefer-action-btn"
            >
              ✦ Today's Verse
            </button>
            <ThemeSelector
              currentThemeId={themeId}
              onSelect={(id) => { setThemeId(id); }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 1,
          paddingTop: '5rem',
          paddingBottom: '1.5rem',
        }}
        className="no-scrollbar"
      >
        <main
          key={pageKey}
          className={`sefer-page mx-auto px-4 ${
            page === 'prayer' ? 'max-w-5xl' : page === 'rhema' ? 'max-w-full' : 'max-w-3xl'
          }`}
        >
          {page === 'reader' ? (
            <BibleReader translation={translation} onTranslationChange={setTranslation} initialRef={readerTarget} />
          ) : page === 'prayer' ? (
            <PrayerPage onReadInBible={navigateToReader} />
          ) : (
            <RhemaPage themeId={themeId} />
          )}
        </main>
      </div>
    </div>
  );
}
