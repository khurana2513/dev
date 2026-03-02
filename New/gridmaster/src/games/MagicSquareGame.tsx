import React, { useState, useMemo, useRef } from 'react';
import {
  generateMagicSquare, getMagicSum, generatePuzzle, validateGrid,
  MIN_CLUES, formatTime, Grid
} from '../utils/magicSquare';
import { useTimer } from '../hooks/useTimer';
import { sfx } from '../utils/audio';
import styles from './MagicSquareGame.module.css';

interface Props {
  onToast: (msg: string, type?: 'info' | 'success' | 'error' | 'hint', dur?: number) => void;
}

type CellState = 'correct' | 'wrong' | 'hint' | 'duplicate';

const SIZES = [3, 4, 5, 6, 7, 8, 9];

function getCellPx(n: number): number {
  if (n <= 4) return 68;
  if (n <= 5) return 62;
  if (n <= 6) return 56;
  if (n <= 7) return 52;
  return 48; // 8, 9
}

export function MagicSquareGame({ onToast }: Props) {
  const [n, setN] = useState(3);
  const [solution, setSolution] = useState<number[][]>(() => generateMagicSquare(3));
  const [puzzle, setPuzzle] = useState<Grid>(() => {
    const s = generateMagicSquare(3); return generatePuzzle(3, s);
  });
  const [userGrid, setUserGrid] = useState<Grid>(() => {
    const s = generateMagicSquare(3); const p = generatePuzzle(3, s); return p.map(r => [...r]);
  });
  const [hints, setHints] = useState(3);
  const [hintFlash, setHintFlash] = useState<Set<string>>(new Set());
  const [cellStates, setCellStates] = useState<Record<string, CellState>>({});
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { secs, reset: resetTimer } = useTimer(running && !paused && !solved);

  const magicSum = getMagicSum(n);
  const totalCells = n * n;
  const cellPx = getCellPx(n);
  const fontSize = cellPx >= 62 ? 20 : cellPx >= 52 ? 17 : 14;

  const filledCount = useMemo(
    () => userGrid.flat().filter(v => v !== null).length,
    [userGrid]
  );

  // Live validation for real-time row/col sum indicators
  const liveVal = useMemo(() => {
    const rowSums: number[] = [], colSums: number[] = [];
    const rowFilled: number[] = [], colFilled: number[] = [];
    for (let r = 0; r < n; r++) {
      let rs = 0, rf = 0;
      for (let c = 0; c < n; c++) { const v = userGrid[r][c]; if (v !== null) { rs += v; rf++; } }
      rowSums.push(rs); rowFilled.push(rf);
    }
    for (let c = 0; c < n; c++) {
      let cs = 0, cf = 0;
      for (let r = 0; r < n; r++) { const v = userGrid[r][c]; if (v !== null) { cs += v; cf++; } }
      colSums.push(cs); colFilled.push(cf);
    }
    let d1 = 0, d1f = 0, d2 = 0, d2f = 0;
    for (let i = 0; i < n; i++) {
      if (userGrid[i][i] !== null) { d1 += userGrid[i][i]!; d1f++; }
      if (userGrid[i][n - 1 - i] !== null) { d2 += userGrid[i][n - 1 - i]!; d2f++; }
    }
    const seen = new Map<number, string>();
    const dupes = new Set<string>();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const v = userGrid[r][c]; if (v === null) continue;
      const key = `${r}-${c}`;
      if (seen.has(v)) { dupes.add(key); dupes.add(seen.get(v)!); }
      else seen.set(v, key);
    }
    return { rowSums, colSums, rowFilled, colFilled, d1, d1f, d2, d2f, dupes };
  }, [userGrid, n]);

  function newGame(newN?: number) {
    const size = newN ?? n;
    const sol = generateMagicSquare(size);
    const puz = generatePuzzle(size, sol);
    setSolution(sol); setPuzzle(puz); setUserGrid(puz.map(r => [...r]));
    setHints(3); setHintFlash(new Set()); setCellStates({});
    setRunning(false); setPaused(false); setSolved(false);
    resetTimer();
    if (newN) setN(newN);
  }

  function handleInput(r: number, c: number, raw: string) {
    if (puzzle[r][c] !== null) return;
    if (!running) setRunning(true);
    if (paused) return;
    setCellStates(prev => { const next = { ...prev }; delete next[`${r}-${c}`]; return next; });
    const clean = raw.replace(/[^0-9\-]/g, '');
    const ng = userGrid.map(row => [...row]);
    if (clean === '' || clean === '-') {
      ng[r][c] = null;
    } else {
      const num = parseInt(clean, 10);
      if (isNaN(num)) return;
      sfx.place();
      ng[r][c] = num;
    }
    setUserGrid(ng);
  }

  function checkSolution() {
    sfx.click();
    const result = validateGrid(userGrid, solution, n);
    const newStates: Record<string, CellState> = {};
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const key = `${r}-${c}`;
      if (result.duplicates.has(key)) { newStates[key] = 'duplicate'; continue; }
      if (userGrid[r][c] === null) { newStates[key] = 'wrong'; continue; }
      newStates[key] = userGrid[r][c] === solution[r][c] ? 'correct' : 'wrong';
    }
    setCellStates(newStates);
    if (result.allCorrect) {
      setSolved(true); setRunning(false); sfx.complete();
      onToast('🎉 Perfect! Magic Square solved!', 'success', 5000);
    } else {
      sfx.error(); onToast('Some cells are incorrect. Keep going!', 'error');
    }
  }

  function useHintFn() {
    if (hints === 0) { sfx.error(); onToast('No hints remaining!', 'error'); return; }
    const empties: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (puzzle[r][c] !== null) continue;
      if (userGrid[r][c] !== solution[r][c]) empties.push([r, c]);
    }
    if (empties.length === 0) { onToast('All cells look correct!', 'success'); return; }
    const [hr, hc] = empties[Math.floor(Math.random() * empties.length)];
    sfx.hint();
    const ng = userGrid.map(row => [...row]);
    ng[hr][hc] = solution[hr][hc];
    setUserGrid(ng);
    setHints(h => h - 1);
    const key = `${hr}-${hc}`;
    setHintFlash(prev => new Set([...prev, key]));
    setCellStates(prev => ({ ...prev, [key]: 'hint' }));
    setTimeout(() => setHintFlash(prev => { const s = new Set(prev); s.delete(key); return s; }), 2000);
    onToast(`💡 Hint placed at row ${hr + 1}, col ${hc + 1}`, 'hint');
  }

  function revealAll() {
    sfx.click();
    setUserGrid(solution.map(row => [...row] as (number | null)[]));
    setSolved(true); setRunning(false); setCellStates({});
    onToast('Solution revealed', 'hint');
  }

  function getCellClass(r: number, c: number): string {
    const key = `${r}-${c}`;
    const locked = puzzle[r][c] !== null;
    const state = cellStates[key];
    const isDupe = liveVal.dupes.has(key) && !locked;
    const cls = [styles.cell];
    if (locked) cls.push(styles.locked);
    if (hintFlash.has(key)) cls.push(styles.hintFlash);
    if (state === 'correct') cls.push(styles.correct);
    else if (state === 'wrong') cls.push(styles.wrong);
    else if (state === 'hint') cls.push(styles.hintCell);
    else if (state === 'duplicate' || isDupe) cls.push(styles.duplicate);
    return cls.join(' ');
  }

  // Indicator helpers
  const ROW_IND_W = 46;
  const COL_IND_H = 28;
  const rowLabel = (r: number) => liveVal.rowFilled[r] > 0 ? String(liveVal.rowSums[r]) : '';
  const colLabel = (c: number) => liveVal.colFilled[c] > 0 ? String(liveVal.colSums[c]) : '';
  const rowOk  = (r: number) => liveVal.rowFilled[r] === n && liveVal.rowSums[r] === magicSum;
  const rowBad = (r: number) => liveVal.rowFilled[r] === n && liveVal.rowSums[r] !== magicSum;
  const colOk  = (c: number) => liveVal.colFilled[c] === n && liveVal.colSums[c] === magicSum;
  const colBad = (c: number) => liveVal.colFilled[c] === n && liveVal.colSums[c] !== magicSum;
  const progress = (filledCount / totalCells) * 100;

  const HOW_TO_STEPS = [
    ['Fill the grid', `Enter numbers so every row, column, and both diagonals sum to ${magicSum}.`],
    ['1 to N²', `Each number from 1 to ${n * n} must appear exactly once. Duplicates highlight in orange.`],
    ['Live sums', 'Running totals appear beside each row and above each column as you type. Green = correct sum, red = wrong.'],
    ['Minimum clues', `This ${n}×${n} puzzle starts with ${MIN_CLUES[n] ?? '?'} pre-filled clues — the fewest needed for a valid, solvable puzzle.`],
    ['3 hints total', 'Each hint auto-fills one incorrect cell. Once used, hints cannot be recovered.'],
    ['Double-digits & negatives', 'Type freely — multi-digit numbers and negative signs are fully supported.'],
  ];

  return (
    <div className={styles.wrap}>

      {/* ── How to Play Modal ── */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>How to Play — Magic Square</h2>
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
                <strong>🔢 Magic Sum for {n}×{n}:</strong> All rows, columns, and diagonals must sum to <strong className={styles.goldText}>{magicSum}</strong>.
                The formula is <em>n(n²+1)/2</em>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls bar ── */}
      <div className={styles.controlsBar}>
        <div className={styles.controlsLeft}>
          <div className={styles.sizeSelector}>
            {SIZES.map(s => (
              <button
                key={s}
                className={`${styles.sizeBtn} ${n === s ? styles.sizeBtnActive : ''}`}
                onClick={() => { sfx.click(); newGame(s); }}
              >{s}×{s}</button>
            ))}
          </div>
        </div>
        <div className={styles.controlsRight}>
          <button className={`${styles.btn} ${styles.btnGold}`} onClick={() => { sfx.click(); newGame(); }}>
            🔀 New Puzzle
          </button>
          <button
            className={`${styles.btn} ${paused ? styles.btnTeal : styles.btnGhost}`}
            onClick={() => { sfx.click(); if (!running) { setRunning(true); return; } setPaused(p => !p); }}
          >
            {running ? (paused ? '▶ Resume' : '⏸ Pause') : '▶ Start'}
          </button>
          <button className={`${styles.btn} ${styles.btnHint}`} onClick={useHintFn} disabled={hints === 0 || solved}>
            💡 Hint
            <span className={styles.hintPips}>
              {[0, 1, 2].map(i => <span key={i} className={`${styles.pip} ${i >= hints ? styles.pipUsed : ''}`} />)}
            </span>
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={revealAll} disabled={solved}>
            👁 Reveal
          </button>
          <button className={`${styles.btn} ${styles.btnInfo}`} onClick={() => setShowModal(true)}>
            ? How to Play
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
          <span className={styles.chipLabel}>Magic Sum</span>
          <span className={styles.chipValue}>{magicSum}</span>
        </div>
        <div className={styles.chip}>
          <span className={styles.chipLabel}>Clues Given</span>
          <span className={styles.chipValue}>{MIN_CLUES[n] ?? '?'}/{totalCells}</span>
        </div>
        <div className={styles.chip}>
          <span className={styles.chipLabel}>Filled</span>
          <span className={styles.chipValue}>{filledCount}/{totalCells}</span>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {/* ── Grid — centred, scrollable on small screens ── */}
      <div className={styles.gridScroll}>
        <div className={styles.gridInner}>

          {/* Column indicators */}
          <div className={styles.colIndRow} style={{ paddingLeft: ROW_IND_W }}>
            {Array.from({ length: n }, (_, c) => (
              <div
                key={c}
                className={`${styles.colInd} ${colOk(c) ? styles.indOk : colBad(c) ? styles.indBad : ''}`}
                style={{ width: cellPx, height: COL_IND_H }}
              >
                {colLabel(c)}
              </div>
            ))}
          </div>

          {/* Rows */}
          {userGrid.map((row, r) => (
            <div key={r} className={styles.gridRow} style={{ height: cellPx }}>
              {/* Row indicator — exact same height as cell */}
              <div
                className={`${styles.rowInd} ${rowOk(r) ? styles.indOk : rowBad(r) ? styles.indBad : ''}`}
                style={{ width: ROW_IND_W, height: cellPx }}
              >
                {rowLabel(r)}
              </div>

              {/* Cells */}
              {row.map((_, c) => {
                const locked = puzzle[r][c] !== null;
                return (
                  <div
                    key={c}
                    className={getCellClass(r, c)}
                    style={{ width: cellPx, height: cellPx }}
                  >
                    {locked ? (
                      <span className={styles.lockedNum} style={{ fontSize }}>{puzzle[r][c]}</span>
                    ) : paused ? (
                      <span className={styles.pausedDot}>·</span>
                    ) : (
                      <input
                        ref={el => { inputRefs.current[`${r}-${c}`] = el; }}
                        className={styles.cellInput}
                        type="text"
                        inputMode="numeric"
                        value={userGrid[r][c] !== null ? String(userGrid[r][c]) : ''}
                        onChange={e => handleInput(r, c, e.target.value)}
                        onFocus={e => e.target.select()}
                        disabled={solved}
                        maxLength={String(n * n).length + 1}
                        style={{ fontSize }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Diagonal indicators */}
          <div className={styles.diagRow} style={{ paddingLeft: ROW_IND_W, width: ROW_IND_W + n * cellPx }}>
            <div className={`${styles.diagChip} ${liveVal.d1f === n ? (liveVal.d1 === magicSum ? styles.indOk : styles.indBad) : ''}`}>
              ↘ {liveVal.d1f > 0 ? liveVal.d1 : '—'}
            </div>
            <div style={{ flex: 1 }} />
            <div className={`${styles.diagChip} ${liveVal.d2f === n ? (liveVal.d2 === magicSum ? styles.indOk : styles.indBad) : ''}`}>
              {liveVal.d2f > 0 ? liveVal.d2 : '—'} ↙
            </div>
          </div>
        </div>
      </div>

      {/* ── Check button ── */}
      <div className={styles.checkWrap}>
        <button
          className={`${styles.btn} ${styles.btnGold} ${styles.btnLarge}`}
          onClick={checkSolution}
          disabled={solved || paused}
        >
          ✓ Check Solution
        </button>
        <p className={styles.sumHint}>
          All rows, columns & diagonals must sum to <strong>{magicSum}</strong>
        </p>
      </div>

      {/* ── Success ── */}
      {solved && (
        <div className={styles.successBanner}>
          <div className={styles.successIcon}>✨</div>
          <h2>Magic!</h2>
          <p>Solved in {formatTime(secs)} — all sums equal <strong>{magicSum}</strong></p>
        </div>
      )}
    </div>
  );
}
