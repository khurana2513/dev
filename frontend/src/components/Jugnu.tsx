/**
 * ═══════════════════════════════════════════════════════════════
 * JUGNU 🐒 — Animated Monkey Mascot  (v3 – "Actually Alive")
 *
 * Fixed in v3:
 *  • Single persistent interval brain (no recursive setTimeout races)
 *  • Fires every 3–5s so something ALWAYS happens
 *  • Random position drift — Jugnu wanders around the corner
 *  • New moods: angry, scoff, shrug, sulk, surprised
 *  • Energy starts low-ish (60) so sleep/yawn happen naturally fast
 *  • Boredom counter rises when ignored → anger / sulk progression
 * ═══════════════════════════════════════════════════════════════
 *
 * Events:
 *   window.dispatchEvent(new Event("jugnu:correct"));
 *   window.dispatchEvent(new Event("jugnu:wrong"));
 *   window.dispatchEvent(new Event("jugnu:hint"));
 */
import { useState, useEffect, useRef, useCallback, memo } from "react";
import "../styles/jugnu.css";

// ─── Types ───────────────────────────────────────────────────────────────────
type Anim =
  | "idle"
  | "peeking"
  | "waving"
  | "watching"
  | "excited"
  | "confused"
  | "scratching"
  | "looking"
  | "yawning"
  | "sleeping"
  | "playful"
  | "proud"
  | "angry"
  | "scoff"
  | "shrug"
  | "sulk"
  | "surprised"
  | "banana"
  | "helicopter";

type MouthShape = "neutral" | "smile" | "open" | "flat" | "grin" | "frown";

interface Particle {
  id: number;
  x: number;
  y: number;
  content: string;
  type: "emoji" | "dot";
}

interface Memory {
  correctStreak: number;
  wrongStreak:   number;
  clickCount:    number;
  energy:        number; // 0–100
  bored:         number; // 0–100, rises when ignored
}

type BehaviorFn = () => void;

