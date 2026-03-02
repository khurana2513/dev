// ─────────────────────────────────────────────
// Audio Engine — Web Audio API
// ─────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
  }
  return audioCtx;
}

function playTone(
  freq: number,
  type: OscillatorType = 'sine',
  dur = 0.12,
  gain = 0.1,
  delay = 0
) {
  const ctx = getCtx(); if (!ctx) return;
  setTimeout(() => {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch { /* ignore */ }
  }, delay);
}

export const sfx = {
  click:    () => playTone(700, 'sine', 0.07, 0.08),
  place:    () => playTone(880, 'sine', 0.06, 0.07),
  error:    () => playTone(180, 'sawtooth', 0.18, 0.09),
  correct:  () => { playTone(523,'sine',0.1,0.1,0); playTone(659,'sine',0.1,0.1,80); playTone(784,'sine',0.15,0.1,160); },
  hint:     () => { playTone(440,'sine',0.1,0.08,0); playTone(554,'sine',0.1,0.08,110); },
  complete: () => [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.22,0.12,i*130)),
  rowDone:  () => { playTone(660,'sine',0.08,0.08,0); playTone(784,'sine',0.1,0.08,90); },
};
