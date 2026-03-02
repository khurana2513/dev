// ─────────────────────────────────────────────
// Magic Square Logic & Puzzle Generator
// ─────────────────────────────────────────────

export type Grid = (number | null)[][];

// ── Odd-order: Siamese method ──────────────────
function generateOdd(n: number): number[][] {
  const sq = Array.from({ length: n }, () => Array(n).fill(0));
  let r = 0, c = Math.floor(n / 2);
  for (let num = 1; num <= n * n; num++) {
    sq[r][c] = num;
    let nr = (r - 1 + n) % n;
    let nc = (c + 1) % n;
    if (sq[nr][nc] !== 0) { nr = (r + 1) % n; nc = c; }
    r = nr; c = nc;
  }
  return sq;
}

// ── Even-order: Doubly-even (4k) using complement method ──
function generateDoublyEven(n: number): number[][] {
  const sq: number[][] = [];
  for (let r = 0; r < n; r++) {
    sq.push([]);
    for (let c = 0; c < n; c++) sq[r].push(r * n + c + 1);
  }
  const k = n / 4;
  // Flip diagonals in 4×4 blocks
  for (let bi = 0; bi < n; bi += 4) {
    for (let bj = 0; bj < n; bj += 4) {
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i === j || i + j === 3) {
            const r = bi + i, c = bj + j;
            sq[r][c] = n * n + 1 - sq[r][c];
          }
        }
      }
    }
  }
  return sq;
}

// ── Singly-even (4k+2): LUX method ─────────────
function generateSinglyEven(n: number): number[][] {
  // Split into 4 quadrants of size m = n/2 (m is odd)
  const m = n / 2;
  const small = generateOdd(m);

  // Build 4 quadrants
  const A: number[][] = small.map(r => r.map(v => v));
  const B: number[][] = small.map(r => r.map(v => v + 2 * m * m));
  const C: number[][] = small.map(r => r.map(v => v + 3 * m * m));
  const D: number[][] = small.map(r => r.map(v => v + m * m));

  const sq: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // Arrange: A top-left, B top-right, C bottom-left, D bottom-right
  // Then exchange columns in left quadrant, special row exchange
  const mid = Math.floor(m / 2);
  const halfK = Math.floor((m - 1) / 2);

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < m; c++) {
      sq[r][c] = A[r][c];
      sq[r][c + m] = B[r][c];
      sq[r + m][c] = C[r][c];
      sq[r + m][c + m] = D[r][c];
    }
  }

  // Exchange columns in left quadrant (except special row)
  const k = (n - 2) / 4;
  for (let r = 0; r < m; r++) {
    for (let c = 1; c <= k; c++) {
      if (r !== mid) {
        [sq[r][c - 1 + 0], sq[r + m][c - 1 + 0]] = [sq[r + m][c - 1 + 0], sq[r][c - 1 + 0]];
      }
    }
  }
  // Special mid-row exchange
  [sq[mid][0], sq[mid + m][0]] = [sq[mid + m][0], sq[mid][0]];
  [sq[mid][k], sq[mid + m][k]] = [sq[mid + m][k], sq[mid][k]];

  // Exchange columns in right quadrant
  for (let r = 0; r < m; r++) {
    for (let c = n - k + 1; c < n; c++) {
      [sq[r][c], sq[r + m][c]] = [sq[r + m][c], sq[r][c]];
    }
  }

  return sq;
}

export function generateMagicSquare(n: number): number[][] {
  if (n % 2 === 1) return generateOdd(n);
  if (n % 4 === 0) return generateDoublyEven(n);
  return generateSinglyEven(n);
}

export function getMagicSum(n: number): number {
  return (n * (n * n + 1)) / 2;
}

// ── Minimum clues per size ─────────────────────
export const MIN_CLUES: Record<number, number> = {
  3: 2,
  4: 4,
  5: 5,
  6: 7,
  7: 9,
  8: 12,
  9: 15,
};