// ─── Personality lines ────────────────────────────────────────────────────────
const LINES = {
  praise:     ["Banana power! 🍌", "You're on fire!", "Nailed it! 🎯", "Genius move!", "Math wizard! ✨", "Ooh ooh aah!", "Show off! 😎", "Big brain energy!", "Unstoppable! 🚀", "Legend! 🏆"],
  proud:      ["I'm SO proud! 🥹", "My human is the best!", "3 in a row!", "You're on a STREAK! 🔥", "GOAT! 🐐"],
  superProud: ["UNSTOPPABLE MODE! 🔥", "Is this a world record?!", "5 STREAK! You're INSANE!", "I need a banana break! 🍌"],
  encourage:  ["Hmm… try again?", "Almost there!", "Think harder! 🤔", "Not quite…", "Don't give up!", "You've got this!", "I believe in you!"],
  bored:      ["I'm bored… 🥱", "Poke me!", "Any bananas? 🍌", "Helloo??", "Am I invisible? 👻", "Earth to human! 🌍", "Do SOMETHING! 😩"],
  angry:      ["I've been standing here for HOURS! 😤", "EXCUSE ME?! 🐒", "Don't ignore me!!", "I am RIGHT HERE! 😡", "OOH OOH ANGRY! 🐒💢"],
  scoff:      ["Pfft, whatever. 🙄", "Cool story bro 😒", "*rolls eyes* 🙄", "You don't even care 🐒", "I see how it is…"],
  sulk:       ["Fine. I'll just sit here. 😶", "*sulks*", "Nobody understands monkeys 😔", "*stares at wall*"],
  shrug:      ["¯\\_(ツ)_/¯", "Dunno! 🤷", "Who even knows anymore", "Beats me! 🤷‍♂️"],
  joke:       ["Why do monkeys know everything? APE books! 🐒", "I'm not lazy, I'm energy efficient 😎", "My tail IS my personality 🐒", "Banana a day keeps homework away 🍌"],
  hint:       ["Think step by step! 🤔", "Break it down!", "Read it again slowly…", "What do you know so far?"],
  greeting:   ["Hey! I'm Jugnu! 🐒", "Ready to learn? Let's go!", "JUGNU REPORTING FOR DUTY! 🫡"],
  sleepy:     ["💤", "zzz… bananas… zzz…", "*snore*", "so… sleepy…"],
  wakeUp:     ["Huh?! I'm awake! 😳", "I'm up! 😤", "WHO? WHAT? WHERE?! 👀", "I wasn't sleeping! 🧘"],
  click:      ["Hey! Tickles! 😂", "Ooh ooh! 🐒", "Stop poking me!", "*giggles*", "I'm not a button!", "SQUEEEE! 🐵", "Again! Again! 🎉"],
  surprised:  ["WOAH! 😱", "Didn't see that coming!", "👀👀👀", "AAAA! 🙈"],
  easterEgg:  ["BANANA TIME! 🍌🍌🍌", "Wheeeee! 🚁", "YO I CAN FLY! 🚁"],
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Position clamp ───────────────────────────────────────────────────────────
const W = 130, H = 160;
const EDGE_PAD = 16;

function clampPos(x: number, y: number) {
  return {
    x: Math.max(EDGE_PAD, Math.min(window.innerWidth  - W - EDGE_PAD, x)),
    y: Math.max(EDGE_PAD, Math.min(window.innerHeight - H - EDGE_PAD, y)),
  };
}

// ─── Hide on certain pages ─────────────────────────────────────────────────────
const HIDE_PATHS = ["/paper/attempt", "/login"];
function shouldHide() {
  return HIDE_PATHS.some((p) => window.location.pathname.startsWith(p));
}

// ─────────────────────────────────────────────────────────────────────────────
function JugnuInner() {
  // ── Visual state ─────────────────────────────────────────────────────────
  const [anim,         setAnim]         = useState<Anim>("peeking");
  const [mouthShape,   setMouthShape]   = useState<MouthShape>("neutral");
  const [eyeRy,        setEyeRy]        = useState(12);
  const [blushOpacity, setBlushOpacity] = useState(0);
  const [bubble,       setBubble]       = useState<string | null>(null);
  const [bubbleOut,    setBubbleOut]    = useState(false);
  const [particles,    setParticles]    = useState<Particle[]>([]);
  const [pos,          setPos]          = useState(() => ({
    x: window.innerWidth  - W - 18,
    y: window.innerHeight - H - 18,
  }));
  const [hidden, setHidden] = useState(shouldHide());

  // ── Refs (no-render hot path) ─────────────────────────────────────────────
  const wrapRef       = useRef<HTMLDivElement>(null);
  const leftPupilRef  = useRef<SVGGElement>(null);
  const rightPupilRef = useRef<SVGGElement>(null);
  const bubbleTimer   = useRef<ReturnType<typeof setTimeout>>();
  const brainTimer    = useRef<ReturnType<typeof setInterval>>();
  const lockedUntil   = useRef(0);
  const pidRef        = useRef(0);
  const lastMove      = useRef(Date.now());
  const lastAngle     = useRef(0);
  const cursorNear    = useRef(false);
  const animRef       = useRef<Anim>("peeking");
  const entranceDone  = useRef(false);

  const mem = useRef<Memory>({
    correctStreak: 0,
    wrongStreak:   0,
    clickCount:    0,
    energy:        60,
    bored:         0,
  });

  useEffect(() => { animRef.current = anim; }, [anim]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showBubble = useCallback((text: string, ms = 2800) => {
    clearTimeout(bubbleTimer.current);
    setBubble(text);
    setBubbleOut(false);
    bubbleTimer.current = setTimeout(() => {
      setBubbleOut(true);
      setTimeout(() => setBubble(null), 260);
    }, ms);
  }, []);

  /** Play an animation for `duration` ms then auto-return to idle */
  const play = useCallback((
    nextAnim: Anim,
    mouth: MouthShape,
    ery: number,
    blush: number,
    duration: number,
    line?: string,
    lineDuration?: number,
  ) => {
    setAnim(nextAnim);
    setMouthShape(mouth);
    setEyeRy(ery);
    setBlushOpacity(blush);
    if (line) showBubble(line, lineDuration ?? 2800);
    lockedUntil.current = Date.now() + duration;
    setTimeout(() => {
      setAnim("idle");
      setMouthShape("neutral");
      setEyeRy(12);
      setBlushOpacity(0);
    }, duration);
  }, [showBubble]);

  const spawnParticles = useCallback((mode: "celebrate" | "emoji" | "stars" = "celebrate") => {
    const emojis = ["🍌", "⭐", "🎉", "✨", "🐒", "🔥"];
    const colors = ["#f59e0b", "#10b981", "#a78bfa", "#f87171", "#38bdf8", "#fbbf24"];
    const p: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      p.push({
        id: pidRef.current++,
        x: 50 + (Math.random() - 0.5) * 80,
        y: 40 + (Math.random() - 0.5) * 60,
        content: mode === "celebrate" ? colors[i % colors.length] : mode === "stars" ? "⭐" : emojis[i % emojis.length],
        type: mode === "celebrate" ? "dot" : "emoji",
      });
    }
    setParticles(p);
    setTimeout(() => setParticles([]), 1000);
  }, []);

  /** Drift to a new position near the bottom-right corner */
  const wander = useCallback(() => {
    const zones = [
      { x: window.innerWidth - W - 18,  y: window.innerHeight - H - 18 },
      { x: window.innerWidth - W - 18,  y: window.innerHeight - H - 80 },
      { x: window.innerWidth - W - 18,  y: window.innerHeight - H - 150 },
      { x: window.innerWidth - W - 60,  y: window.innerHeight - H - 18 },
      { x: window.innerWidth - W - 120, y: window.innerHeight - H - 18 },
    ];
    setPos(clampPos(pick(zones).x, pick(zones).y));
    lockedUntil.current = Date.now() + 700;
  }, []);

  // ── Eye tracking (direct DOM — zero re-renders on mousemove) ─────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!wrapRef.current || animRef.current === "sleeping") return;
      lastMove.current = Date.now();

      const rect = wrapRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height * 0.3;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      const factor = Math.min(1, 250 / (dist + 1));
      const jx = (Math.random() - 0.5) * 0.6;
      const jy = (Math.random() - 0.5) * 0.4;
      const lx = (dx / (dist + 1)) * 3.5 * factor + jx;
      const ly = ((dy / (dist + 1)) * 3.5 * factor + jy) * 0.7;

      if (leftPupilRef.current)  leftPupilRef.current.style.transform  = `translate(${lx}px,${ly}px)`;
      if (rightPupilRef.current) rightPupilRef.current.style.transform = `translate(${lx}px,${ly}px)`;

      const angle = Math.atan2(dy, dx);
      if (Math.abs(angle - lastAngle.current) > 1.2) {
        wrapRef.current.classList.add("jugnu--micro-blink");
        setTimeout(() => wrapRef.current?.classList.remove("jugnu--micro-blink"), 150);
      }
      lastAngle.current = angle;
      cursorNear.current = dist < 120;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // ── Entrance ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t1 = setTimeout(() => setAnim("waving"), 2200);
    const t2 = setTimeout(() => {
      setAnim("idle");
      showBubble(pick(LINES.greeting), 3500);
      entranceDone.current = true;
      lockedUntil.current  = Date.now() + 3600;
    }, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── THE BRAIN — single persistent interval loop ───────────────────────────
  useEffect(() => {
    brainTimer.current = setInterval(() => {
      const now = Date.now();
      if (now < lockedUntil.current) return;
      if (!entranceDone.current) return;

      const cur = animRef.current;
      if (cur === "sleeping") return;
      if (cur !== "idle" && cur !== "watching") return;

      const m = mem.current;
      const idleMs = now - lastMove.current;

      // ── Decay / rise ──
      // Energy decays slowly when no mouse movement, faster over time
      if (idleMs > 8000)  m.energy = Math.max(0, m.energy - 1.5);
      else                m.energy = Math.max(0, m.energy - 0.2);
      // Boredom rises when ignored
      if (idleMs > 5000)  m.bored  = Math.min(100, m.bored + 4);
      else                m.bored  = Math.max(0,   m.bored - 1);

      // ── SLEEP ──
      if (m.energy < 12) {
        setAnim("sleeping");
        setMouthShape("flat");
        setEyeRy(6);
        setBlushOpacity(0);
        showBubble(pick(LINES.sleepy), 5000);
        lockedUntil.current = now + 9999999;
        return;
      }

      // ── Build weighted action pool ──
      const pool: Array<[number, BehaviorFn]> = [];
      const add = (w: number, fn: BehaviorFn) => { if (w > 0) pool.push([w, fn]); };

      // Base personality
      add(5, () => play("scratching", "neutral", 12, 0, 1400));
      add(4, () => play("looking",    "neutral", 12, 0, 2800));
      add(3, () => { lockedUntil.current = now + 1200; }); // natural pause

      // Boredom progression
      add(m.bored > 15 ? 4 : 1, () => play("idle",  "neutral", 12, 0, 100, pick(LINES.bored)));
      add(m.bored > 40 ? 5 : 0, () => play("scoff",     "flat",  12, 0, 1800, pick(LINES.scoff)));
      add(m.bored > 60 ? 5 : 0, () => play("angry",     "frown", 10, 0, 2000, pick(LINES.angry)));
      add(m.bored > 80 ? 5 : 0, () => play("sulk",      "flat",  11, 0, 3500, pick(LINES.sulk), 3500));

      // Tiredness
      add(m.energy < 40 ? 5 : 1, () => play("yawning", "open", 8, 0, 2500));

      // High energy
      add(m.energy > 65 ? 3 : 0, () => play("playful", "grin", 13, 0.3, 1800));
      add(m.energy > 60 ? 2 : 0, () => play("waving",  "smile", 12, 0.2, 1200));

      // Cursor nearby → playful
      add(cursorNear.current ? 5 : 0, () => play("playful", "grin", 13, 0.3, 1600, pick(LINES.click)));

      // Jokes, shrug, surprised
      add(2, () => play("idle",      "neutral", 12, 0, 100, pick(LINES.joke)));
      add(2, () => play("shrug",     "neutral", 12, 0, 1000, pick(LINES.shrug)));
      add(1, () => play("surprised", "open",    14, 0.1, 800, pick(LINES.surprised)));

      // Wander — physical movement!
      add(3, () => { wander(); m.bored = Math.max(0, m.bored - 8); });

      // Easter egg (rare — ~1-in-25 ticks)
      if (Math.random() < 0.04 && m.energy > 30) {
        add(3, () => {
          const heli = Math.random() < 0.5;
          play(heli ? "helicopter" : "banana", "grin", 12, 0.3, heli ? 2500 : 2000, pick(LINES.easterEgg));
          spawnParticles("emoji");
        });
      }

      // ── Weighted pick ──
      const total = pool.reduce((s, [w]) => s + w, 0);
      if (total === 0) return;
      let r = Math.random() * total;
      for (const [w, fn] of pool) {
        if ((r -= w) <= 0) { fn(); return; }
      }
      pool[pool.length - 1][1]();

    }, 3500 + Math.random() * 1500);

    return () => clearInterval(brainTimer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — stable, all state via refs

  // ── Wake up from sleep ────────────────────────────────────────────────────
  useEffect(() => {
    if (anim !== "sleeping") return;
    const wake = () => {
      lastMove.current = Date.now();
      mem.current.energy = Math.min(100, mem.current.energy + 40);
      mem.current.bored  = Math.max(0,   mem.current.bored  - 30);
      setAnim("idle");
      setMouthShape("neutral");
      setEyeRy(12);
      setBlushOpacity(0);
      showBubble(pick(LINES.wakeUp), 2500);
      lockedUntil.current = Date.now() + 2500;
    };
    window.addEventListener("mousemove", wake, { once: true });
    window.addEventListener("click",     wake, { once: true });
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("click",     wake);
    };
  }, [anim, showBubble]);

  // ── External learning events ──────────────────────────────────────────────
  useEffect(() => {
    const onCorrect = () => {
      const m = mem.current;
      lastMove.current = Date.now();
      m.correctStreak++; m.wrongStreak = 0;
      m.energy = Math.min(100, m.energy + 10);
      m.bored  = Math.max(0, m.bored - 25);
      lockedUntil.current = Date.now() + 1400;
      if (m.correctStreak >= 5) {
        play("excited", "grin", 10, 0.6, 1400, pick(LINES.superProud));
        spawnParticles("emoji");
      } else if (m.correctStreak >= 3) {
        play("proud", "smile", 10, 0.5, 1400, pick(LINES.proud));
        spawnParticles("stars");
      } else {
        play("excited", "smile", 10, 0.4, 1200, pick(LINES.praise));
        spawnParticles("celebrate");
      }
    };
    const onWrong = () => {
      const m = mem.current;
      lastMove.current = Date.now();
      m.wrongStreak++; m.correctStreak = 0;
      lockedUntil.current = Date.now() + 2000;
      play("confused", "flat", 12, 0, 2000,
        m.wrongStreak >= 3 ? pick(LINES.hint) : pick(LINES.encourage));
    };
    const onHint = () => {
      lastMove.current = Date.now();
      lockedUntil.current = Date.now() + 3200;
      play("looking", "neutral", 12, 0, 3000, pick(LINES.hint), 3000);
    };
    window.addEventListener("jugnu:correct", onCorrect);
    window.addEventListener("jugnu:wrong",   onWrong);
    window.addEventListener("jugnu:hint",    onHint);
    return () => {
      window.removeEventListener("jugnu:correct", onCorrect);
      window.removeEventListener("jugnu:wrong",   onWrong);
      window.removeEventListener("jugnu:hint",    onHint);
    };
  }, [play, spawnParticles]);

  // ── Route hide ────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setHidden(shouldHide());
    window.addEventListener("popstate", check);
    const itv = setInterval(check, 1000);
    return () => { window.removeEventListener("popstate", check); clearInterval(itv); };
  }, []);

  // ── Click ─────────────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    const m = mem.current;
    lastMove.current = Date.now();
    m.clickCount++;
    m.energy = Math.min(100, m.energy + 12);
    m.bored  = Math.max(0, m.bored - 25);
    lockedUntil.current = Date.now() + 1200;
    if (anim === "sleeping") {
      setAnim("idle");
      setMouthShape("neutral");
      setEyeRy(12);
      setBlushOpacity(0);
      showBubble(pick(LINES.wakeUp));
      return;
    }
    if (m.clickCount > 5 && Math.random() < 0.4) {
      play("angry", "frown", 10, 0, 1500, pick(LINES.angry));
    } else {
      play("excited", "smile", 10, 0.4, 1200, pick(LINES.click));
      spawnParticles(Math.random() > 0.5 ? "emoji" : "celebrate");
    }
  }, [anim, play, showBubble, spawnParticles]);

  // ── Mouth path generator ──────────────────────────────────────────────────
  const getMouthPath = () => {
    switch (mouthShape) {
      case "smile":  return "M 54,82 Q 65,92 76,82";
      case "grin":   return "M 52,80 Q 65,96 78,80";
      case "open":   return "M 58,80 Q 65,94 72,80 Q 65,86 58,80";
      case "frown":  return "M 54,88 Q 65,80 76,88";
      case "flat":   return "M 56,82 Q 65,84 74,82";
      default:       return "M 56,82 Q 65,88 74,82";
    }
  };

  if (hidden) return null;

  return (
    <div
      ref={wrapRef}
      className={`jugnu-wrap jugnu--${anim}`}
      style={{ left: pos.x, top: pos.y, bottom: "auto", right: "auto" }}
    >
      {/* Thought bubble */}
      {bubble && (
        <div className={`jugnu-bubble ${bubbleOut ? "jugnu-bubble--out" : ""}`}>
          {bubble}
        </div>
      )}

      {/* ZZZ */}
      <span className="jugnu-zzz">Z</span>
      <span className="jugnu-zzz">Z</span>
      <span className="jugnu-zzz">z</span>

      {/* Particles */}
      {particles.map((p) =>
        p.type === "emoji" ? (
          <div key={p.id} className="jugnu-particle jugnu-particle--emoji"
            style={{ left: p.x, top: p.y, "--px": `${(Math.random()-0.5)*60}px`, "--py": `${-20 - Math.random()*40}px` } as React.CSSProperties}>
            {p.content}
          </div>
        ) : (
          <div key={p.id} className="jugnu-particle"
            style={{ left: p.x, top: p.y, background: p.content, "--px": `${(Math.random()-0.5)*60}px`, "--py": `${-20 - Math.random()*40}px` } as React.CSSProperties} />
        )
      )}

      {/* Character SVG */}
      <div className="jugnu-body" onClick={handleClick} role="button" tabIndex={-1}>
        <div className="jugnu-breathe" style={{ width: "100%", height: "100%" }}>
          <svg viewBox="0 0 130 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="jg-fur" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#A0724D" />
                <stop offset="100%" stopColor="#7A4E2D" />
              </radialGradient>
              <radialGradient id="jg-belly" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#E4BF9A" />
                <stop offset="100%" stopColor="#C99B6D" />
              </radialGradient>
              <radialGradient id="jg-face" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#E8C9A8" />
                <stop offset="100%" stopColor="#D4A574" />
              </radialGradient>
              <filter id="jg-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.18" />
              </filter>
            </defs>

            {/* Tail */}
            <g className="jugnu-tail">
              <path d="M 22,120 C 8,115 -2,95 5,80 C 10,68 18,72 20,80 C 22,88 15,92 18,100"
                stroke="#6B3A1F" strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>

            {/* Body */}
            <g filter="url(#jg-shadow)">
              <ellipse cx="65" cy="120" rx="30" ry="32" fill="url(#jg-fur)" />
            </g>
            <ellipse cx="65" cy="122" rx="20" ry="22" fill="url(#jg-belly)" />

            {/* Feet */}
            <ellipse cx="48" cy="148" rx="12" ry="7" fill="#6B3A1F" />
            <ellipse cx="82" cy="148" rx="12" ry="7" fill="#6B3A1F" />

            {/* Left arm */}
            <g className="jugnu-arm-left">
              <path d="M 38,108 C 28,115 22,125 26,132" stroke="url(#jg-fur)" strokeWidth="8" strokeLinecap="round" fill="none" />
              <circle cx="26" cy="132" r="5" fill="#D4A574" />
            </g>

            {/* Right arm */}
            <g className="jugnu-arm-right">
              <path d="M 92,108 C 102,115 108,125 104,132" stroke="url(#jg-fur)" strokeWidth="8" strokeLinecap="round" fill="none" />
              <circle cx="104" cy="132" r="5" fill="#D4A574" />
            </g>

            {/* Head */}
            <g className="jugnu-head">
              <g className="jugnu-ear jugnu-ear--left">
                <circle cx="28" cy="52" r="13" fill="url(#jg-fur)" />
                <circle cx="28" cy="52" r="8"  fill="#E8A87C" />
              </g>
              <g className="jugnu-ear jugnu-ear--right">
                <circle cx="102" cy="52" r="13" fill="url(#jg-fur)" />
                <circle cx="102" cy="52" r="8"  fill="#E8A87C" />
              </g>
              <g filter="url(#jg-shadow)">
                <ellipse cx="65" cy="55" rx="35" ry="33" fill="url(#jg-fur)" />
              </g>
              <ellipse cx="65" cy="62" rx="26" ry="24" fill="url(#jg-face)" />

              {/* Cheek blush */}
              <circle cx="40" cy="70" r="7" fill="#FF9B9B" opacity={blushOpacity} />
              <circle cx="90" cy="70" r="7" fill="#FF9B9B" opacity={blushOpacity} />

              {/* Hair */}
              <path d="M 55,24 C 58,18 62,14 65,12 C 68,14 72,18 75,24 C 72,20 68,17 65,16 C 62,17 58,20 55,24Z" fill="#5C3318" />
              <path d="M 50,28 C 53,22 58,18 62,16" stroke="#5C3318" strokeWidth="3" strokeLinecap="round" />
              <path d="M 80,28 C 77,22 72,18 68,16" stroke="#5C3318" strokeWidth="3" strokeLinecap="round" />

              {/* Eyes */}
              <g>
                <ellipse cx="52" cy="55" rx="11" ry={eyeRy} fill="white" stroke="#C4A87C" strokeWidth="0.5" />
                <g ref={leftPupilRef} className="jugnu-eye-pupil">
                  <circle cx="53" cy="55" r="5.5" fill="#1a1a2e" />
                  <circle cx="55" cy="53" r="1.8" fill="white" opacity="0.9" />
                  <circle cx="51" cy="57" r="0.8" fill="white" opacity="0.5" />
                </g>
                <g className="jugnu-eyelid">
                  <ellipse cx="52" cy="55" rx="11" ry={eyeRy} fill="url(#jg-fur)" opacity="0" />
                </g>
              </g>
              <g>
                <ellipse cx="78" cy="55" rx="11" ry={eyeRy} fill="white" stroke="#C4A87C" strokeWidth="0.5" />
                <g ref={rightPupilRef} className="jugnu-eye-pupil">
                  <circle cx="79" cy="55" r="5.5" fill="#1a1a2e" />
                  <circle cx="81" cy="53" r="1.8" fill="white" opacity="0.9" />
                  <circle cx="77" cy="57" r="0.8" fill="white" opacity="0.5" />
                </g>
                <g className="jugnu-eyelid jugnu-eyelid--right">
                  <ellipse cx="78" cy="55" rx="11" ry={eyeRy} fill="url(#jg-fur)" opacity="0" />
                </g>
              </g>

              {/* Expressive eyebrows */}
              <path
                d={mouthShape === "frown" ? "M 42,44 Q 50,38 56,43" : mouthShape === "open" ? "M 42,40 Q 48,34 56,40" : "M 42,42 Q 48,38 56,42"}
                stroke="#5C3318" strokeWidth="2.2" strokeLinecap="round" fill="none"
              />
              <path
                d={mouthShape === "frown" ? "M 74,43 Q 80,38 88,44" : mouthShape === "open" ? "M 74,40 Q 82,34 88,40" : "M 74,42 Q 82,38 88,42"}
                stroke="#5C3318" strokeWidth="2.2" strokeLinecap="round" fill="none"
              />

              {/* Nose */}
              <ellipse cx="65" cy="70" rx="4" ry="3" fill="url(#jg-fur)" />
              <circle cx="62.5" cy="70.5" r="1.2" fill="#6B3A1F" />
              <circle cx="67.5" cy="70.5" r="1.2" fill="#6B3A1F" />

              {/* Mouth */}
              <path d={getMouthPath()} stroke="#6B3A1F" strokeWidth="2" strokeLinecap="round"
                fill={mouthShape === "open" ? "#6B3A1F" : "none"} />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

const Jugnu = memo(JugnuInner);
export default Jugnu;
