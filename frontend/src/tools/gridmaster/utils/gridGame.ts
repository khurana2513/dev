// ─────────────────────────────────────────────
// Grid Game Logic — Siamese Method
// ─────────────────────────────────────────────

export type GameGrid = (number | null)[][];

// Given current grid and last placed cell, compute next expected cell
export function getNextCell(
  grid: GameGrid,
  lastR: number,
  lastC: number,
  n: number
): [number, number] {
  // Try up+right with wrapping
  const nr = (lastR - 1 + n) % n;
  const nc = (lastC + 1) % n;
  // If occupied → go below last cell
  if (grid[nr][nc] !== null) {
    return [(lastR + 1) % n, lastC];
  }
  return [nr, nc];
}

// Start cell: middle of top row
export function getStartCell(n: number): [number, number] {
  return [0, Math.floor(n / 2)];
}

// Build solution grid using Siamese method
export function buildSolution(n: number): GameGrid {
  const sq: GameGrid = Array.from({ length: n }, () => Array(n).fill(null));
  let [r, c] = getStartCell(n);
  for (let num = 1; num <= n * n; num++) {
    sq[r][c] = num;
    let nr = (r - 1 + n) % n;
    let nc = (c + 1) % n;
    if (sq[nr][nc] !== null) { nr = (r + 1) % n; nc = c; }
    r = nr; c = nc;
  }
  return sq;
}

export function getMagicSum(n: number): number {
  return (n * (n * n + 1)) / 2;
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