// ── Puzzle generator: reveal minimum clues ─────
// Strategy: choose clues that span rows & cols evenly,
// prefer center for 3x3, prefer diagonal + edge values
export function generatePuzzle(n: number, solution: number[][]): Grid {
  const numClues = MIN_CLUES[n] ?? Math.ceil(n * n * 0.18);
  const grid: Grid = Array.from({ length: n }, () => Array(n).fill(null));

  const positions: [number, number][] = [];

  // For 3x3: always reveal only center (= 5).
  // Pick ONE random non-center cell so every new game is different.
  if (n === 3) {
    grid[1][1] = solution[1][1]; // center is always 5
    const nonCenter: [number, number][] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1) continue;
      nonCenter.push([r, c]);
    }
    const [r2, c2] = nonCenter[Math.floor(Math.random() * nonCenter.length)];
    grid[r2][c2] = solution[r2][c2];
    return grid;
  }

  // Build candidate list: spread across rows and columns
  const chosen = new Set<string>();

  // Priority positions: center, near-center, diagonal spots
  const priority: [number, number][] = [];

  // Main diagonal
  for (let i = 0; i < n; i++) priority.push([i, i]);
  // Anti-diagonal
  for (let i = 0; i < n; i++) priority.push([i, n - 1 - i]);
  // Edges (first/last row/col)
  for (let i = 0; i < n; i++) {
    priority.push([0, i], [n - 1, i], [i, 0], [i, n - 1]);
  }

  // Shuffle priority list
  const shuffled = priority.sort(() => Math.random() - 0.5);

  const rowCount = Array(n).fill(0);
  const colCount = Array(n).fill(0);

  for (const [r, c] of shuffled) {
    if (chosen.size >= numClues) break;
    const key = `${r}-${c}`;
    if (chosen.has(key)) continue;
    // Prefer cells where row/col are not over-represented
    if (rowCount[r] < Math.ceil(numClues / n) + 1 &&
        colCount[c] < Math.ceil(numClues / n) + 1) {
      chosen.add(key);
      grid[r][c] = solution[r][c];
      rowCount[r]++;
      colCount[c]++;
    }
  }

  // If still need more clues, fill remaining randomly
  if (chosen.size < numClues) {
    const all: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) all.push([r, c]);
    const remaining = all.filter(([r, c]) => !chosen.has(`${r}-${c}`))
      .sort(() => Math.random() - 0.5);
    for (const [r, c] of remaining) {
      if (chosen.size >= numClues) break;
      grid[r][c] = solution[r][c];
      chosen.add(`${r}-${c}`);
    }
  }

  return grid;
}

// ── Validation ─────────────────────────────────
export interface ValidationResult {
  rowSums: number[];
  colSums: number[];
  diag1: number;
  diag2: number;
  rowOk: boolean[];
  colOk: boolean[];
  diag1Ok: boolean;
  diag2Ok: boolean;
  duplicates: Set<string>;
  outOfRange: Set<string>;
  allCorrect: boolean;
}

export function validateGrid(
  userGrid: Grid,
  solution: number[][],
  n: number
): ValidationResult {
  const target = getMagicSum(n);
  const rowSums: number[] = [];
  const colSums: number[] = [];
  const rowOk: boolean[] = [];
  const colOk: boolean[] = [];
  const duplicates = new Set<string>();
  const outOfRange = new Set<string>();

  // Check duplicates across grid
  const seen = new Map<number, string>();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = userGrid[r][c];
      if (v === null) continue;
      const key = `${r}-${c}`;
      if (v < 1 || v > n * n) { outOfRange.add(key); continue; }
      if (seen.has(v)) {
        duplicates.add(key);
        duplicates.add(seen.get(v)!);
      } else {
        seen.set(v, key);
      }
    }
  }

  for (let r = 0; r < n; r++) {
    let rs = 0, filled = 0;
    for (let c = 0; c < n; c++) {
      const v = userGrid[r][c];
      if (v !== null) { rs += v; filled++; }
    }
    rowSums.push(rs);
    rowOk.push(filled === n && rs === target);
  }
  for (let c = 0; c < n; c++) {
    let cs = 0, filled = 0;
    for (let r = 0; r < n; r++) {
      const v = userGrid[r][c];
      if (v !== null) { cs += v; filled++; }
    }
    colSums.push(cs);
    colOk.push(filled === n && cs === target);
  }

  let d1 = 0, d2 = 0, d1f = 0, d2f = 0;
  for (let i = 0; i < n; i++) {
    if (userGrid[i][i] !== null) { d1 += userGrid[i][i]!; d1f++; }
    if (userGrid[i][n - 1 - i] !== null) { d2 += userGrid[i][n - 1 - i]!; d2f++; }
  }
  const diag1Ok = d1f === n && d1 === target;
  const diag2Ok = d2f === n && d2 === target;

  // Full correctness check (cell-by-cell vs solution)
  let allCorrect = true;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (userGrid[r][c] !== solution[r][c]) { allCorrect = false; break; }
    }
    if (!allCorrect) break;
  }

  return { rowSums, colSums, diag1: d1, diag2: d2, rowOk, colOk, diag1Ok, diag2Ok, duplicates, outOfRange, allCorrect };
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
