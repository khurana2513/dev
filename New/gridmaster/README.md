# GridMaster — Magic Square & Grid Game

A premium, gamified number puzzle app built with React + Vite + TypeScript.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open in browser
# http://localhost:5173
```

## Build for Production

```bash
npm run build
npm run preview
```

---

## Games

### ⊞ Grid Game
- Choose any odd grid size from 3×3 to 99×99
- **Number 1 is pre-placed** in the middle of the top row
- Click the correct cells in sequence using the Siamese method:
  - Move **Up + Right** (wrapping around edges)
  - If the cell is occupied, go **below** the last placed number
- Use **3 hints** to reveal the next correct cell (highlighted in purple for 8 seconds)
- No highlights until a hint is used — pure logic challenge!

### ✦ Magic Square
- Choose grid size: 3×3 through 9×9
- Fill in numbers so every row, column, and diagonal sums to the same magic number
- **Minimum clue counts** per grid size (the fewest clues that allow a valid puzzle):
  - 3×3: 2 clues | 4×4: 4 | 5×5: 5 | 6×6: 7 | 7×7: 9 | 8×8: 12 | 9×9: 15
- Supports double-digit numbers and negative inputs
- Real-time sum indicators beside each row/column
- Duplicate number detection (highlighted in orange)
- 3 hints auto-fill a random incorrect cell

---

## Features

- ⏱ Live timer with pause/resume
- 💡 3 hints per game with visual pip counter
- 📊 Progress bar + stat chips
- 🔊 Web Audio SFX (click, place, error, complete fanfare)
- ✅ Real-time row/col/diagonal sum validation
- 🎨 Dark luxury UI — Playfair Display + DM Mono typefaces
- 📱 Responsive design for mobile and desktop

---

## Project Structure

```
src/
├── games/
│   ├── GridGame.tsx          # Grid Game component
│   ├── GridGame.module.css
│   ├── MagicSquareGame.tsx   # Magic Square component  
│   └── MagicSquareGame.module.css
├── components/
│   ├── ToastContainer.tsx
│   └── Toast.module.css
├── hooks/
│   ├── useTimer.ts
│   └── useToast.ts
├── utils/
│   ├── audio.ts              # Web Audio API sfx engine
│   ├── gridGame.ts           # Siamese method logic
│   └── magicSquare.ts        # Square generation + puzzle engine
├── styles/
│   └── global.css
├── App.tsx
├── App.module.css
└── main.tsx
```
