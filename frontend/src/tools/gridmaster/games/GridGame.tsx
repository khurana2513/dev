import { useState, useRef, useEffect } from 'react';
import { GameGrid, getNextCell, getStartCell, getMagicSum, formatTime } from '../utils/gridGame';
import { useTimer } from '../hooks/useTimer';
import { sfx } from '../utils/audio';
import styles from './GridGame.module.css';

interface Props {
  onToast: (msg: string, type?: 'info' | 'success' | 'error' | 'hint', dur?: number) => void;
}

// Max 49×49, odd sizes only
const ODD_SIZES = Array.from({ length: 24 }, (_, i) => 3 + i * 2); // 3,5,7,...,49

function getCellPx(n: number, fs = false): number {
  const base = (() => {
    if (n <= 5)  return 64;
    if (n <= 9)  return 52;
    if (n <= 13) return 42;
    if (n <= 19) return 34;
    if (n <= 27) return 27;
    if (n <= 35) return 22;
    return 18;
  })();
  return fs ? Math.round(base * 1.25) : base;
}

function getCellFontSize(px: number): number {
  if (px >= 52) return 19;
  if (px >= 42) return 15;
  if (px >= 34) return 12;
  if (px >= 27) return 10;
  if (px >= 22) return 8;
  return 7;
}

