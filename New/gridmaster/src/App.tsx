import React, { useState } from 'react';
import { MagicSquareGame } from './games/MagicSquareGame';
import { GridGame } from './games/GridGame';
import { ToastContainer } from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import { sfx } from './utils/audio';
import styles from './App.module.css';

type Tab = 'grid' | 'magic';

export default function App() {
  const [tab, setTab] = useState<Tab>('grid');
  const { toasts, add: addToast } = useToast();

  function switchTab(t: Tab) {
    sfx.click();
    setTab(t);
  }

  return (
    <div className={styles.app}>
      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.logoGlyph}>⊞</span>
          GridMaster
        </div>

        <div className={styles.navTabs}>
          <button
            className={`${styles.navTab} ${tab === 'grid' ? styles.navTabActive : ''}`}
            onClick={() => switchTab('grid')}
          >
            <span className={styles.tabIcon}>⊞</span>
            Grid Game
          </button>
          <button
            className={`${styles.navTab} ${tab === 'magic' ? styles.navTabActiveMagic : ''}`}
            onClick={() => switchTab('magic')}
          >
            <span className={styles.tabIcon}>✦</span>
            Magic Square
          </button>
        </div>

        <div className={styles.navRight}>
          <div className={styles.navBadge}>Beta</div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className={styles.hero}>
        <div className={styles.heroBadge}>
          {tab === 'grid' ? '⊞ Ancient Siamese Method' : '✦ Number Puzzles Reimagined'}
        </div>
        <h1 className={styles.heroTitle}>
          {tab === 'grid' ? (
            <><span className={styles.heroAccentTeal}>Grid</span> Game</>
          ) : (
            <><span className={styles.heroAccentGold}>Magic</span> Square</>
          )}
        </h1>
        <p className={styles.heroSub}>
          {tab === 'grid'
            ? 'Follow the ancient Siamese method — click to place numbers in sequence. Each click reveals the mathematical beauty within odd-ordered grids.'
            : 'Fill the grid so every row, column, and diagonal sums to the same magic number. Minimum clues, maximum elegance.'}
        </p>
      </div>

      {/* ── GAME ── */}
      <main className={styles.main}>
        {tab === 'grid'
          ? <GridGame onToast={addToast} />
          : <MagicSquareGame onToast={addToast} />
        }
      </main>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <p>GridMaster · Built with mathematical precision · {new Date().getFullYear()}</p>
      </footer>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
