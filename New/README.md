# 算盤 Soroban — Precision Abacus Simulator

A premium, interactive soroban (Japanese abacus) simulator with spring-physics bead animation, synthesised bead sounds, and two counting modes.

---

## Features

- **Spring-physics animation** — every bead springs to position with a satisfying, physical feel
- **Synthesised sounds** — woody "tok" percussive sounds via Web Audio API (no external files)
- **Two modes:**
  - **Positional** — standard place values (rightmost rod = ones, extends left ×10 each rod)
  - **Ones** — every marker-dot rod resets to ones; rods between two dots form independent groups of up to 999
- **Configurable columns** — 3 to 20 rods, with presets and a slider
- **Fixed-size value display** — always the same font size, never overflows
- **Show/hide value** toggle
- **Sound on/off** toggle (off by default)

---

## Requirements

- **Node.js** v18 or newer  
  Check with: `node --version`  
  Download from: https://nodejs.org

---

## Setup & Run

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

### 3. Open in browser

Vite will print something like:

```
  VITE v5.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

The built files will be in `dist/` — these are static files you can deploy anywhere.

---

## Project Structure

```
soroban/
├── index.html          # HTML entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx        # React entry
    ├── index.css       # CSS variables + global reset
    └── Soroban.tsx     # Complete application (single file)
```

---

## How to Use

| Action | Result |
|--------|--------|
| Click a **resting bead** | Engages it and all beads between it and the divider |
| Click an **engaged bead** | Disengages it and all beads above it |
| **Heaven bead** (upper section) | Counts as 5 |
| **Earth beads** (lower section) | Each counts as 1 |
| **Red dot** on divider | Marks the ones rod |
| **Blue dots** on divider | Mark ×1000 boundaries |

### Ones vs Positional Mode

**Positional** (standard soroban):
- 9-rod example: places are `100M → 10M → 1M → 100K → 10K → 1K → 100 → 10 → 1`

**Ones mode**:
- Every blue/red dot rod acts as a local ones (ones of its group)
- Rods between two dots are ×10 and ×100 of that group
- The groups' values sum together
- 7-rod example: `[ones] [×100] [×10] [ones] [×100] [×10] [ones]`
  - Moving the leftmost bead → value = **1** (it's the ones of its group)
  - Moving same bead in positional → value = **1,000,000**