export function GridGame({ onToast }: Props) {
  const [n, setN] = useState(5);
  const [grid, setGrid] = useState<GameGrid>(() => initGrid(5));
  const [nextNum, setNextNum] = useState(2);
  const [lastCell, setLastCell] = useState<[number, number]>(() => getStartCell(5));
  const [solved, setSolved] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hints, setHints] = useState(3);
  const [hintHighlight, setHintHighlight] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [recentCell, setRecentCell] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { secs, reset: resetTimer } = useTimer(running && !paused && !solved);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (!document.fullscreenElement) {
          if (containerRef.current) containerRef.current.scrollTop = 0;
          containerRef.current?.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const totalCells = n * n;
  const filledCount = nextNum - 1;
  const magicSum = getMagicSum(n);
  const progress = (filledCount / totalCells) * 100;
  const cellPx = getCellPx(n, isFullscreen);
  const fontSize = getCellFontSize(cellPx);

  function initGrid(size: number): GameGrid {
    const g: GameGrid = Array.from({ length: size }, () => Array(size).fill(null));
    const [sr, sc] = getStartCell(size);
    g[sr][sc] = 1;
    return g;
  }

  function startNewGame(size?: number) {
    const s = size ?? n;
    setGrid(initGrid(s));
    setNextNum(2);
    setLastCell(getStartCell(s));
    setSolved(false); setRunning(false); setPaused(false);
    setHints(3); setHintHighlight(null); setWrongFlash(null); setRecentCell(null);
    resetTimer();
    if (size) setN(size);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  }

  function getExpected(g: GameGrid, last: [number, number]): [number, number] {
    return getNextCell(g, last[0], last[1], n);
  }

  function handleCellClick(r: number, c: number) {
    if (solved || paused) return;
    if (grid[r][c] !== null) {
      sfx.error();
      setWrongFlash(`${r}-${c}`);
      setTimeout(() => setWrongFlash(null), 500);
      return;
    }
    const [er, ec] = getExpected(grid, lastCell);
    if (r !== er || c !== ec) {
      sfx.error();
      setWrongFlash(`${r}-${c}`);
      setTimeout(() => setWrongFlash(null), 500);
      onToast("That's not the right cell. Use a hint if you're stuck!", 'error');
      return;
    }
    if (!running) setRunning(true);
    sfx.place();
    const ng = grid.map(row => [...row]) as GameGrid;
    ng[r][c] = nextNum;
    setGrid(ng);
    setLastCell([r, c]);
    setRecentCell(`${r}-${c}`);
    setHintHighlight(null);
    setTimeout(() => setRecentCell(null), 350);
    const newNext = nextNum + 1;
    setNextNum(newNext);
    if (newNext > totalCells) {
      setSolved(true); setRunning(false); sfx.complete();
      onToast('🏆 Brilliant! Grid complete!', 'success', 5000);
    }
  }

  function useHintFn() {
    if (hints === 0) { sfx.error(); onToast('No hints remaining!', 'error'); return; }
    if (solved || nextNum > totalCells) return;
    sfx.hint();
    const [er, ec] = getExpected(grid, lastCell);
    const key = `${er}-${ec}`;
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHintHighlight(key);
    setHints(h => h - 1);
    onToast(`💡 Hint: Click the highlighted cell (row ${er + 1}, col ${ec + 1})`, 'hint', 3500);
    hintTimerRef.current = setTimeout(() => setHintHighlight(null), 8000);
  }

  function getCellClass(r: number, c: number): string {
    const key = `${r}-${c}`;
    const val = grid[r][c];
    const cls = [styles.cell];
    if (val !== null) cls.push(styles.filled);
    if (key === wrongFlash) cls.push(styles.wrong);
    if (key === recentCell && val !== null) cls.push(styles.recent);
    if (key === hintHighlight && val === null) cls.push(styles.hintHighlight);
    return cls.join(' ');
  }

  const HOW_TO_STEPS = [
    ['Start is set for you', 'Number 1 is pre-placed in the middle of the top row — the Siamese method always begins here.'],
    ['Move Up & Right', 'Each next number goes one step UP and one step RIGHT from the last placed number. Both axes wrap around the edges.'],
    ['Blocked? Go Below', 'If the target cell is already filled, place the number directly BELOW the last number you placed instead.'],
    ['Click to place', 'Simply click the correct cell to place the next number in sequence. No typing needed.'],
    ['Use hints wisely', '3 hints per game. Each hint highlights the correct next cell in purple for 8 seconds.'],
    ['Magic property', 'When complete, every row, column, and both diagonals sum to the same magic constant!'],
  ];

  return (
    <div ref={containerRef} className={`${styles.wrap}${isFullscreen ? ' ' + styles.wrapFs : ''}`}>

      {/* ── How to Play Modal ── */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>How to Play — Grid Game</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {HOW_TO_STEPS.map(([title, desc], i) => (
                <div key={i} className={styles.howStep}>
                  <div className={styles.stepNum}>{i + 1}</div>
                  <p><strong>{title}:</strong> {desc}</p>
                </div>
              ))}
              <div className={styles.exampleNote}>
                <strong>📌 Wrap example (5×5):</strong> Number 15 sits at top-right (row 1, col 5).
                Moving up+right wraps to bottom-left (row 5, col 1). Since 11 is already there,
                16 goes directly below 15 at row 2, col 5.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls bar ── */}
      <div className={styles.controlsBar}>
        <div className={styles.controlsLeft}>
          <select
            className={styles.sizeSelect}
            value={n}
            onChange={e => { sfx.click(); startNewGame(parseInt(e.target.value)); }}
          >
            {ODD_SIZES.map(s => (
              <option key={s} value={s}>{s}×{s}</option>
            ))}
          </select>
          <button className={`${styles.btn} ${styles.btnGold}`} onClick={() => { sfx.click(); startNewGame(); }}>
            🔀 New Game
          </button>
          <button
            className={`${styles.btn} ${paused ? styles.btnTeal : styles.btnGhost}`}
            onClick={() => { sfx.click(); if (running) setPaused(p => !p); }}
            disabled={!running || solved}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
        <div className={styles.controlsRight}>
          <button
            className={`${styles.btn} ${styles.btnHint}`}
            onClick={useHintFn}
            disabled={hints === 0 || solved || nextNum > totalCells}
          >
            💡 Hint
            <span className={styles.hintPips}>
              {[0, 1, 2].map(i => (
                <span key={i} className={`${styles.pip} ${i >= hints ? styles.pipUsed : ''}`} />
              ))}
            </span>
          </button>
          <button className={`${styles.btn} ${styles.btnInfo}`} onClick={() => setShowModal(true)}>
            ? How to Play
          </button>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => {
              if (!document.fullscreenElement) {
                if (containerRef.current) containerRef.current.scrollTop = 0;
                containerRef.current?.requestFullscreen().catch(() => {});
              } else document.exitFullscreen().catch(() => {});
            }}
            title="Fullscreen (press F)"
          >
            {isFullscreen ? '⛶ Exit' : '⛶ Full'}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={styles.statsRow}>
        <div className={`${styles.chip} ${styles.timerChip}`}>
          <span className={styles.chipLabel}>Time</span>
          <span className={styles.chipValue}>{paused ? '⏸ ' : ''}{formatTime(secs)}</span>
        </div>
        <div className={styles.chip}>
          <span className={styles.chipLabel}>Next Number</span>
          <span className={styles.chipValue}>{nextNum <= totalCells ? nextNum : '✓'}</span>
        </div>
        <div className={styles.chip}>
          <span className={styles.chipLabel}>Magic Sum</span>
          <span className={styles.chipValue}>{magicSum}</span>
        </div>
        <div className={styles.chip}>
          <span className={styles.chipLabel}>Progress</span>
          <span className={styles.chipValue}>{filledCount}/{totalCells}</span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {/* ── Status line ── */}
      <div className={styles.statusLine}>
        {!solved && nextNum <= totalCells && !paused && (
          <span>
            Place <strong className={styles.nextNumAccent}>{nextNum}</strong>
            {hintHighlight
              ? <> — <span className={styles.hintActiveText}>follow the purple highlight</span></>
              : <> — find the correct cell or use a hint</>
            }
          </span>
        )}
        {solved && <span className={styles.solvedText}>✓ Complete! Magic sum = {magicSum}</span>}
        {paused && <span className={styles.pausedText}>⏸ Game paused</span>}
      </div>

      {/* ── Grid — centred, horizontally scrollable ── */}
      <div className={styles.gridScroll}>
        <div
          className={styles.cellGrid}
          style={{
            gridTemplateColumns: `repeat(${n}, ${cellPx}px)`,
            gridTemplateRows: `repeat(${n}, ${cellPx}px)`,
          }}
        >
          {grid.map((row, r) =>
            row.map((val, c) => (
              <div
                key={`${r}-${c}`}
                className={getCellClass(r, c)}
                style={{ width: cellPx, height: cellPx }}
                onClick={() => handleCellClick(r, c)}
              >
                {paused
                  ? (val !== null ? <span className={styles.pausedDot}>·</span> : null)
                  : val !== null
                    ? <span className={styles.cellNum} style={{ fontSize }}>{val}</span>
                    : null
                }
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Success banner ── */}
      {solved && (
        <div className={styles.successBanner}>
          <div className={styles.successIcon}>🏆</div>
          <h2>Brilliant!</h2>
          <p>Grid filled in {formatTime(secs)} — every row, column & diagonal sums to <strong>{magicSum}</strong></p>
        </div>
      )}

      {/* ── Fullscreen HUD ── */}
      {isFullscreen && (
        <div className={styles.fsHud}>
          <div className={styles.fsHudInner}>
            <div className={styles.fsChip}>
              <span className={styles.fsChipLabel}>Time</span>
              <span className={styles.fsChipValue}>{paused ? '⏸ ' : ''}{formatTime(secs)}</span>
            </div>
            <div className={styles.fsDivider} />
            <div className={styles.fsChip}>
              <span className={styles.fsChipLabel}>Next</span>
              <span className={styles.fsChipValue}>{nextNum <= totalCells ? nextNum : '✓'}</span>
            </div>
            <div className={styles.fsChip}>
              <span className={styles.fsChipLabel}>Magic Sum</span>
              <span className={styles.fsChipValue}>{magicSum}</span>
            </div>
            <div className={styles.fsChip}>
              <span className={styles.fsChipLabel}>Progress</span>
              <span className={styles.fsChipValue}>{filledCount}/{totalCells}</span>
            </div>
            <div className={styles.fsDivider} />
            <button
              className={`${styles.fsBtn} ${paused ? styles.fsBtnActive : ''}`}
              onClick={() => { sfx.click(); if (running) setPaused(p => !p); }}
              disabled={!running || solved}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              className={styles.fsBtn}
              onClick={useHintFn}
              disabled={hints === 0 || solved || nextNum > totalCells}
            >
              💡 Hint ({hints})
            </button>
            <span className={styles.fsHint}>ESC to exit</span>
            <button
              className={`${styles.fsBtn} ${styles.fsBtnExit}`}
              onClick={() => document.exitFullscreen()}
            >
              ⛶ Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
