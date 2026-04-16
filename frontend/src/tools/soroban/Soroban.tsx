import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface RodState { upper: boolean; lower: number; }
type SetRods = React.Dispatch<React.SetStateAction<RodState[]>>;
type Friend = {
  id: string; category: string; type: string; n: number; formula: string;
  emoji: string; color: string; bg: string; funFact: string; rule: string;
  startState: RodState[]; endState: RodState[];
  watchSteps: { description: string; boardState: RodState[]; highlight: number[] }[];
  tryHint: string;
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
const rs = (upper: boolean, lower: number): RodState => ({ upper, lower });

// ─── BIG FRIENDS (sum = 10) ──────────────────────────────────────────────────
const BIG_POSITIVE = [
  { id:'bp9', category:'big', type:'positive', n:9, formula:'+9 = −1 + 10', emoji:'🚀', color:'#fb923c', bg:'rgba(251,146,60,0.13)',
    funFact:'9 planets almost! Remove 1 and blast off to TEN! 🚀',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(false,1)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: 1 bead up on the ones rod.',boardState:[rs(false,0),rs(false,1)],highlight:[1]},
      {description:'Lower that 1 bead down (−1 on ones).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on the tens rod (+10). 1 + 9 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Lower the ones bead, then push up a tens bead.' },

  { id:'bp8', category:'big', type:'positive', n:8, formula:'+8 = −2 + 10', emoji:'🎱', color:'#60a5fa', bg:'rgba(96,165,250,0.13)',
    funFact:'8 is a lucky number! Its friend 2 makes a perfect 10! 🎱',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(false,2)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: 2 beads up on ones.',boardState:[rs(false,0),rs(false,2)],highlight:[1]},
      {description:'Lower 2 beads down (−2).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on tens (+10). 2 + 8 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Lower 2 ones beads, then push up a tens bead.' },

  { id:'bp7', category:'big', type:'positive', n:7, formula:'+7 = −3 + 10', emoji:'🌈', color:'#a78bfa', bg:'rgba(167,139,250,0.13)',
    funFact:'A rainbow has 7 colours! Friend 3 makes 10 colours of magic! 🌈',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(false,3)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: 3 beads up on ones.',boardState:[rs(false,0),rs(false,3)],highlight:[1]},
      {description:'Lower 3 beads down (−3).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on tens (+10). 3 + 7 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Lower 3 ones beads, then push up the tens bead.' },

  { id:'bp6', category:'big', type:'positive', n:6, formula:'+6 = −4 + 10', emoji:'🐸', color:'#4ade80', bg:'rgba(74,222,128,0.13)',
    funFact:'6 frogs + 4 lily pads = a full pond of 10! 🐸🪷',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(false,4)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: 4 beads up on ones.',boardState:[rs(false,0),rs(false,4)],highlight:[1]},
      {description:'Lower all 4 beads down (−4).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on tens (+10). 4 + 6 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Lower all 4 ones beads, then push up the tens bead.' },

  { id:'bp5', category:'big', type:'positive', n:5, formula:'+5 = −5 + 10', emoji:'⭐', color:'#fbbf24', bg:'rgba(251,191,36,0.13)',
    funFact:'5 fingers each hand — together they make 10! ✋✋',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: heaven bead down on ones (= 5).',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Slide heaven bead back up (−5).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on tens (+10). 5 + 5 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Slide the heaven bead up, then push up the tens bead.' },

  { id:'bp4', category:'big', type:'positive', n:4, formula:'+4 = −6 + 10', emoji:'🍀', color:'#34d399', bg:'rgba(52,211,153,0.13)',
    funFact:'4-leaf clover for luck! Friend 6 makes 10! 🍀',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(true,1)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: 6 on ones (heaven + 1 earth).',boardState:[rs(false,0),rs(true,1)],highlight:[1]},
      {description:'Clear ones — slide heaven up & lower the earth bead (−6).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on tens (+10). 6 + 4 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Clear all ones beads (heaven + 1 earth), then add the tens bead.' },

  { id:'bp3', category:'big', type:'positive', n:3, formula:'+3 = −7 + 10', emoji:'🎵', color:'#f472b6', bg:'rgba(244,114,182,0.13)',
    funFact:'3 notes + 7 more = a full octave of 10! 🎵🎶',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(true,2)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: 7 on ones (heaven + 2 earth).',boardState:[rs(false,0),rs(true,2)],highlight:[1]},
      {description:'Clear ones — slide heaven up & lower 2 earth beads (−7).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on tens (+10). 7 + 3 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Clear all ones beads (heaven + 2 earth), then add the tens bead.' },

  { id:'bp2', category:'big', type:'positive', n:2, formula:'+2 = −8 + 10', emoji:'👫', color:'#e879f9', bg:'rgba(232,121,249,0.13)',
    funFact:'2 best friends + 8 more = a big group of 10! 👫',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(true,3)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: 8 on ones (heaven + 3 earth).',boardState:[rs(false,0),rs(true,3)],highlight:[1]},
      {description:'Clear ones — slide heaven up & lower 3 earth beads (−8).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on tens (+10). 8 + 2 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Clear all ones beads (heaven + 3 earth), then add the tens bead.' },

  { id:'bp1', category:'big', type:'positive', n:1, formula:'+1 = −9 + 10', emoji:'🕯️', color:'#fde68a', bg:'rgba(253,230,138,0.13)',
    funFact:'Just 1 candle + 9 more = a birthday cake of 10! 🎂',
    rule:"Can't add? Remove partner from ones, gain a TEN.",
    startState:[rs(false,0),rs(true,4)], endState:[rs(false,1),rs(false,0)],
    watchSteps:[
      {description:'Start: 9 on ones (heaven + all 4 earth).',boardState:[rs(false,0),rs(true,4)],highlight:[1]},
      {description:'Clear ones — slide heaven up & lower all 4 earth beads (−9).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 bead up on tens (+10). 9 + 1 = 10 ✓',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
    ], tryHint:'Clear all ones beads (heaven + all 4 earth), then add the tens bead.' },
];

const BIG_NEGATIVE = [
  { id:'bn9', category:'big', type:'negative', n:9, formula:'−9 = −10 + 1', emoji:'🌙', color:'#818cf8', bg:'rgba(129,140,248,0.13)',
    funFact:'Take away 9 stars? Take all 10 and put 1 back! 🌙⭐',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(false,1)],
    watchSteps:[
      {description:"Start: 10 — that's 1 bead on the tens rod.",boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Push 1 bead up on ones (+1). 10 − 9 = 1 ✓',boardState:[rs(false,0),rs(false,1)],highlight:[1]},
    ], tryHint:'Lower the tens bead, then push up 1 ones bead.' },

  { id:'bn8', category:'big', type:'negative', n:8, formula:'−8 = −10 + 2', emoji:'🐙', color:'#38bdf8', bg:'rgba(56,189,248,0.13)',
    funFact:'An octopus has 8 arms! Take 10 away, give back 2! 🐙',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(false,2)],
    watchSteps:[
      {description:'Start: 10 — 1 bead on tens.',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Push 2 beads up on ones (+2). 10 − 8 = 2 ✓',boardState:[rs(false,0),rs(false,2)],highlight:[1]},
    ], tryHint:'Lower the tens bead, then push up 2 ones beads.' },

  { id:'bn7', category:'big', type:'negative', n:7, formula:'−7 = −10 + 3', emoji:'🎲', color:'#a78bfa', bg:'rgba(167,139,250,0.13)',
    funFact:'Lucky dice show 7! Take away 10, roll back 3! 🎲',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(false,3)],
    watchSteps:[
      {description:'Start: 10 — 1 bead on tens.',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Push 3 beads up on ones (+3). 10 − 7 = 3 ✓',boardState:[rs(false,0),rs(false,3)],highlight:[1]},
    ], tryHint:'Lower the tens bead, then push up 3 ones beads.' },

  { id:'bn6', category:'big', type:'negative', n:6, formula:'−6 = −10 + 4', emoji:'🦋', color:'#4ade80', bg:'rgba(74,222,128,0.13)',
    funFact:'A butterfly has 6 legs! Take 10, give back 4! 🦋',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(false,4)],
    watchSteps:[
      {description:'Start: 10 — 1 bead on tens.',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Push all 4 beads up on ones (+4). 10 − 6 = 4 ✓',boardState:[rs(false,0),rs(false,4)],highlight:[1]},
    ], tryHint:'Lower the tens bead, then push up all 4 ones beads.' },

  { id:'bn5', category:'big', type:'negative', n:5, formula:'−5 = −10 + 5', emoji:'🖐️', color:'#fbbf24', bg:'rgba(251,191,36,0.13)',
    funFact:'Half of 10 fingers! Take 10 away, give back a whole hand! 🖐️',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 10 — 1 bead on tens.',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Push heaven bead down on ones (+5). 10 − 5 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower the tens bead, then push the heaven bead down on ones.' },

  { id:'bn4', category:'big', type:'negative', n:4, formula:'−4 = −10 + 6', emoji:'🍕', color:'#fb923c', bg:'rgba(251,146,60,0.13)',
    funFact:'4 pizza slices! Take 10, give back 6! 🍕',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(true,1)],
    watchSteps:[
      {description:'Start: 10 — 1 bead on tens.',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Heaven down + 1 earth up on ones (+6). 10 − 4 = 6 ✓',boardState:[rs(false,0),rs(true,1)],highlight:[1]},
    ], tryHint:'Lower tens bead, then set ones to 6 (heaven down + 1 earth up).' },

  { id:'bn3', category:'big', type:'negative', n:3, formula:'−3 = −10 + 7', emoji:'🎈', color:'#f472b6', bg:'rgba(244,114,182,0.13)',
    funFact:'3 birthday balloons! Take 10 away, float back 7! 🎈',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(true,2)],
    watchSteps:[
      {description:'Start: 10 — 1 bead on tens.',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Heaven down + 2 earth up on ones (+7). 10 − 3 = 7 ✓',boardState:[rs(false,0),rs(true,2)],highlight:[1]},
    ], tryHint:'Lower tens bead, then set ones to 7 (heaven down + 2 earth up).' },

  { id:'bn2', category:'big', type:'negative', n:2, formula:'−2 = −10 + 8', emoji:'🦆', color:'#60a5fa', bg:'rgba(96,165,250,0.13)',
    funFact:'2 little ducks! Take 10 away, waddle back 8! 🦆🦆',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(true,3)],
    watchSteps:[
      {description:'Start: 10 — 1 bead on tens.',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Heaven down + 3 earth up on ones (+8). 10 − 2 = 8 ✓',boardState:[rs(false,0),rs(true,3)],highlight:[1]},
    ], tryHint:'Lower tens bead, then set ones to 8 (heaven down + 3 earth up).' },

  { id:'bn1', category:'big', type:'negative', n:1, formula:'−1 = −10 + 9', emoji:'🌱', color:'#86efac', bg:'rgba(134,239,172,0.13)',
    funFact:'Just 1 seed! Take 10, grow back 9! 🌱🌿',
    rule:"Can't subtract? Remove a TEN, add the partner back to ones.",
    startState:[rs(false,1),rs(false,0)], endState:[rs(false,0),rs(true,4)],
    watchSteps:[
      {description:'Start: 10 — 1 bead on tens.',boardState:[rs(false,1),rs(false,0)],highlight:[0]},
      {description:'Lower the tens bead (−10).',boardState:[rs(false,0),rs(false,0)],highlight:[0]},
      {description:'Heaven down + all 4 earth up on ones (+9). 10 − 1 = 9 ✓',boardState:[rs(false,0),rs(true,4)],highlight:[1]},
    ], tryHint:'Lower tens bead, then set ones to 9 (heaven down + all 4 earth up).' },
];

// ─── SMALL FRIENDS (sum = 5) ─────────────────────────────────────────────────
const SMALL_POSITIVE = [
  { id:'sp4', category:'small', type:'positive', n:4, formula:'+4 = −1 + 5', emoji:'🌸', color:'#f9a8d4', bg:'rgba(249,168,212,0.13)',
    funFact:'4 petals + 1 more = a whole flower of 5! 🌸',
    rule:"Can't add? Remove partner from ones, gain a FIVE (heaven bead).",
    startState:[rs(false,0),rs(false,1)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 1 bead up on ones.',boardState:[rs(false,0),rs(false,1)],highlight:[1]},
      {description:'Lower that 1 bead (−1 on ones).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push the heaven bead down (+5). 1 + 4 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower the ones bead, then push the heaven bead down.' },

  { id:'sp3', category:'small', type:'positive', n:3, formula:'+3 = −2 + 5', emoji:'🍭', color:'#c084fc', bg:'rgba(192,132,252,0.13)',
    funFact:'3 lollipops + 2 more = a bag of 5! 🍭',
    rule:"Can't add? Remove partner from ones, gain a FIVE (heaven bead).",
    startState:[rs(false,0),rs(false,2)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 2 beads up on ones.',boardState:[rs(false,0),rs(false,2)],highlight:[1]},
      {description:'Lower 2 beads (−2).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push the heaven bead down (+5). 2 + 3 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower 2 ones beads, then push the heaven bead down.' },

  { id:'sp2', category:'small', type:'positive', n:2, formula:'+2 = −3 + 5', emoji:'🐣', color:'#fcd34d', bg:'rgba(252,211,77,0.13)',
    funFact:'2 chicks + 3 more = a nest of 5! 🐣',
    rule:"Can't add? Remove partner from ones, gain a FIVE (heaven bead).",
    startState:[rs(false,0),rs(false,3)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 3 beads up on ones.',boardState:[rs(false,0),rs(false,3)],highlight:[1]},
      {description:'Lower 3 beads (−3).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push the heaven bead down (+5). 3 + 2 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower 3 ones beads, then push the heaven bead down.' },

  { id:'sp1', category:'small', type:'positive', n:1, formula:'+1 = −4 + 5', emoji:'🌟', color:'#facc15', bg:'rgba(250,204,21,0.13)',
    funFact:'1 star + 4 more = a constellation of 5! 🌟',
    rule:"Can't add? Remove partner from ones, gain a FIVE (heaven bead).",
    startState:[rs(false,0),rs(false,4)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 4 beads up on ones.',boardState:[rs(false,0),rs(false,4)],highlight:[1]},
      {description:'Lower all 4 beads (−4).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push the heaven bead down (+5). 4 + 1 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower all 4 ones beads, then push the heaven bead down.' },
];

const SMALL_NEGATIVE = [
  { id:'sn4', category:'small', type:'negative', n:4, formula:'−4 = −5 + 1', emoji:'🌺', color:'#fb7185', bg:'rgba(251,113,133,0.13)',
    funFact:'4 petals fall off — lose the flower (5), keep 1 bud! 🌺',
    rule:"Can't subtract? Remove a FIVE (heaven bead), add the partner back.",
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,0),rs(false,1)],
    watchSteps:[
      {description:'Start: heaven bead down on ones (= 5).',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Slide heaven bead back up (−5).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 1 earth bead up (+1). 5 − 4 = 1 ✓',boardState:[rs(false,0),rs(false,1)],highlight:[1]},
    ], tryHint:'Slide the heaven bead up, then push up 1 ones bead.' },

  { id:'sn3', category:'small', type:'negative', n:3, formula:'−3 = −5 + 2', emoji:'🍦', color:'#e879f9', bg:'rgba(232,121,249,0.13)',
    funFact:'3 scoops fall off! Lose the cone (5), eat 2 scoops! 🍦',
    rule:"Can't subtract? Remove a FIVE (heaven bead), add the partner back.",
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,0),rs(false,2)],
    watchSteps:[
      {description:'Start: heaven bead down on ones (= 5).',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Slide heaven bead back up (−5).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 2 earth beads up (+2). 5 − 3 = 2 ✓',boardState:[rs(false,0),rs(false,2)],highlight:[1]},
    ], tryHint:'Slide the heaven bead up, then push up 2 ones beads.' },

  { id:'sn2', category:'small', type:'negative', n:2, formula:'−2 = −5 + 3', emoji:'🐟', color:'#38bdf8', bg:'rgba(56,189,248,0.13)',
    funFact:'2 fish swim away! Lose the school (5), keep 3! 🐟🐟',
    rule:"Can't subtract? Remove a FIVE (heaven bead), add the partner back.",
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,0),rs(false,3)],
    watchSteps:[
      {description:'Start: heaven bead down on ones (= 5).',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Slide heaven bead back up (−5).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push 3 earth beads up (+3). 5 − 2 = 3 ✓',boardState:[rs(false,0),rs(false,3)],highlight:[1]},
    ], tryHint:'Slide the heaven bead up, then push up 3 ones beads.' },

  { id:'sn1', category:'small', type:'negative', n:1, formula:'−1 = −5 + 4', emoji:'🍃', color:'#4ade80', bg:'rgba(74,222,128,0.13)',
    funFact:'1 leaf blows away! Lose the branch (5), keep 4! 🍃',
    rule:"Can't subtract? Remove a FIVE (heaven bead), add the partner back.",
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,0),rs(false,4)],
    watchSteps:[
      {description:'Start: heaven bead down on ones (= 5).',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Slide heaven bead back up (−5).',boardState:[rs(false,0),rs(false,0)],highlight:[1]},
      {description:'Push all 4 earth beads up (+4). 5 − 1 = 4 ✓',boardState:[rs(false,0),rs(false,4)],highlight:[1]},
    ], tryHint:'Slide the heaven bead up, then push up all 4 ones beads.' },
];

// ─── MIX FRIENDS ────────────────────────────────────────────────────────────
const MIX_POSITIVE = [
  { id:'mp9', category:'mix', type:'positive', n:9, formula:'+9 = +4 − 5 + 10', emoji:'🦁', color:'#f59e0b', bg:'rgba(245,158,11,0.13)',
    funFact:'The lion king of tricks! Use BOTH Small AND Big friends! 🦁',
    rule:'Two moves: push ones up (Small), slide heaven up, then gain a TEN (Big).',
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,1),rs(false,4)],
    watchSteps:[
      {description:'Start: 5 on ones (heaven bead down). We need to add 9.',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Step 1 — push all 4 earth beads up on ones (+4). Ones = 9.',boardState:[rs(false,0),rs(true,4)],highlight:[1]},
      {description:'Step 2 — slide heaven bead up on ones (−5). Ones = 4.',boardState:[rs(false,0),rs(false,4)],highlight:[1]},
      {description:'Step 3 — push 1 bead up on tens (+10). 5 + 9 = 14 ✓',boardState:[rs(false,1),rs(false,4)],highlight:[0]},
    ], tryHint:'Push 4 earth beads up, then slide heaven up, then push a tens bead up.' },

  { id:'mp8', category:'mix', type:'positive', n:8, formula:'+8 = +3 − 5 + 10', emoji:'🐯', color:'#f97316', bg:'rgba(249,115,22,0.13)',
    funFact:'The tiger is fast — two moves become one! 🐯',
    rule:'Two moves: push ones up (Small), slide heaven up, then gain a TEN (Big).',
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,1),rs(false,3)],
    watchSteps:[
      {description:'Start: 5 on ones (heaven bead down). We need to add 8.',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Step 1 — push 3 earth beads up on ones (+3). Ones = 8.',boardState:[rs(false,0),rs(true,3)],highlight:[1]},
      {description:'Step 2 — slide heaven bead up (−5). Ones = 3.',boardState:[rs(false,0),rs(false,3)],highlight:[1]},
      {description:'Step 3 — push 1 bead up on tens (+10). 5 + 8 = 13 ✓',boardState:[rs(false,1),rs(false,3)],highlight:[0]},
    ], tryHint:'Push 3 earth beads up, then slide heaven up, then push a tens bead up.' },

  { id:'mp7', category:'mix', type:'positive', n:7, formula:'+7 = +2 − 5 + 10', emoji:'🐺', color:'#8b5cf6', bg:'rgba(139,92,246,0.13)',
    funFact:'Clever as a wolf — combine your friend tricks! 🐺',
    rule:'Two moves: push ones up (Small), slide heaven up, then gain a TEN (Big).',
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,1),rs(false,2)],
    watchSteps:[
      {description:'Start: 5 on ones (heaven bead down). We need to add 7.',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Step 1 — push 2 earth beads up on ones (+2). Ones = 7.',boardState:[rs(false,0),rs(true,2)],highlight:[1]},
      {description:'Step 2 — slide heaven bead up (−5). Ones = 2.',boardState:[rs(false,0),rs(false,2)],highlight:[1]},
      {description:'Step 3 — push 1 bead up on tens (+10). 5 + 7 = 12 ✓',boardState:[rs(false,1),rs(false,2)],highlight:[0]},
    ], tryHint:'Push 2 earth beads up, then slide heaven up, then push a tens bead up.' },

  { id:'mp6', category:'mix', type:'positive', n:6, formula:'+6 = +1 − 5 + 10', emoji:'🦊', color:'#ef4444', bg:'rgba(239,68,68,0.13)',
    funFact:'Sly fox uses two tricks at once! 🦊',
    rule:'Two moves: push ones up (Small), slide heaven up, then gain a TEN (Big).',
    startState:[rs(false,0),rs(true,0)], endState:[rs(false,1),rs(false,1)],
    watchSteps:[
      {description:'Start: 5 on ones (heaven bead down). We need to add 6.',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
      {description:'Step 1 — push 1 earth bead up on ones (+1). Ones = 6.',boardState:[rs(false,0),rs(true,1)],highlight:[1]},
      {description:'Step 2 — slide heaven bead up (−5). Ones = 1.',boardState:[rs(false,0),rs(false,1)],highlight:[1]},
      {description:'Step 3 — push 1 bead up on tens (+10). 5 + 6 = 11 ✓',boardState:[rs(false,1),rs(false,1)],highlight:[0]},
    ], tryHint:'Push 1 earth bead up, then slide heaven up, then push a tens bead up.' },
];

const MIX_NEGATIVE = [
  { id:'mn9', category:'mix', type:'negative', n:9, formula:'−9 = −10 + 5 − 4', emoji:'🦅', color:'#64748b', bg:'rgba(100,116,139,0.13)',
    funFact:'The eagle swoops in two sharp moves! 🦅',
    rule:'Two moves: remove a TEN (Big), then gain FIVE and remove ones (Small).',
    startState:[rs(false,1),rs(false,4)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 14 on the board (tens=1, ones=4). We need −9.',boardState:[rs(false,1),rs(false,4)],highlight:[0,1]},
      {description:'Step 1 — lower the tens bead (−10). Board = 4.',boardState:[rs(false,0),rs(false,4)],highlight:[0]},
      {description:'Step 2 — push heaven bead down on ones (+5). Board = 9.',boardState:[rs(false,0),rs(true,4)],highlight:[1]},
      {description:'Step 3 — lower all 4 earth beads (−4). Board = 5. 14 − 9 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower tens bead (−10), push heaven down (+5), then lower all 4 earth beads (−4).' },

  { id:'mn8', category:'mix', type:'negative', n:8, formula:'−8 = −10 + 5 − 3', emoji:'🦉', color:'#7c3aed', bg:'rgba(124,58,237,0.13)',
    funFact:'The wise owl breaks hard problems into easy parts! 🦉',
    rule:'Two moves: remove a TEN (Big), then gain FIVE and remove ones (Small).',
    startState:[rs(false,1),rs(false,3)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 13 (tens=1, ones=3). We need −8.',boardState:[rs(false,1),rs(false,3)],highlight:[0,1]},
      {description:'Step 1 — lower the tens bead (−10). Board = 3.',boardState:[rs(false,0),rs(false,3)],highlight:[0]},
      {description:'Step 2 — push heaven bead down (+5). Board = 8.',boardState:[rs(false,0),rs(true,3)],highlight:[1]},
      {description:'Step 3 — lower 3 earth beads (−3). Board = 5. 13 − 8 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower tens (−10), push heaven down (+5), then lower 3 earth beads (−3).' },

  { id:'mn7', category:'mix', type:'negative', n:7, formula:'−7 = −10 + 5 − 2', emoji:'🦚', color:'#0891b2', bg:'rgba(8,145,178,0.13)',
    funFact:'Peacock shows off two beautiful moves! 🦚',
    rule:'Two moves: remove a TEN (Big), then gain FIVE and remove ones (Small).',
    startState:[rs(false,1),rs(false,2)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 12 (tens=1, ones=2). We need −7.',boardState:[rs(false,1),rs(false,2)],highlight:[0,1]},
      {description:'Step 1 — lower the tens bead (−10). Board = 2.',boardState:[rs(false,0),rs(false,2)],highlight:[0]},
      {description:'Step 2 — push heaven bead down (+5). Board = 7.',boardState:[rs(false,0),rs(true,2)],highlight:[1]},
      {description:'Step 3 — lower 2 earth beads (−2). Board = 5. 12 − 7 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower tens (−10), push heaven down (+5), then lower 2 earth beads (−2).' },

  { id:'mn6', category:'mix', type:'negative', n:6, formula:'−6 = −10 + 5 − 1', emoji:'🦜', color:'#059669', bg:'rgba(5,150,105,0.13)',
    funFact:'The clever parrot repeats the trick perfectly! 🦜',
    rule:'Two moves: remove a TEN (Big), then gain FIVE and remove ones (Small).',
    startState:[rs(false,1),rs(false,1)], endState:[rs(false,0),rs(true,0)],
    watchSteps:[
      {description:'Start: 11 (tens=1, ones=1). We need −6.',boardState:[rs(false,1),rs(false,1)],highlight:[0,1]},
      {description:'Step 1 — lower the tens bead (−10). Board = 1.',boardState:[rs(false,0),rs(false,1)],highlight:[0]},
      {description:'Step 2 — push heaven bead down (+5). Board = 6.',boardState:[rs(false,0),rs(true,1)],highlight:[1]},
      {description:'Step 3 — lower 1 earth bead (−1). Board = 5. 11 − 6 = 5 ✓',boardState:[rs(false,0),rs(true,0)],highlight:[1]},
    ], tryHint:'Lower tens (−10), push heaven down (+5), then lower 1 earth bead (−1).' },
];

const ALL_FRIENDS = [...BIG_POSITIVE, ...BIG_NEGATIVE, ...SMALL_POSITIVE, ...SMALL_NEGATIVE, ...MIX_POSITIVE, ...MIX_NEGATIVE];

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
function getLayout(n: number) {
  const bw = n<=7?42:n<=10?38:n<=13?34:n<=16?30:26;
  const gap = n<=7?16:n<=10?13:n<=13?11:n<=16?9:7;
  const sp = bw+gap, px = 52;
  return { bw, sp, px, w: px*2+(n-1)*sp+bw };
}
const TOP_H=32, UPPER_H=68, DIV_H=16, LOWER_H=128, BOT_H=32;
const BEAD_H=24, BEAD_RX=12;
const DIV_Y=TOP_H+UPPER_H;
const TOTAL_H=TOP_H+UPPER_H+DIV_H+LOWER_H+BOT_H;
const HB_REST=TOP_H+5, HB_ACT=DIV_Y-BEAD_H-3;
const EB_ACT_Y0=DIV_Y+DIV_H+3, EB_RST_Y3=DIV_Y+DIV_H+LOWER_H-BEAD_H-4;

function targetEarthY(bi: number, cnt: number) {
  if (bi < cnt) return EB_ACT_Y0 + bi*BEAD_H;
  const ri = bi-cnt, tr = 4-cnt;
  return EB_RST_Y3 - (tr-1-ri)*BEAD_H;
}

// ─── SOROBAN LOGIC ───────────────────────────────────────────────────────────
function rv(r: RodState) { return (r.upper ? 5 : 0) + r.lower; }
function computeValue(rods: RodState[], mode: string) {
  const n = rods.length;
  if (mode === 'positional') return rods.reduce((s,r,i) => s + rv(r)*Math.pow(10,n-i-1), 0);
  let total=0, lp=1;
  for (let i=n-1; i>=0; i--) {
    const e=n-i-1, dot=e===0||e%3===0;
    if (dot) lp=1;
    total += rv(rods[i])*lp;
    lp = dot ? 10 : lp*10;
  }
  return total;
}
const POS: Record<number, string> = {0:'1',1:'10',2:'100',3:'1K',4:'10K',5:'100K',6:'1M',7:'10M',8:'100M',9:'1B'};
function placeLabel(i: number, n: number, mode: string) {
  if (mode === 'positional') return POS[n-i-1] || ('e'+(n-i-1));
  let lp=1;
  for (let j=n-1; j>=0; j--) {
    const e=n-j-1, dot=e===0||e%3===0;
    if (dot) lp=1;
    if (j===i) return POS[Math.round(Math.log10(lp))] || String(lp);
    lp = dot ? 10 : lp*10;
  }
  return '1';
}
function dotColor(i: number, n: number) { const e=n-i-1; if(e===0)return'red'; if(e%3===0)return'blue'; return null; }
function emptyRods(n: number): RodState[] { return Array.from({length:n}, ()=>({upper:false,lower:0})); }
function bk(rod: number, bead: number) { return rod*5+bead; }

// ─── SPRING HOOK ─────────────────────────────────────────────────────────────
//
// Root-cause of the freeze:
//   actR.current is a boolean gate — "is the RAF loop running?"
//   When the loop finishes (all springs settled) it sets actR = false.
//   But there is a race: if rods change WHILE the last tick is in-flight,
//   useEffect fires, sees actR===true, skips starting a new loop.
//   The in-flight tick then ends, sets actR=false — but never re-reads
//   the new targets. No further ticks run. Beads freeze at old positions
//   while logical state (color, value) already updated.
//
// Fix: never use a boolean gate. Instead use a "generation" counter.
//   Each time rods change, cancel the old RAF and start a fresh loop.
//   The loop carries its generation ID; if it doesn't match the current
//   generation it exits immediately (stale). This eliminates the race
//   entirely — there is always exactly one live loop per rods change.
//
function useBeadSprings(rods: RodState[]) {
  // animY maps spring key → current Y pixel position (used by renderer)
  const [animY, setAnimY] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    rods.forEach((r, i) => {
      m[bk(i, 0)] = r.upper ? HB_ACT : HB_REST;
      [0, 1, 2, 3].forEach(bi => { m[bk(i, bi + 1)] = targetEarthY(bi, r.lower); });
    });
    return m;
  });

  // spR: the spring state objects (mutated in-place by the RAF loop)
  const spR  = useRef<Record<string, { y: number; vy: number; target: number }>>({});
  // rafR: the current requestAnimationFrame handle (so we can cancel)
  const rafR = useRef(0);
  // genR: monotonically-increasing generation counter
  //   incremented on every rods change, passed into the loop closure.
  //   A tick that carries an old generation exits without scheduling next.
  const genR = useRef(0);

  useEffect(() => {
    const sp = spR.current;

    // 1. Synchronise spring targets to new rod state
    rods.forEach((r, i) => {
      const hk = bk(i, 0);
      const hT = r.upper ? HB_ACT : HB_REST;
      if (hk in sp) {
        sp[hk].target = hT;            // spring already exists — update target only
      } else {
        sp[hk] = { y: hT, vy: 0, target: hT }; // brand new spring — start at target (no snap)
      }
      [0, 1, 2, 3].forEach(bi => {
        const ek = bk(i, bi + 1);
        const eT = targetEarthY(bi, r.lower);
        if (ek in sp) {
          sp[ek].target = eT;
        } else {
          sp[ek] = { y: eT, vy: 0, target: eT };
        }
      });
    });

    // 2. Prune springs for rods that no longer exist (rod count change)
    const n = rods.length;
    Object.keys(sp).forEach(k => {
      if (Math.floor(Number(k) / 5) >= n) delete sp[Number(k)];
    });

    // 3. Cancel any in-flight loop and start a fresh one for this generation
    cancelAnimationFrame(rafR.current);
    const myGen = ++genR.current;

    let last = performance.now();

    function tick(now: number) {
      // Stale-loop guard: if a newer generation has started, stop immediately
      if (myGen !== genR.current) return;

      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;

      let anyMoving = false;
      const s2 = spR.current;

      Object.keys(s2).forEach(k => {
        const s  = s2[k];
        const bi = Number(k) % 5;
        // Spring constants: heaven bead slightly softer than earth beads
        const stiff = bi === 0 ? 280 : 320;
        const damp  = bi === 0 ? 22  : 26;
        const f = -stiff * (s.y - s.target) - damp * s.vy;
        s.vy += f * dt;
        s.y  += s.vy * dt;
        if (Math.abs(s.y - s.target) > 0.05 || Math.abs(s.vy) > 0.05) anyMoving = true;
      });

      // Publish positions to React state using a functional update so we
      // merge into the previous map rather than replacing it entirely.
      // This avoids thrashing unrelated keys and reduces render cost.
      setAnimY(prev => {
        const next = { ...prev };
        Object.keys(s2).forEach(k => { next[Number(k)] = s2[k].y; });
        return next;
      });

      if (anyMoving) {
        rafR.current = requestAnimationFrame(tick);
      }
      // When done, we simply don't schedule another frame.
      // genR is NOT reset — the next rods change will increment it and
      // start a new loop. No boolean gate, no race.
    }

    rafR.current = requestAnimationFrame(tick);

    // Cleanup: cancel the loop if the component unmounts mid-animation
    return () => cancelAnimationFrame(rafR.current);
  }, [rods]); // eslint-disable-line react-hooks/exhaustive-deps

  return animY;
}

// ─── SOUND HOOK ──────────────────────────────────────────────────────────────
function useSound() {
  const [enabled, setEnabled] = useState(true);
  const cR = useRef<AudioContext | null>(null);
  function gc(): AudioContext {
    if (!cR.current) cR.current = new AudioContext();
    if (cR.current.state === 'suspended') cR.current.resume();
    return cR.current!;
  }
  // Eagerly create AudioContext so it can resume before first sweep
  useEffect(() => { gc(); }, []); // eslint-disable-line
  const play = useCallback((isH: boolean) => {
    if (!enabled) return;
    try {
      const ctx=gc();
      if (ctx.state !== 'running') return; // browser hasn't unlocked AudioContext yet
      const t=ctx.currentTime, bl=ctx.sampleRate*0.08;
      const buf=ctx.createBuffer(1,bl,ctx.sampleRate), d=buf.getChannelData(0);
      for (let i=0;i<bl;i++) d[i]=Math.random()*2-1;
      const n=ctx.createBufferSource(); n.buffer=buf;
      const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=isH?820:1100; bp.Q.value=isH?3.5:4.2;
      const env=ctx.createGain(), pk=isH?0.55:0.42;
      env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(pk,t+0.004); env.gain.exponentialRampToValueAtTime(0.001,t+(isH?0.072:0.052));
      const osc=ctx.createOscillator(); osc.type='sine'; osc.frequency.value=isH?180:240; osc.frequency.exponentialRampToValueAtTime(isH?80:110,t+0.05);
      const oe=ctx.createGain(); oe.gain.setValueAtTime(isH?0.22:0.15,t); oe.gain.exponentialRampToValueAtTime(0.001,t+0.06);
      n.connect(bp); bp.connect(env); env.connect(ctx.destination);
      osc.connect(oe); oe.connect(ctx.destination);
      n.start(t); n.stop(t+0.1); osc.start(t); osc.stop(t+0.08);
    } catch(_) {}
  }, [enabled]);
  const playSuccess = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx=gc();
      if (ctx.state !== 'running') return;
      const t=ctx.currentTime;
      [523,659,784,1047].forEach((f,i) => {
        const o=ctx.createOscillator(), e=ctx.createGain();
        o.type='sine'; o.frequency.value=f;
        e.gain.setValueAtTime(0,t+i*0.12); e.gain.linearRampToValueAtTime(0.22,t+i*0.12+0.01); e.gain.exponentialRampToValueAtTime(0.001,t+i*0.12+0.22);
        o.connect(e); e.connect(ctx.destination); o.start(t+i*0.12); o.stop(t+i*0.12+0.25);
      });
    } catch(_) {}
  }, [enabled]);
  const playSwipe = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx=gc();
      if (ctx.state !== 'running') return;
      const t=ctx.currentTime, bl=Math.floor(ctx.sampleRate*0.55);
      const buf=ctx.createBuffer(1,bl,ctx.sampleRate), d=buf.getChannelData(0);
      for (let i=0;i<bl;i++) d[i]=Math.random()*2-1;
      const s=ctx.createBufferSource(); s.buffer=buf;
      const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(800,t); lp.frequency.linearRampToValueAtTime(2800,t+0.45);
      const e=ctx.createGain(); e.gain.setValueAtTime(0,t); e.gain.linearRampToValueAtTime(0.18,t+0.05); e.gain.linearRampToValueAtTime(0.12,t+0.38); e.gain.exponentialRampToValueAtTime(0.001,t+0.55);
      s.connect(lp); lp.connect(e); e.connect(ctx.destination); s.start(t);
    } catch(_) {}
  }, [enabled]);
  const playTink = useCallback((ri: number) => {
    if (!enabled) return;
    try {
      const ctx=gc();
      if (ctx.state !== 'running') return;
      const t=ctx.currentTime+0.012, bf=1400+ri*28;
      const tk=ctx.createOscillator(); tk.type='sine'; tk.frequency.setValueAtTime(bf,t); tk.frequency.exponentialRampToValueAtTime(bf*0.6,t+0.06);
      const te=ctx.createGain(); te.gain.setValueAtTime(0,t); te.gain.linearRampToValueAtTime(0.12,t+0.004); te.gain.exponentialRampToValueAtTime(0.001,t+0.07);
      tk.connect(te); te.connect(ctx.destination); tk.start(t); tk.stop(t+0.08);
    } catch(_) {}
  }, [enabled]);
  return { enabled, setEnabled, play, playSuccess, playSwipe, playTink };
}

// ─── SWEEP HOOK ──────────────────────────────────────────────────────────────
function useSweep(setRods: SetRods, playSwipe: () => void, playTink: (ri: number) => void) {
  const tR = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancel = useCallback(() => { tR.current.forEach(clearTimeout); tR.current = []; }, []);
  const sweep = useCallback((n: number, onDone?: () => void) => {
    cancel();
    setRods(Array.from({length:n}, ()=>({upper:true,lower:4})));
    const STG = Math.max(28, Math.min(48, 380/n));
    playSwipe();
    for (let i=0; i<n; i++) {
      const t = setTimeout(() => {
        setRods(p => { const nx=[...p]; nx[i]={upper:false,lower:0}; return nx; });
        playTink(i);
        if (i===n-1 && onDone) setTimeout(onDone, 120);
      }, 80+i*STG);
      tR.current.push(t);
    }
  }, [cancel, setRods, playSwipe, playTink]);
  useEffect(() => () => cancel(), [cancel]);
  return sweep;
}

// ─── TUTORIAL STATE MACHINE ──────────────────────────────────────────────────
const GAP_BEFORE_MS = 700;
const GAP_AFTER_WATCH_MS = 1000;
const GAP_AFTER_TRY_MS = 600;
const WATCH_STEP_MS = 2000;

function useTutorial(setRods: SetRods, playSuccess: () => void, rodCount: number) {
  const [active, setActive] = useState(false);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [phase, setPhase] = useState('intro');
  const [watchIdx, setWatchIdx] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [celebKey, setCelebKey] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const friend = ALL_FRIENDS.find(f => f.id === friendId) || null;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const applyState = useCallback((state: RodState[]) => {
    setRods(prev => {
      const next = [...prev];
      state.forEach((s, ti) => {
        const ai = ti===0 ? rodCount-2 : rodCount-1;
        if (ai >= 0) next[ai] = { ...s };
      });
      return next;
    });
  }, [setRods, rodCount]);

  // runWatch — takes a friend snapshot to avoid stale closure
  const runWatch = useCallback((f: Friend, fromIdx: number) => {
    const steps = f.watchSteps;
    let i = fromIdx;
    const run = () => {
      if (i >= steps.length) {
        const t = setTimeout(() => setPhase('gap-after-watch'), GAP_AFTER_WATCH_MS);
        timersRef.current.push(t);
        return;
      }
      applyState(steps[i].boardState);
      setWatchIdx(i);
      i++;
      const t = setTimeout(run, WATCH_STEP_MS);
      timersRef.current.push(t);
    };
    run();
  }, [applyState]);

  const startFriend = useCallback((id: string) => {
    clearTimers();
    const f = ALL_FRIENDS.find(x => x.id === id);
    if (!f) return;
    setFriendId(id);
    setPhase('intro');
    setWatchIdx(0);
    setActive(true);
    const t = setTimeout(() => applyState(f.startState), 300);
    timersRef.current.push(t);
  }, [clearTimers, applyState]);

  const beginWatch = useCallback(() => {
    if (!friend) return;
    clearTimers();
    const snap = friend; // capture snapshot
    setPhase('gap-before');
    applyState(snap.startState);
    const t = setTimeout(() => {
      setPhase('watching');
      setWatchIdx(0);
      runWatch(snap, 0);
    }, GAP_BEFORE_MS);
    timersRef.current.push(t);
  }, [friend, clearTimers, applyState, runWatch]);

  const watchAgain = useCallback(() => {
    if (!friend) return;
    clearTimers();
    const snap = friend;
    setPhase('gap-before');
    applyState(snap.startState);
    const t = setTimeout(() => {
      setPhase('watching');
      setWatchIdx(0);
      runWatch(snap, 0);
    }, GAP_BEFORE_MS);
    timersRef.current.push(t);
  }, [friend, clearTimers, applyState, runWatch]);

  const beginTry = useCallback(() => {
    if (!friend) return;
    clearTimers();
    const snap = friend;
    setPhase('gap-before');
    const t1 = setTimeout(() => {
      applyState(snap.startState);
      const t2 = setTimeout(() => setPhase('try'), 400);
      timersRef.current.push(t2);
    }, GAP_BEFORE_MS);
    timersRef.current.push(t1);
  }, [friend, clearTimers, applyState]);

  const checkMove = useCallback((changedIdx: number, newState: RodState, allRods: RodState[]) => {
    if (phase !== 'try' || !friend) return;
    const match = friend.endState.every((es, ti) => {
      const ai = ti===0 ? rodCount-2 : rodCount-1;
      const actual = ai===changedIdx ? newState : allRods[ai];
      if (!actual) return false;
      return actual.upper === es.upper && actual.lower === es.lower;
    });
    if (match) {
      clearTimers();
      setPhase('gap-after-try');
      const t = setTimeout(() => {
        setPhase('success');
        playSuccess();
        setCelebKey(k => k+1);
        setCompleted(prev => prev.includes(friend.id) ? prev : [...prev, friend.id]);
      }, GAP_AFTER_TRY_MS);
      timersRef.current.push(t);
    }
  }, [phase, friend, rodCount, playSuccess, clearTimers]);

  const exit = useCallback(() => {
    clearTimers();
    setActive(false);
    setFriendId(null);
    setPhase('intro');
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { active, friend, phase, watchIdx, completed, celebKey, startFriend, beginWatch, watchAgain, beginTry, checkMove, exit };
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function Soroban() {
  const [rodCount, setRodCount] = useState(9);
  const [mode, setMode] = useState('positional');
  const [rods, setRods] = useState(() => emptyRods(9));
  const [cfgOpen, setCfgOpen] = useState(false);
  const [showValue, setShowValue] = useState(true);
  const [tutOpen, setTutOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { enabled:soundOn, setEnabled:setSoundOn, play, playSuccess, playSwipe, playTink } = useSound();
  const sweep = useSweep(setRods, playSwipe, playTink);
  const tut = useTutorial(setRods, playSuccess, rodCount);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    setTimeout(() => sweep(rodCount), 320);
  }, []); // eslint-disable-line

  const prevRC = useRef(rodCount);
  useEffect(() => {
    if (!mountedRef.current) return;
    const prev = prevRC.current; prevRC.current = rodCount;
    setRods(p => rodCount > p.length ? [...emptyRods(rodCount-p.length), ...p] : p.slice(p.length-rodCount));
    if (prev !== rodCount) {
      const t = setTimeout(() => sweep(rodCount), 60);
      return () => clearTimeout(t);
    }
  }, [rodCount]); // eslint-disable-line

  // Extract only the primitives needed so patch() isn't recreated on every tut state change
  const tutActive   = tut.active;
  const tutPhaseRef = useRef(tut.phase);
  tutPhaseRef.current = tut.phase;
  const tutCheckMove = tut.checkMove;

  const patch = useCallback((i: number, p: Partial<RodState>) => {
    setRods(prev => {
      const next = [...prev];
      const ns = { ...next[i], ...p };
      next[i] = ns;
      if (tutActive && tutPhaseRef.current === 'try') tutCheckMove(i, ns, next);
      return next;
    });
  }, [tutActive, tutCheckMove]);

  const reset = useCallback(() => sweep(rodCount), [sweep, rodCount]);
  const layout = useMemo(() => getLayout(rodCount), [rodCount]);
  const value  = useMemo(() => computeValue(rods, mode), [rods, mode]);
  const animY  = useBeadSprings(rods);

  const closeAll = useCallback(() => { setCfgOpen(false); setTutOpen(false); setPracticeOpen(false); }, []);

  const toggleFullscreen = useCallback(async () => {
    const fs = await import("@/lib/fullscreen");
    if (!fs.isFullscreen()) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      await fs.enterFullscreen();
    } else {
      await fs.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        toggleFullscreen();
      }
    };
    const handleFsChange = async () => {
      const fs = await import("@/lib/fullscreen");
      const entering = fs.isFullscreen();
      setIsFullscreen(entering);
      document.body.style.overflow = entering ? 'hidden' : '';
      if (entering) { setCfgOpen(false); setGuideOpen(false); setTutOpen(false); setPracticeOpen(false); }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [toggleFullscreen]);

  // highlighted rods for tutorial
  let hiRods: number[] = [];
  if (tut.active && tut.friend) {
    if (tut.phase === 'watching') {
      hiRods = (tut.friend.watchSteps[tut.watchIdx]?.highlight || []).map(r => r===0 ? rodCount-2 : rodCount-1);
    } else if (tut.phase === 'try' || tut.phase === 'gap-before') {
      hiRods = [rodCount-2, rodCount-1];
    }
  }

  return (
    <div className={isFullscreen ? 'app app-fs' : 'app'}>
      <div className="ambient" aria-hidden>
        <div className="amb-1"/><div className="amb-2"/><div className="amb-3"/><div className="noise"/>
      </div>
      <div className="page">
        <Header mode={mode} onModeChange={setMode} rodCount={rodCount}
          cfgOpen={cfgOpen}     onCfgToggle={()=>{closeAll();setCfgOpen(o=>!o)}}
          soundOn={soundOn}     onSoundToggle={()=>setSoundOn(o=>!o)}
          tutOpen={tutOpen}     onTutToggle={()=>{closeAll();setTutOpen(o=>!o)}}
          practiceOpen={practiceOpen} onPracticeToggle={()=>{closeAll();setPracticeOpen(o=>!o)}}
          onFullscreenToggle={toggleFullscreen}
        />

        <ConfigPanel open={cfgOpen}     rodCount={rodCount} onRodCountChange={setRodCount} onClose={()=>setCfgOpen(false)}/>
        <FriendsMenu open={tutOpen}     tut={tut} onStartFriend={id=>{tut.startFriend(id);setTutOpen(false);}}/>
        <PracticePanel open={practiceOpen} tut={tut} onPickFriend={id=>{tut.startFriend(id);setPracticeOpen(false);}}/>

        <ValueDisplay value={value} mode={mode} visible={showValue} onToggle={()=>setShowValue(v=>!v)}/>

        {tut.active && (
          <TutorialHUD tut={tut} onShowMenu={()=>{ tut.exit(); setTutOpen(true); }}/>
        )}

        <div className={isFullscreen ? 'abacus-zone abacus-zone-fs' : 'abacus-zone'}>
          <div style={{position:'relative'}}>
            <AbacusFrame layout={layout} rods={rods} rodCount={rodCount} mode={mode}
              animY={animY} patch={patch} play={play} hiRods={hiRods} tutPhase={tut.phase}/>
            {tut.celebKey > 0 && tut.phase === 'success' && tut.friend &&
              <Celebration key={tut.celebKey} friend={tut.friend}/>}
          </div>

          <ColumnLabels layout={layout} rodCount={rodCount} mode={mode}/>
        </div>
        <Footer mode={mode} onReset={reset}/>
      </div>
      {isFullscreen && (
        <div className="fs-hud">
          <div className="fs-hud-inner">
            <div className="fs-seg">
              <button className={`fs-seg-btn${mode==='ones'?' fs-seg-on':''}`} onClick={()=>setMode('ones')}>
                <span className="pip pip-blue"/>ONES
              </button>
              <span className="fs-seg-div"/>
              <button className={`fs-seg-btn${mode==='positional'?' fs-seg-on':''}`} onClick={()=>setMode('positional')}>
                <span className="pip pip-amber"/>POS
              </button>
            </div>
            <button className="fs-btn" onClick={()=>setShowValue(v=>!v)}>
              {showValue
                ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M1 8C2.5 4 5 2.5 8 2.5S13.5 4 15 8C13.5 12 11 13.5 8 13.5S2.5 12 1 8z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.4"/></svg>
                : <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M1 8C2.5 4 5 2.5 8 2.5S13.5 4 15 8C13.5 12 11 13.5 8 13.5S2.5 12 1 8z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 2.5l11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              }
              {showValue ? 'HIDE VALUE' : 'SHOW VALUE'}
            </button>
            <button className="fs-btn" onClick={reset}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M10.5 6a4.5 4.5 0 1 1-1.24-3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              RESET
            </button>
            <span className="fs-hint">Press ESC to exit</span>
            <button className="fs-btn fs-exit" onClick={() => { import("@/lib/fullscreen").then(m => m.exitFullscreen()); }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 2H2v3M9 2h3v3M5 12H2V9M9 12h3V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              EXIT
            </button>
          </div>
        </div>
      )}
      <style>{CSS}</style>
    </div>
  );
}

// ─── TUTORIAL HUD ────────────────────────────────────────────────────────────
function TutorialHUD({ tut, onShowMenu }: { tut: ReturnType<typeof useTutorial>; onShowMenu: () => void }) {
  const { friend, phase, watchIdx, beginWatch, watchAgain, beginTry } = tut;
  if (!friend) return null;

  if (phase === 'gap-before') return (
    <div className="hud hud-gap" style={{'--hc':friend.color} as React.CSSProperties}>
      <div className="hud-gap-dot" style={{background:friend.color}}/>
      <span className="hud-gap-txt">Get ready…</span>
    </div>
  );

  if (phase === 'gap-after-watch') return (
    <div className="hud" style={{'--hc':friend.color,'--hb':friend.bg} as React.CSSProperties}>
      <div className="hud-gap-watch-done">
        <span className="hud-gap-wd-emoji">{friend.emoji}</span>
        <div>
          <div className="hud-gap-wd-title" style={{color:friend.color}}>Got it? Now you try!</div>
          <div className="hud-gap-wd-sub">The board will reset so you can do it yourself.</div>
        </div>
      </div>
      <button className="hud-primary" style={{background:friend.color}} onClick={beginTry}>
        ✋ Reset board — let me try!
      </button>
      <button className="hud-ghost" onClick={watchAgain}>🔁 Watch again first</button>
    </div>
  );

  if (phase === 'gap-after-try') return (
    <div className="hud hud-gap" style={{'--hc':friend.color} as React.CSSProperties}>
      <div className="hud-gap-dot" style={{background:'#4ade80'}}/>
      <span className="hud-gap-txt" style={{color:'#4ade80'}}>Correct! ✓</span>
    </div>
  );

  if (phase === 'intro') return (
    <div className="hud" style={{'--hc':friend.color,'--hb':friend.bg} as React.CSSProperties}>
      <div className="hud-topbar">
        <span className="hud-tag" style={{background:friend.bg,borderColor:friend.color,color:friend.color}}>
          {friend.category==='big'?'🔵 Big':friend.category==='small'?'🟡 Small':'🟠 Mix'}
          {' · '}{friend.type==='positive'?'Adding':'Subtracting'}
        </span>
        <button className="hud-back" onClick={onShowMenu}>← Menu</button>
      </div>
      <div className="hud-hero">
        <span className="hud-hero-emoji">{friend.emoji}</span>
        <div>
          <div className="hud-formula-big" style={{color:friend.color}}>{friend.formula}</div>
          <div className="hud-rule-line">{friend.rule}</div>
        </div>
      </div>
      <p className="hud-funfact">{friend.funFact}</p>
      <button className="hud-primary" style={{background:friend.color}} onClick={beginWatch}>
        👀 Watch how it works
      </button>
    </div>
  );

  if (phase === 'watching') {
    const step = friend.watchSteps[watchIdx];
    const isLast = watchIdx === friend.watchSteps.length - 1;
    return (
      <div className="hud" style={{'--hc':friend.color,'--hb':friend.bg} as React.CSSProperties}>
        <div className="hud-topbar">
          <span className="hud-formula-sm" style={{color:friend.color}}>{friend.formula}</span>
          <button className="hud-back" onClick={onShowMenu}>← Menu</button>
        </div>
        <div className="hud-watch-steps">
          {friend.watchSteps.map((_,i) => (
            <div key={i}
              className={'hud-dot'+(i<watchIdx?' hud-dot-done':i===watchIdx?' hud-dot-active':'')}
              style={i===watchIdx?{background:friend.color,width:20}:undefined}/>
          ))}
          <span className="hud-dot-label" style={{color:friend.color}}>
            Step {watchIdx+1} / {friend.watchSteps.length}
          </span>
        </div>
        <div className="hud-step-box" style={{borderColor:friend.color+'44'}}>
          <div className="hud-step-num" style={{color:friend.color}}>Step {watchIdx+1}</div>
          <p className="hud-step-desc">{step && step.description}</p>
        </div>
        <div className="hud-watch-actions">
          {isLast
            ? <div className="hud-watch-end-note">Watch complete! Preparing your turn…</div>
            : <div className="hud-watching-badge">
                <span className="hud-pulse-dot" style={{background:friend.color}}/>
                Watching…
              </div>
          }
          <button className="hud-ghost" onClick={watchAgain}>🔁 Watch again</button>
        </div>
      </div>
    );
  }

  if (phase === 'try') return (
    <div className="hud hud-try-border" style={{'--hc':friend.color,'--hb':friend.bg} as React.CSSProperties}>
      <div className="hud-topbar">
        <span className="hud-formula-sm" style={{color:friend.color}}>{friend.formula}</span>
        <button className="hud-back" onClick={onShowMenu}>← Menu</button>
      </div>
      <div className="hud-try-hero">
        <span className="hud-try-icon">✋</span>
        <div>
          <div className="hud-try-title">Your turn!</div>
          <p className="hud-try-hint">{friend.tryHint}</p>
        </div>
      </div>
      <div className="hud-try-bar">
        <span className="hud-pulse-dot" style={{background:friend.color}}/>
        <span className="hud-try-prompt">
          Move the <strong style={{color:friend.color}}>glowing beads</strong> to show{' '}
          <strong style={{color:friend.color}}>{friend.formula}</strong>
        </span>
      </div>
      <button className="hud-ghost" onClick={watchAgain}>🔁 Watch again first</button>
    </div>
  );

  if (phase === 'success') {
    const idx = ALL_FRIENDS.findIndex(f => f.id === friend.id);
    const next = idx >= 0 && idx < ALL_FRIENDS.length-1 ? ALL_FRIENDS[idx+1] : null;
    return (
      <div className="hud hud-success-border" style={{'--hc':friend.color} as React.CSSProperties}>
        <div className="hud-success-stars">⭐⭐⭐</div>
        <div className="hud-success-title" style={{color:friend.color}}>{friend.emoji} You got it!</div>
        <div className="hud-formula-box" style={{borderColor:friend.color,background:friend.bg}}>
          <span style={{color:friend.color,fontFamily:'monospace',fontSize:17,fontWeight:700,letterSpacing:2}}>
            {friend.formula}
          </span>
        </div>
        <div className="hud-success-actions">
          {next
            ? <button className="hud-primary" style={{background:friend.color}}
                onClick={() => tut.startFriend(next.id)}>
                Next: {next.emoji} {next.formula} →
              </button>
            : <button className="hud-primary" style={{background:friend.color}} onClick={onShowMenu}>
                🎓 All done! See progress
              </button>
          }
          <button className="hud-ghost" onClick={onShowMenu}>← Back to menu</button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── FRIENDS MENU ────────────────────────────────────────────────────────────
function FriendsMenu({ open, tut, onStartFriend }: { open: boolean; tut: ReturnType<typeof useTutorial>; onStartFriend: (id: string) => void }) {
  const [tab, setTab] = useState('big');
  const [sub, setSub] = useState('positive');

  const CATS = [
    { key:'big',   label:'Big Friends',   icon:'🔵', color:'#60a5fa',
      rule:'These friends always add up to 10! 🔵 When you cannot add a number, swap it with its Big Friend and gain a TEN bead.',
      all: [...BIG_POSITIVE, ...BIG_NEGATIVE] },
    { key:'small', label:'Small Friends', icon:'🟡', color:'#fbbf24',
      rule:'These friends always add up to 5! 🟡 When you cannot add a number, swap it with its Small Friend and gain a FIVE bead.',
      all: [...SMALL_POSITIVE, ...SMALL_NEGATIVE] },
    { key:'mix',   label:'Mix Friends',   icon:'🟠', color:'#f97316',
      rule:'Both a Big Friend AND a Small Friend working together! 🟠 These are the coolest trades on the soroban.',
      all: [...MIX_POSITIVE, ...MIX_NEGATIVE] },
  ];

  const cat = CATS.find(c => c.key === tab)!;
  const shown = cat.all.filter(f => f.type === sub);
  const doneAll = ALL_FRIENDS.filter(f => tut.completed.includes(f.id)).length;

  return (
    <div className={'drawer-wrap'+(open?' drawer-open':'')} style={{maxWidth:860}}>
      <div className="drawer-card">
        <div className="fm-topbar">
          <div>
            <div className="fm-title">🤝 Friends Menu</div>
            <div className="fm-sub">Pick a friend and start learning!</div>
          </div>
          <div className="fm-overall">
            <div className="fm-prog-bar">
              <div className="fm-prog-fill" style={{width:`${(doneAll/ALL_FRIENDS.length)*100}%`}}/>
            </div>
            <span className="fm-prog-txt">{doneAll} / {ALL_FRIENDS.length} learned ✨</span>
          </div>
        </div>

        <div className="fm-cat-tabs">
          {CATS.map(c => {
            const doneC = c.all.filter(f => tut.completed.includes(f.id)).length;
            const active = tab === c.key;
            return (
              <button key={c.key}
                className={'fm-cat-tab'+(active?' fm-cat-on':'')}
                style={active?{borderBottomColor:c.color}:undefined}
                onClick={() => setTab(c.key)}>
                <span>{c.icon} {c.label}</span>
                <span className="fm-cat-count" style={active?{color:c.color}:undefined}>{doneC}/{c.all.length}</span>
              </button>
            );
          })}
        </div>

        <div className="fm-rule-box">
          <span className="fm-rule-icon">{cat.icon}</span>
          <span className="fm-rule-txt">{cat.rule}</span>
        </div>

        <div className="fm-sub-tabs">
          <button className={'fm-sub-tab'+(sub==='positive'?' fm-sub-on':'')} onClick={()=>setSub('positive')}>
            ➕ Adding ({cat.all.filter(f=>f.type==='positive'&&tut.completed.includes(f.id)).length}/{cat.all.filter(f=>f.type==='positive').length})
          </button>
          <button className={'fm-sub-tab'+(sub==='negative'?' fm-sub-on':'')} onClick={()=>setSub('negative')}>
            ➖ Subtracting ({cat.all.filter(f=>f.type==='negative'&&tut.completed.includes(f.id)).length}/{cat.all.filter(f=>f.type==='negative').length})
          </button>
        </div>

        <div className="fm-grid">
          {shown.map(f => {
            const done = tut.completed.includes(f.id);
            const isActive = tut.friend && tut.friend.id === f.id;
            return (
              <button key={f.id}
                className={'fm-card'+(done?' fm-done':'')+(isActive?' fm-active':'')}
                style={{'--fc':f.color,'--fb':f.bg} as React.CSSProperties}
                onClick={() => onStartFriend(f.id)}>
                <span className="fm-card-emoji">{f.emoji}</span>
                <span className="fm-card-formula" style={{color:f.color}}>{f.formula}</span>
                {done && <span className="fm-check">✓</span>}
                {isActive && <span className="fm-active-dot" style={{background:f.color}}/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PRACTICE PANEL ──────────────────────────────────────────────────────────
function PracticePanel({ open, tut, onPickFriend }: { open: boolean; tut: ReturnType<typeof useTutorial>; onPickFriend: (id: string) => void }) {
  if (!open) return null;
  const noCompleted = tut.completed.length < 1;

  return (
    <div className="drawer-wrap drawer-open" style={{maxWidth:700}}>
      <div className="drawer-card">
        <div className="prac-hdr">
          <div className="prac-title">🎯 Practice Mode</div>
          <div className="prac-sub">Test what you have learned</div>
        </div>
        {noCompleted ? (
          <div className="prac-empty">
            <div className="prac-empty-icon">📚</div>
            <div className="prac-empty-title">Learn some friends first!</div>
            <div className="prac-empty-body">
              Complete at least one Friends lesson to unlock Practice Mode.
              Head to the Friends menu to get started!
            </div>
          </div>
        ) : (
          <div className="prac-body">
            <div className="prac-stats-row">
              <div className="prac-stat">
                <span className="prac-stat-n" style={{color:'#4ade80'}}>{tut.completed.length}</span>
                <span className="prac-stat-l">Learned</span>
              </div>
              <div className="prac-stat">
                <span className="prac-stat-n" style={{color:'#fbbf24'}}>{ALL_FRIENDS.length-tut.completed.length}</span>
                <span className="prac-stat-l">Remaining</span>
              </div>
              <div className="prac-stat">
                <span className="prac-stat-n" style={{color:'#60a5fa'}}>
                  {Math.round((tut.completed.length/ALL_FRIENDS.length)*100)}%
                </span>
                <span className="prac-stat-l">Complete</span>
              </div>
            </div>

            <div className="prac-prog-bar">
              <div className="prac-prog-fill" style={{width:`${(tut.completed.length/ALL_FRIENDS.length)*100}%`}}/>
            </div>

            <div className="prac-all-grid">
              {ALL_FRIENDS.map(f => {
                const done = tut.completed.includes(f.id);
                return (
                  <div key={f.id}
                    className={'prac-badge'+(done?' prac-badge-done':'')}
                    style={done?{borderColor:f.color,background:f.bg}:undefined}
                    title={f.formula}>
                    {done && <span style={{fontSize:11}}>{f.emoji}</span>}
                    <span style={{fontSize:9,fontFamily:'monospace',color:done?f.color:'rgba(255,255,255,0.18)'}}>
                      {f.formula.split('=')[0].trim()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="prac-hint-box">
              <span className="prac-hint-label">💡 How to practice</span>
              <span className="prac-hint-body">
                Pick a learned friend below, try it without watching, and see if you remember the moves!
              </span>
            </div>

            <div className="prac-section-title">Retry a learned friend:</div>
            <div className="prac-friend-list">
              {tut.completed.map(id => {
                const f = ALL_FRIENDS.find(x => x.id === id);
                if (!f) return null;
                return (
                  <button key={id} className="prac-retry-btn"
                    style={{'--bc':f.color,'--bb':f.bg} as React.CSSProperties}
                    onClick={() => onPickFriend(id)}>
                    <span style={{fontSize:18}}>{f.emoji}</span>
                    <span style={{color:f.color,fontFamily:'monospace',fontSize:12,fontWeight:700}}>{f.formula}</span>
                    <span className="prac-retry-label">Try again →</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CELEBRATION ─────────────────────────────────────────────────────────────
function Celebration({ friend }: { friend: Friend }) {
  const [on, setOn] = useState(true);
  const pts = useRef(Array.from({length:20}, (_,i) => ({
    id:i, x:Math.random()*100, delay:Math.random()*0.5,
    sz:10+Math.random()*14, e:['⭐','✨','🎊','🎉','💛','🌟'][Math.floor(Math.random()*6)],
  }))).current;
  useEffect(() => { const t=setTimeout(()=>setOn(false),3000); return()=>clearTimeout(t); }, []);
  if (!on) return null;
  return (
    <div className="cel-wrap">
      {pts.map(p => (
        <div key={p.id} className="cel-pt" style={{left:`${p.x}%`,animationDelay:`${p.delay}s`,fontSize:p.sz}}>
          {p.e}
        </div>
      ))}
      <div className="cel-badge" style={{borderColor:friend.color}}>
        <span style={{fontSize:42}}>{friend.emoji}</span>
        <span style={{color:friend.color,fontWeight:700,fontSize:17}}>Perfect! ✓</span>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontFamily:'monospace'}}>{friend.formula}</span>
      </div>
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function Header({ mode, onModeChange, rodCount, cfgOpen, onCfgToggle,
                  soundOn, onSoundToggle, tutOpen, onTutToggle, practiceOpen, onPracticeToggle,
                  onFullscreenToggle }: {
  mode: string; onModeChange: (m: string) => void; rodCount: number;
  cfgOpen: boolean; onCfgToggle: () => void;
  soundOn: boolean; onSoundToggle: () => void;
  tutOpen: boolean; onTutToggle: () => void;
  practiceOpen: boolean; onPracticeToggle: () => void;
  onFullscreenToggle: () => void;
}) {
  return (
    <header className="hdr">
      <div className="hdr-right">
        <button className={'chip chip-friends'+(tutOpen?' chip-on':'')} onClick={onTutToggle}>
          <span>🤝</span><span>FRIENDS</span>
        </button>
        <button className={'chip chip-practice'+(practiceOpen?' chip-on':'')} onClick={onPracticeToggle}>
          <span>🎯</span><span>PRACTICE</span>
        </button>
        <div className="seg-ctrl">
          <button className={'seg-btn'+(mode==='ones'?' seg-on':'')} onClick={()=>onModeChange('ones')}>
            <span className="pip pip-blue"/>ONES
          </button>
          <span className="seg-divider"/>
          <button className={'seg-btn'+(mode==='positional'?' seg-on':'')} onClick={()=>onModeChange('positional')}>
            <span className="pip pip-amber"/>POS
          </button>
        </div>
        <button className={'chip'+(soundOn?' chip-on':'')} onClick={onSoundToggle}>
          {soundOn
            ? <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 5H4L7.5 2.5v10L4 10H1.5V5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M10 5.5c.9.7 1.5 1.5 1.5 2.5s-.6 1.8-1.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 5H4L7.5 2.5v10L4 10H1.5V5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M10.5 5.5L13 8M13 5.5L10.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          }
          <span>{soundOn?'SFX ON':'SFX OFF'}</span>
        </button>
        <button className={'chip'+(cfgOpen?' chip-on':'')} onClick={onCfgToggle}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2.3" stroke="currentColor" strokeWidth="1.4"/><path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <span>{rodCount} RODS</span>
          <svg className={'chevron'+(cfgOpen?' chevron-up':'')} width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 3.5L4.5 6 7 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className="chip" onClick={onFullscreenToggle} title="Fullscreen (press F)">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 5V2h3M9 2h3v3M2 9v3h3M12 9v3H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>FULL</span>
        </button>
      </div>
    </header>
  );
}

// ─── CONFIG PANEL ─────────────────────────────────────────────────────────────
function ConfigPanel({ open, rodCount, onRodCountChange, onClose }: { open: boolean; rodCount: number; onRodCountChange: (n: number) => void; onClose: () => void }) { // mode prop intentionally removed — was never used
  const maxStr = useMemo(() => rodCount<=15 ? (Math.pow(10,rodCount)-1).toLocaleString() : `10^${rodCount}−1`, [rodCount]);
  return (
    <div className={'drawer-wrap'+(open?' drawer-open':'')} style={{maxWidth:480}}>
      <div className="drawer-card">
        <div className="drawer-hdr">
          <span className="drawer-title">CONFIGURATION</span>
          <button className="drawer-close" onClick={onClose}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="cfg-body">
          <div className="cfg-stats">
            <div className="cfg-stat"><span className="cfg-stat-lbl">Columns</span><span className="cfg-stat-val">{rodCount}</span></div>
            <div className="cfg-stat-sep"/>
            <div className="cfg-stat"><span className="cfg-stat-lbl">Max Value</span><span className="cfg-stat-val cfg-stat-sm">{maxStr}</span></div>
          </div>
          <input type="range" min={3} max={20} value={rodCount} className="cfg-range"
            onChange={e => onRodCountChange(Number(e.target.value))}/>
          <div className="cfg-range-ends"><span>3</span><span>20</span></div>
          <div className="cfg-presets">
            {[3,5,7,9,11,13,15,17,20].map(n => (
              <button key={n} className={'preset-btn'+(rodCount===n?' preset-on':'')} onClick={()=>onRodCountChange(n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VALUE DISPLAY ────────────────────────────────────────────────────────────
function ValueDisplay({ value, mode, visible, onToggle }: { value: number; mode: string; visible: boolean; onToggle: () => void }) {
  const fmt = value.toLocaleString('en-US');
  const prevRef = useRef(fmt);
  const [display, setDisplay] = useState(fmt);
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    if (fmt !== prevRef.current) {
      prevRef.current = fmt;
      setDisplay(fmt);
      setAnim(true);
      setTimeout(() => setAnim(false), 260);
    }
  }, [fmt]);
  return (
    <div className="vd-row">
      <div className={'vd-panel'+(visible?'':' vd-hidden')}>
        <div className="vd-meta">
          <span className="vd-label">CURRENT VALUE</span>
          <span className={'vd-tag'+(mode==='ones'?' tag-blue':' tag-amber')}>{mode==='ones'?'ONES':'POSITIONAL'}</span>
        </div>
        <div className={'vd-num'+(anim?' vd-tick':'')}>{display}</div>
        <div className="vd-rule"/>
      </div>
      <button className="vd-eye" onClick={onToggle}>
        {visible
          ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8C2.5 4 5 2.5 8 2.5S13.5 4 15 8C13.5 12 11 13.5 8 13.5S2.5 12 1 8z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.4"/></svg>
          : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8C2.5 4 5 2.5 8 2.5S13.5 4 15 8C13.5 12 11 13.5 8 13.5S2.5 12 1 8z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 2.5l11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        }
        <span>{visible?'HIDE':'SHOW'}</span>
      </button>
    </div>
  );
}

// ─── ABACUS FRAME ─────────────────────────────────────────────────────────────
function AbacusFrame({ layout, rods, rodCount, animY, patch, play, hiRods, tutPhase }: {
  layout: ReturnType<typeof getLayout>; rods: RodState[]; rodCount: number; mode?: string;
  animY: Record<number, number>; patch: (i: number, p: Partial<RodState>) => void;
  play: (isH: boolean) => void; hiRods: number[]; tutPhase: string;
}) {
  const { w } = layout;
  return (
    <div className="frame-shell">
      <div className="hw hw-tl"/><div className="hw hw-tr"/>
      <div className="hw hw-bl"/><div className="hw hw-br"/>
      <div className="brace brace-l"/><div className="brace brace-r"/>
      <div className="frame-body">
        <svg width={w} height={TOTAL_H} viewBox={`0 0 ${w} ${TOTAL_H}`} className="abacus-svg">
          <SvgDefs/>
          {/* Top rail */}
          <rect x={0} y={0} width={w} height={TOP_H} rx={5} fill="url(#gRail)"/>
          <rect x={0} y={0} width={w} height={TOP_H} rx={5} fill="url(#gRailHi)"/>
          <rect x={14} y={1.5} width={w-28} height={0.8} rx={0.4} fill="rgba(180,210,255,0.11)"/>
          <Bolts w={w} y={TOP_H/2}/>
          {/* Bottom rail */}
          <rect x={0} y={TOTAL_H-BOT_H} width={w} height={BOT_H} rx={5} fill="url(#gRail)"/>
          <rect x={14} y={TOTAL_H-BOT_H+1.5} width={w-28} height={0.8} rx={0.4} fill="rgba(180,210,255,0.06)"/>
          <Bolts w={w} y={TOTAL_H-BOT_H/2}/>
          {/* Background */}
          <rect x={0} y={TOP_H} width={w} height={TOTAL_H-TOP_H-BOT_H} fill="url(#gBg)"/>
          {/* Divider bar */}
          <rect x={0} y={DIV_Y} width={w} height={DIV_H} fill="#080c16"/>
          <rect x={0} y={DIV_Y} width={w} height={DIV_H} fill="url(#gDivSteel)"/>
          <rect x={0} y={DIV_Y} width={w} height={1.5} fill="url(#gDivTopEdge)"/>
          <rect x={8} y={DIV_Y+DIV_H/2-0.75} width={w-16} height={1.5} fill="url(#gDivAmber)" rx={0.75}/>
          <rect x={0} y={DIV_Y+DIV_H-2} width={w} height={2} fill="rgba(0,0,0,0.65)"/>

          {rods.map((rod, i) => {
            const cx = layout.px + i*layout.sp, bx = cx - layout.bw/2;
            const dc = dotColor(i, rodCount);
            const hi = hiRods.includes(i);
            const hY  = animY[bk(i,0)] !== undefined ? animY[bk(i,0)] : (rod.upper ? HB_ACT : HB_REST);
            const eYs = [0,1,2,3].map(bi => animY[bk(i,bi+1)] !== undefined ? animY[bk(i,bi+1)] : targetEarthY(bi, rod.lower));
            return (
              <g key={i}>
                {hi && tutPhase==='try' && (
                  <rect x={cx-layout.bw/2-7} y={TOP_H} width={layout.bw+14} height={TOTAL_H-TOP_H-BOT_H} rx={7}
                    fill="rgba(255,220,60,0.055)" stroke="rgba(255,220,60,0.30)" strokeWidth={1.5} strokeDasharray="4 3"/>
                )}
                {hi && tutPhase==='watching' && (
                  <rect x={cx-layout.bw/2-7} y={TOP_H} width={layout.bw+14} height={TOTAL_H-TOP_H-BOT_H} rx={7}
                    fill="rgba(100,180,255,0.04)" stroke="rgba(100,180,255,0.24)" strokeWidth={1.5}/>
                )}
                {hi && (tutPhase==='try' || tutPhase==='watching' || tutPhase==='gap-before') && (
                  <text x={cx} y={TOP_H-5} textAnchor="middle" fontSize="8" fontFamily="monospace" fontWeight="bold"
                    fill={i===rodCount-1?'rgba(255,80,80,0.8)':'rgba(80,160,255,0.8)'}>
                    {i===rodCount-1?'ONES':'TENS'}
                  </text>
                )}
                <RodShaft cx={cx}/>
                {dc && <MarkerDot cx={cx} color={dc}/>}
                <BeadEl bx={bx} by={hY} bw={layout.bw} active={rod.upper} kind="heaven" hi={hi && tutPhase==='try'}
                  onClick={() => { play(true); patch(i, {upper:!rod.upper}); }}/>
                {[0,1,2,3].map(bi => (
                  <BeadEl key={bi} bx={bx} by={eYs[bi]} bw={layout.bw} active={bi<rod.lower} kind="earth" hi={hi && tutPhase==='try'}
                    onClick={() => { const nl=bi<rod.lower?bi:bi+1; play(false); patch(i,{lower:nl}); }}/>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function SvgDefs() {
  return (
    <defs>
      <linearGradient id="gRail" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#222a3c"/><stop offset="100%" stopColor="#111620"/>
      </linearGradient>
      <linearGradient id="gRailHi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(140,170,220,0.11)"/><stop offset="60%" stopColor="rgba(140,170,220,0.02)"/><stop offset="100%" stopColor="transparent"/>
      </linearGradient>
      <linearGradient id="gDivSteel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a3858"/><stop offset="48%" stopColor="#162238"/><stop offset="100%" stopColor="#080c18"/>
      </linearGradient>
      <linearGradient id="gDivTopEdge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="transparent"/><stop offset="6%" stopColor="rgba(140,180,255,0.55)"/><stop offset="50%" stopColor="rgba(180,210,255,0.75)"/><stop offset="94%" stopColor="rgba(140,180,255,0.55)"/><stop offset="100%" stopColor="transparent"/>
      </linearGradient>
      <linearGradient id="gDivAmber" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="transparent"/><stop offset="4%" stopColor="rgba(232,152,10,0.55)"/><stop offset="50%" stopColor="rgba(255,190,40,0.90)"/><stop offset="96%" stopColor="rgba(232,152,10,0.55)"/><stop offset="100%" stopColor="transparent"/>
      </linearGradient>
      <radialGradient id="gBg" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#0c1020"/><stop offset="100%" stopColor="#070a14"/>
      </radialGradient>
      <linearGradient id="gRod" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0a0f1e"/><stop offset="50%" stopColor="#2e4058"/><stop offset="100%" stopColor="#0a0f1e"/>
      </linearGradient>
      <linearGradient id="gH0" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#d8e4f0"/><stop offset="30%" stopColor="#90a8c0"/><stop offset="68%" stopColor="#4a6070"/><stop offset="100%" stopColor="#1a2635"/>
      </linearGradient>
      <linearGradient id="gH1" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#fff0b0"/><stop offset="28%" stopColor="#f0a818"/><stop offset="65%" stopColor="#c86000"/><stop offset="100%" stopColor="#602800"/>
      </linearGradient>
      <linearGradient id="gE0" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#b0c4d8"/><stop offset="30%" stopColor="#6a8098"/><stop offset="68%" stopColor="#384858"/><stop offset="100%" stopColor="#141e28"/>
      </linearGradient>
      <linearGradient id="gE1" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#ffe090"/><stop offset="28%" stopColor="#d88810"/><stop offset="65%" stopColor="#a05000"/><stop offset="100%" stopColor="#4a2000"/>
      </linearGradient>
      <linearGradient id="gGloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.30)"/><stop offset="55%" stopColor="rgba(255,255,255,0.04)"/><stop offset="100%" stopColor="transparent"/>
      </linearGradient>
      <filter id="fDrop" x="-40%" y="-50%" width="180%" height="210%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.82)"/>
      </filter>
      <filter id="fGlowE" x="-60%" y="-80%" width="220%" height="260%">
        <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(220,140,0,0.58)"/>
      </filter>
      <filter id="fGlowH" x="-70%" y="-90%" width="240%" height="280%">
        <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="rgba(245,175,20,0.68)"/>
      </filter>
      <filter id="fGlowTut" x="-80%" y="-100%" width="260%" height="300%">
        <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="rgba(255,220,60,0.85)"/>
      </filter>
    </defs>
  );
}

function RodShaft({ cx }: { cx: number }) {
  return (
    <>
      <line x1={cx} y1={TOP_H+2} x2={cx} y2={TOTAL_H-BOT_H-2} stroke="url(#gRod)" strokeWidth={2.8} strokeLinecap="round"/>
      <line x1={cx} y1={TOP_H+2} x2={cx} y2={TOTAL_H-BOT_H-2} stroke="rgba(160,200,255,0.055)" strokeWidth={0.8} strokeLinecap="round"/>
    </>
  );
}

function Bolts({ w, y }: { w: number; y: number }) {
  return (
    <>
      {[w*0.1, w*0.5, w*0.9].map((bx,i) => (
        <g key={i}>
          <circle cx={bx} cy={y} r={5} fill="#0c1018" stroke="rgba(70,100,150,0.22)" strokeWidth={0.75}/>
          <circle cx={bx} cy={y} r={2.5} fill="none" stroke="rgba(70,100,150,0.28)" strokeWidth={0.5}/>
          <line x1={bx-2.8} y1={y} x2={bx+2.8} y2={y} stroke="rgba(80,110,160,0.28)" strokeWidth={0.8}/>
          <line x1={bx} y1={y-2.8} x2={bx} y2={y+2.8} stroke="rgba(80,110,160,0.28)" strokeWidth={0.8}/>
          <circle cx={bx-1} cy={y-1} r={0.9} fill="rgba(200,220,255,0.16)"/>
        </g>
      ))}
    </>
  );
}

function MarkerDot({ cx, color }: { cx: number; color: string }) {
  const fill = color==='red' ? '#e85030' : '#3da8e8';
  const glow = color==='red' ? 'rgba(232,80,48,0.7)' : 'rgba(61,168,232,0.7)';
  const r = color==='red' ? 5 : 4;
  return (
    <g>
      <circle cx={cx} cy={DIV_Y+DIV_H/2} r={r+3.5} fill="none" stroke={glow} strokeWidth={0.5} opacity={0.28}/>
      <circle cx={cx} cy={DIV_Y+DIV_H/2} r={r} fill={fill} style={{filter:`drop-shadow(0 0 6px ${glow})`}}/>
      <circle cx={cx-1.2} cy={DIV_Y+DIV_H/2-1.5} r={1.2} fill="rgba(255,255,255,0.44)"/>
    </g>
  );
}

function BeadEl({ bx, by, bw, active, kind, onClick, hi }: { bx: number; by: number; bw: number; active: boolean; kind: string; onClick: () => void; hi: boolean }) {
  const isH = kind === 'heaven';
  const fill = active ? (isH?'url(#gH1)':'url(#gE1)') : (isH?'url(#gH0)':'url(#gE0)');
  const filt = hi ? 'url(#fGlowTut)' : active ? (isH?'url(#fGlowH)':'url(#fGlowE)') : 'url(#fDrop)';
  const strk = hi ? 'rgba(255,220,60,0.65)' : active ? 'rgba(255,175,0,0.26)' : 'rgba(22,36,60,0.9)';
  const cx = bx+bw/2, cy = by+BEAD_H/2;
  return (
    <g onClick={onClick} style={{cursor:'pointer'}} filter={filt}>
      <rect x={bx} y={by} width={bw} height={BEAD_H} rx={BEAD_RX} ry={BEAD_RX} fill={fill} stroke={strk} strokeWidth={hi?1.8:0.8}/>
      <rect x={bx+3} y={by+2} width={bw-6} height={BEAD_H*0.46} rx={BEAD_RX-2} fill="url(#gGloss)" style={{pointerEvents:'none'}}/>
      <line x1={bx+9} y1={cy} x2={bx+bw-9} y2={cy} stroke={active?'rgba(130,60,0,0.5)':'rgba(0,0,0,0.28)'} strokeWidth={1.1} style={{pointerEvents:'none'}}/>
      <ellipse cx={cx} cy={cy} rx={3} ry={2.2} fill={active?'rgba(80,30,0,0.52)':'rgba(0,0,0,0.4)'} stroke={active?'rgba(60,20,0,0.75)':'rgba(0,0,0,0.55)'} strokeWidth={0.5} style={{pointerEvents:'none'}}/>
      <circle cx={cx-0.8} cy={cy-0.8} r={0.9} fill="rgba(255,255,255,0.2)" style={{pointerEvents:'none'}}/>
      {active && <rect x={bx+4} y={by+BEAD_H-4} width={bw-8} height={2.5} rx={1.5} fill="rgba(240,160,0,0.22)" style={{pointerEvents:'none'}}/>}
    </g>
  );
}

// ─── COLUMN LABELS ────────────────────────────────────────────────────────────
function ColumnLabels({ layout, rodCount, mode }: { layout: ReturnType<typeof getLayout>; rodCount: number; mode: string }) {
  return (
    <div className="col-labels" style={{width:layout.w, paddingLeft:layout.px - layout.sp/2, paddingRight:0, boxSizing:'border-box'}}>
      {Array.from({length:rodCount}, (_,i) => {
        const dc = dotColor(i, rodCount);
        return (
          <div key={i}
            className={'col-lbl'+(dc?' col-lbl-mark':'')}
            style={{width:layout.sp, color:dc==='red'?'rgba(232,80,48,0.65)':dc==='blue'?'rgba(61,168,232,0.6)':undefined}}>
            {placeLabel(i, rodCount, mode)}
          </div>
        );
      })}
    </div>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function Footer({ mode, onReset }: { mode: string; onReset: () => void }) {
  return (
    <footer className="footer">
      <div className="legend">
        <div className="leg-item"><span className="leg-s leg-amber-hi"/>Heaven · 5</div>
        <div className="leg-div"/>
        <div className="leg-item"><span className="leg-s leg-amber-lo"/>Earth · 1</div>
        <div className="leg-div"/>
        <div className="leg-item"><span className="leg-s leg-blue"/>{mode==='ones'?'Ones group':'×1000'}</div>
        <div className="leg-div"/>
        <div className="leg-item"><span className="leg-s leg-red"/>Ones rod</div>
      </div>
      <button className="reset-btn" onClick={onReset}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10.5 6a4.5 4.5 0 1 1-1.24-3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        RESET
      </button>
    </footer>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
:root {
  --font-ui: 'Trebuchet MS','Segoe UI',sans-serif;
  --font-mono: 'Courier New',monospace;
  --t1: rgba(220,230,255,0.95); --t2: rgba(185,205,245,0.82); --t3: rgba(155,175,220,0.65);
  --b1: rgba(60,80,130,0.18);   --b2: rgba(60,80,130,0.28);
  --bg-card: rgba(14,20,36,0.88); --bg-panel: rgba(10,16,28,0.94); --bg-raise: rgba(20,30,50,0.8);
  --amber: rgba(232,152,10,0.9); --amber-br: rgba(255,185,40,0.95); --amber-dim: rgba(232,152,10,0.12);
  --amber-gl: rgba(232,152,10,0.4); --b-amber: rgba(232,152,10,0.22);
  --blue-mk: rgba(61,168,232,0.8); --ease: cubic-bezier(0.16,1,0.3,1);
}
*{box-sizing:border-box;margin:0;padding:0;} button{cursor:pointer;}
body{background:#060a14;color:var(--t1);}
.app{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.ambient{position:fixed;inset:0;pointer-events:none;z-index:0;}
.amb-1{position:absolute;width:800px;height:600px;top:-300px;left:50%;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(8,20,60,0.9)0%,transparent 70%);filter:blur(60px);}
.amb-2{position:absolute;width:500px;height:500px;bottom:-200px;left:-150px;background:radial-gradient(ellipse,rgba(180,100,0,0.055)0%,transparent 65%);filter:blur(70px);}
.amb-3{position:absolute;width:400px;height:400px;bottom:-150px;right:-100px;background:radial-gradient(ellipse,rgba(0,80,160,0.055)0%,transparent 65%);filter:blur(70px);}
.noise{position:absolute;inset:0;opacity:0.018;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:200px;}
.page{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;padding:32px 20px 52px;}

.hdr{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:1280px;flex-wrap:wrap;gap:8px;}
.hdr-brand{display:flex;align-items:center;gap:12px;}
.brand-mark{width:42px;height:42px;border-radius:10px;background:linear-gradient(145deg,#151c2e,#0c1018);border:1px solid var(--b2);display:flex;align-items:center;justify-content:center;}
.brand-kanji{font-family:var(--font-ui);font-weight:200;font-size:22px;color:rgba(220,150,0,0.72);}
.brand-words{display:flex;flex-direction:column;gap:2px;}
.brand-name{font-family:var(--font-ui);font-weight:700;font-size:13px;letter-spacing:2px;color:var(--t1);}
.brand-sub{font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:rgba(155,185,230,0.82);}
.hdr-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.chip{display:flex;align-items:center;gap:6px;height:36px;padding:0 13px;background:var(--bg-card);border:1px solid var(--b2);border-radius:8px;color:var(--t2);font-family:var(--font-ui);font-weight:500;font-size:11px;letter-spacing:1px;transition:all .15s;white-space:nowrap;}
.chip:hover{color:var(--t1);border-color:rgba(90,130,210,0.45);}
.chip.chip-on{color:var(--t1);border-color:rgba(70,120,210,0.5);background:rgba(50,90,180,0.1);}
.chip-friends{background:linear-gradient(135deg,rgba(96,165,250,0.08),rgba(167,139,250,0.06));border-color:rgba(96,165,250,0.35) !important;color:rgba(147,197,253,0.9) !important;position:relative;overflow:hidden;}
.chip-friends::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(96,165,250,0.08),transparent);animation:shimmer 3s ease infinite;}
.chip-friends.chip-on{background:linear-gradient(135deg,rgba(96,165,250,0.18),rgba(167,139,250,0.12)) !important;border-color:rgba(96,165,250,0.55) !important;}
.chip-practice{background:linear-gradient(135deg,rgba(251,191,36,0.07),rgba(249,115,22,0.05));border-color:rgba(251,191,36,0.3) !important;color:rgba(253,211,77,0.9) !important;position:relative;overflow:hidden;}
.chip-practice.chip-on{background:linear-gradient(135deg,rgba(251,191,36,0.17),rgba(249,115,22,0.12)) !important;border-color:rgba(251,191,36,0.5) !important;}
@keyframes shimmer{0%,100%{transform:translateX(-100%);}50%{transform:translateX(100%);}}
.seg-ctrl{display:flex;align-items:center;height:35px;background:var(--bg-card);border:1px solid var(--b2);border-radius:8px;overflow:hidden;}
.seg-btn{display:flex;align-items:center;gap:5px;height:100%;background:transparent;border:none;color:var(--t2);font-family:var(--font-ui);font-weight:500;font-size:11px;letter-spacing:1px;padding:0 12px;transition:all .15s;white-space:nowrap;}
.seg-btn:hover{color:var(--t1);} .seg-btn.seg-on{color:var(--t1);background:rgba(255,255,255,0.055);}
.seg-divider{width:1px;height:15px;background:var(--b2);}
.pip{border-radius:50%;flex-shrink:0;display:inline-block;}
.pip-blue{width:6px;height:6px;background:var(--blue-mk);box-shadow:0 0 5px var(--blue-mk);}
.pip-amber{width:6px;height:6px;background:var(--amber);box-shadow:0 0 5px var(--amber);}
.chevron{transition:transform .2s var(--ease);} .chevron-up{transform:rotate(180deg);}

.drawer-wrap{width:100%;max-height:0;overflow:hidden;transition:max-height .38s cubic-bezier(.4,0,.2,1);}
.drawer-wrap.drawer-open{max-height:1800px;}
.drawer-card{background:var(--bg-panel);border:1px solid var(--b2);border-radius:12px;overflow:hidden;margin-top:4px;box-shadow:0 6px 32px rgba(0,0,0,0.5);}
.drawer-hdr{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--b1);}
.drawer-title{font-family:var(--font-mono);font-size:11px;letter-spacing:3px;color:var(--t1);}
.drawer-close{width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid var(--b2);border-radius:5px;color:var(--t2);transition:all .14s;}
.drawer-close:hover{color:#e85030;border-color:rgba(232,80,48,0.4);}

.fm-topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--b1);gap:16px;flex-wrap:wrap;}
.fm-title{font-family:var(--font-ui);font-weight:700;font-size:16px;color:var(--t1);}
.fm-sub{font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--t2);margin-top:3px;}
.fm-overall{display:flex;flex-direction:column;gap:5px;min-width:140px;}
.fm-prog-bar{height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;}
.fm-prog-fill{height:100%;background:linear-gradient(90deg,#60a5fa,#fbbf24,#f97316);border-radius:2px;transition:width .5s var(--ease);}
.fm-prog-txt{font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--t2);text-align:right;}
.fm-cat-tabs{display:flex;border-bottom:1px solid var(--b1);}
.fm-cat-tab{flex:1;display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:transparent;border:none;color:var(--t2);font-family:var(--font-ui);font-size:12px;font-weight:500;transition:all .15s;border-bottom:2px solid transparent;margin-bottom:-1px;gap:8px;}
.fm-cat-tab:hover{color:var(--t1);background:rgba(255,255,255,0.015);}
.fm-cat-on{color:var(--t1) !important;background:rgba(255,255,255,0.02);}
.fm-cat-count{font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--t2);}
.fm-rule-box{display:flex;align-items:flex-start;gap:10px;padding:11px 20px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--b1);}
.fm-rule-icon{font-size:16px;flex-shrink:0;margin-top:1px;}
.fm-rule-txt{font-family:var(--font-ui);font-size:13px;color:var(--t2);line-height:1.55;font-weight:300;}
.fm-sub-tabs{display:flex;padding:10px 16px;gap:8px;border-bottom:1px solid var(--b1);}
.fm-sub-tab{flex:1;padding:8px;background:rgba(255,255,255,0.02);border:1px solid var(--b2);border-radius:7px;color:var(--t2);font-family:var(--font-ui);font-size:11px;font-weight:500;transition:all .15s;}
.fm-sub-tab:hover{color:var(--t1);}
.fm-sub-on{color:var(--t1) !important;background:rgba(255,255,255,0.06) !important;border-color:rgba(255,255,255,0.15) !important;}
.fm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;padding:22px 18px;}
.fm-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 14px 18px;background:var(--fb,rgba(255,255,255,0.03));border:1.5px solid rgba(128,128,128,0.22);border-radius:14px;transition:all .22s var(--ease);cursor:pointer;}
.fm-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,0.35);}
.fm-done{opacity:1;}
.fm-active{box-shadow:0 0 0 2.5px rgba(255,255,255,0.2) !important;}
.fm-card-emoji{font-size:38px;line-height:1;}
.fm-card-formula{font-family:var(--font-mono);font-size:15px;letter-spacing:1px;text-align:center;font-weight:700;}
.fm-check{position:absolute;top:7px;right:9px;font-size:14px;color:#4ade80;font-weight:700;}
.fm-active-dot{position:absolute;top:7px;left:9px;width:7px;height:7px;border-radius:50%;animation:pulse 1.2s ease infinite;}

.hud{width:100%;max-width:640px;background:rgba(8,14,26,0.97);border:1.5px solid rgba(80,110,180,0.22);border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:12px;box-shadow:0 6px 36px rgba(0,0,0,0.6);animation:hudIn .28s var(--ease);}
@keyframes hudIn{from{opacity:0;transform:translateY(-8px) scale(0.98);}to{opacity:1;transform:none;}}
.hud-gap{flex-direction:row;align-items:center;justify-content:center;gap:12px;padding:14px 20px;}
.hud-gap-dot{width:10px;height:10px;border-radius:50%;animation:pulse 1s ease infinite;}
.hud-gap-txt{font-family:var(--font-ui);font-size:14px;color:var(--t2);font-weight:300;}
.hud-gap-watch-done{display:flex;align-items:center;gap:14px;padding:13px 14px;background:rgba(255,255,255,0.025);border:1px solid var(--b1);border-radius:10px;}
.hud-gap-wd-emoji{font-size:36px;flex-shrink:0;}
.hud-gap-wd-title{font-family:var(--font-ui);font-weight:700;font-size:16px;margin-bottom:4px;}
.hud-gap-wd-sub{font-family:var(--font-ui);font-size:12px;color:var(--t2);font-weight:300;}
.hud-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.hud-tag{font-family:var(--font-mono);font-size:10px;letter-spacing:1px;padding:5px 12px;border-radius:6px;border:1px solid;white-space:nowrap;}
.hud-back{background:transparent;border:1px solid var(--b2);border-radius:6px;color:var(--t2);font-family:var(--font-ui);font-size:11px;letter-spacing:.5px;padding:5px 13px;transition:all .14s;white-space:nowrap;}
.hud-back:hover{color:var(--t1);}
.hud-hero{display:flex;align-items:center;gap:14px;padding:13px 14px;background:rgba(255,255,255,0.025);border:1px solid var(--b1);border-radius:10px;}
.hud-hero-emoji{font-size:40px;line-height:1;flex-shrink:0;}
.hud-formula-big{font-family:var(--font-mono);font-size:20px;font-weight:700;letter-spacing:2px;margin-bottom:4px;}
.hud-formula-sm{font-family:var(--font-mono);font-size:12px;font-weight:600;letter-spacing:1.5px;}
.hud-rule-line{font-family:var(--font-ui);font-size:11px;color:var(--t2);font-weight:300;line-height:1.45;}
.hud-formula-box{display:flex;align-items:center;justify-content:center;padding:11px 18px;border:1.5px solid;border-radius:9px;}
.hud-funfact{font-family:var(--font-ui);font-size:12.5px;color:var(--t2);line-height:1.55;font-weight:300;background:rgba(255,255,255,0.025);border-radius:8px;padding:10px 13px;}
.hud-watch-steps{display:flex;align-items:center;gap:5px;}
.hud-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.1);flex-shrink:0;transition:all .3s;}
.hud-dot-done{background:rgba(255,255,255,0.3);}
.hud-dot-active{border-radius:4px;}
.hud-dot-label{font-family:var(--font-mono);font-size:11px;letter-spacing:1px;margin-left:4px;}
.hud-step-box{background:rgba(255,255,255,0.025);border:1px solid rgba(80,110,180,0.2);border-radius:9px;padding:13px 15px;}
.hud-step-num{font-family:var(--font-mono);font-size:11px;letter-spacing:1.5px;margin-bottom:6px;font-weight:600;}
.hud-step-desc{font-family:var(--font-ui);font-size:14px;color:var(--t1);line-height:1.55;font-weight:300;}
.hud-watch-actions{display:flex;flex-direction:column;gap:7px;}
.hud-watching-badge{display:flex;align-items:center;gap:8px;font-family:var(--font-ui);font-size:12px;color:var(--t2);padding:10px 13px;background:rgba(255,255,255,0.02);border:1px solid var(--b1);border-radius:8px;}
.hud-watch-end-note{font-family:var(--font-ui);font-size:12px;color:rgba(134,239,172,0.7);padding:10px 13px;background:rgba(74,222,128,0.04);border:1px solid rgba(74,222,128,0.15);border-radius:8px;}
.hud-pulse-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;animation:pulse 1.4s ease infinite;}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(0.8);}}
.hud-try-border{border-color:rgba(74,222,128,0.25) !important;}
.hud-try-hero{display:flex;align-items:flex-start;gap:13px;background:rgba(74,222,128,0.04);border:1px solid rgba(74,222,128,0.15);border-radius:10px;padding:13px 15px;}
.hud-try-icon{font-size:30px;line-height:1;flex-shrink:0;}
.hud-try-title{font-family:var(--font-ui);font-weight:700;font-size:16px;color:rgba(134,239,172,0.95);margin-bottom:4px;}
.hud-try-hint{font-family:var(--font-ui);font-size:12.5px;color:var(--t2);line-height:1.5;font-weight:300;}
.hud-try-bar{display:flex;align-items:center;gap:9px;padding:9px 13px;background:rgba(255,220,60,0.04);border:1px solid rgba(255,220,60,0.14);border-radius:8px;}
.hud-try-prompt{font-family:var(--font-ui);font-size:12px;color:rgba(255,220,60,0.8);line-height:1.45;}
.hud-success-border{border-color:rgba(74,222,128,0.3) !important;align-items:center;text-align:center;}
.hud-success-stars{font-size:28px;letter-spacing:4px;}
.hud-success-title{font-family:var(--font-ui);font-weight:700;font-size:21px;}
.hud-success-actions{display:flex;flex-direction:column;gap:7px;width:100%;}
.hud-primary{width:100%;padding:13px;border:none;border-radius:9px;font-family:var(--font-ui);font-weight:700;font-size:13.5px;color:rgba(15,10,3,0.92);transition:all .18s;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,0.3);}
.hud-primary:hover{transform:translateY(-2px);filter:brightness(1.08);}
.hud-primary:active{transform:none;}
.hud-ghost{width:100%;padding:9px;background:transparent;border:1px solid var(--b2);border-radius:9px;color:var(--t2);font-family:var(--font-ui);font-size:12px;transition:all .15s;}
.hud-ghost:hover{color:var(--t1);background:rgba(255,255,255,0.025);}

.prac-hdr{padding:16px 20px;border-bottom:1px solid var(--b1);}
.prac-title{font-family:var(--font-ui);font-weight:700;font-size:16px;color:var(--t1);}
.prac-sub{font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--t2);margin-top:3px;}
.prac-body{padding:16px 18px;display:flex;flex-direction:column;gap:14px;}
.prac-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 20px;text-align:center;}
.prac-empty-icon{font-size:44px;}
.prac-empty-title{font-family:var(--font-ui);font-weight:600;font-size:16px;color:var(--t1);}
.prac-empty-body{font-family:var(--font-ui);font-size:13px;color:var(--t2);line-height:1.6;max-width:380px;}
.prac-stats-row{display:flex;gap:10px;}
.prac-stat{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;background:rgba(255,255,255,0.02);border:1px solid var(--b1);border-radius:8px;padding:10px;}
.prac-stat-n{font-family:var(--font-ui);font-weight:700;font-size:22px;line-height:1;}
.prac-stat-l{font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:var(--t2);}
.prac-prog-bar{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;}
.prac-prog-fill{height:100%;background:linear-gradient(90deg,#60a5fa,#fbbf24,#f97316);border-radius:2px;transition:width .5s var(--ease);}
.prac-all-grid{display:flex;flex-wrap:wrap;gap:5px;}
.prac-badge{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);}
.prac-badge-done{background:rgba(255,255,255,0.04);}
.prac-hint-box{background:rgba(255,185,40,0.04);border:1px solid rgba(255,185,40,0.15);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:5px;}
.prac-hint-label{font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:rgba(255,185,40,0.9);}
.prac-hint-body{font-family:var(--font-ui);font-size:12px;color:var(--t2);line-height:1.55;font-weight:300;}
.prac-section-title{font-family:var(--font-mono);font-size:11px;letter-spacing:1.5px;color:var(--t2);}
.prac-friend-list{display:flex;flex-direction:column;gap:6px;}
.prac-retry-btn{display:flex;align-items:center;gap:10px;padding:10px 13px;background:var(--bb,rgba(255,255,255,0.02));border:1px solid rgba(128,128,128,0.2);border-radius:9px;transition:all .18s;text-align:left;}
.prac-retry-btn:hover{transform:translateX(3px);}
.prac-retry-label{font-family:var(--font-ui);font-size:11px;color:var(--t2);margin-left:auto;}

.cel-wrap{position:absolute;inset:0;pointer-events:none;z-index:30;overflow:hidden;}
.cel-pt{position:absolute;top:-40px;animation:celFall 2.4s ease-in forwards;}
@keyframes celFall{0%{transform:translateY(0) rotate(0) scale(0.8);opacity:1;}70%{opacity:1;}100%{transform:translateY(380px) rotate(480deg) scale(1.1);opacity:0;}}
.cel-badge{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,14,26,0.95);border:2px solid;border-radius:18px;padding:18px 30px;display:flex;flex-direction:column;align-items:center;gap:6px;animation:celPop .38s var(--ease),celFade .5s ease 2.1s forwards;box-shadow:0 0 36px rgba(0,0,0,0.5);}
@keyframes celPop{from{opacity:0;transform:translate(-50%,-50%) scale(0.55);}to{opacity:1;transform:translate(-50%,-50%) scale(1);}}
@keyframes celFade{from{opacity:1;}to{opacity:0;transform:translate(-50%,-60%);}}

.vd-row{width:100%;max-width:900px;display:flex;align-items:stretch;gap:8px;}
.vd-panel{flex:1;position:relative;background:var(--bg-panel);border:1px solid var(--b2);border-radius:10px;padding:14px 22px 12px;overflow:hidden;max-height:200px;transition:opacity .22s,transform .22s,max-height .28s,padding .28s;box-shadow:0 4px 24px rgba(0,0,0,0.3);}
.vd-panel::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(232,152,10,0.16),transparent);}
.vd-panel.vd-hidden{opacity:0;transform:translateY(-5px);pointer-events:none;max-height:0;padding:0;}
.vd-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
.vd-label{font-family:var(--font-mono);font-size:10px;letter-spacing:2.5px;color:var(--t2);}
.vd-tag{font-family:var(--font-mono);font-size:9px;letter-spacing:1px;padding:3px 9px;border-radius:4px;}
.tag-blue{color:rgba(61,168,232,0.85);background:rgba(61,168,232,0.1);border:1px solid rgba(61,168,232,0.2);}
.tag-amber{color:rgba(232,152,10,0.9);background:rgba(232,152,10,0.08);border:1px solid rgba(232,152,10,0.18);}
.vd-num{font-family:var(--font-ui);font-weight:300;font-size:42px;line-height:1;color:var(--amber-br);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;text-shadow:0 0 28px rgba(232,160,0,0.4);}
.vd-tick{animation:numTick .22s cubic-bezier(.25,.46,.45,.94);}
@keyframes numTick{0%{opacity:.3;transform:translateY(5px);}100%{opacity:1;transform:none;}}
.vd-rule{position:absolute;bottom:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,rgba(232,152,10,0.13),transparent);}
.vd-eye{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:54px;background:var(--bg-panel);border:1px solid var(--b2);border-radius:10px;color:var(--t2);font-family:var(--font-mono);font-size:9px;letter-spacing:1px;transition:all .15s;}
.vd-eye:hover{color:var(--t1);}

.frame-shell{position:relative;padding:2px;border-radius:13px;background:linear-gradient(145deg,rgba(80,110,160,0.42)0%,rgba(20,28,45,0.25)45%,rgba(70,100,150,0.36)100%);box-shadow:0 40px 120px rgba(0,0,0,0.92),0 12px 32px rgba(0,0,0,0.65),inset 0 1px 0 rgba(130,170,230,0.1);}
.hw{position:absolute;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#2a3550,#0e1420);border:1px solid rgba(80,110,160,0.32);z-index:3;box-shadow:0 2px 6px rgba(0,0,0,0.6);}
.hw::after{content:'';position:absolute;inset:3px;border-radius:50%;background:rgba(160,190,240,0.11);}
.hw-tl{top:10px;left:10px;} .hw-tr{top:10px;right:10px;} .hw-bl{bottom:10px;left:10px;} .hw-br{bottom:10px;right:10px;}
.brace{position:absolute;top:22px;bottom:22px;width:1px;z-index:2;background:linear-gradient(180deg,transparent,rgba(80,110,160,0.22)30%,rgba(80,110,160,0.22)70%,transparent);}
.brace-l{left:3px;} .brace-r{right:3px;}
.frame-body{background:linear-gradient(165deg,#0c1422 0%,#08101a 35%,#060c14 60%,#08101a 100%);border-radius:11px;padding:18px 20px 22px;position:relative;overflow:hidden;}
.frame-body::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(50,90,160,0.022)1px,transparent 1px),linear-gradient(90deg,rgba(50,90,160,0.022)1px,transparent 1px);background-size:24px 24px;}
.abacus-svg{display:block;overflow:visible;}

.col-labels{display:flex;padding:0 20px;margin-top:-10px;overflow:hidden;}
.col-lbl{text-align:center;font-family:var(--font-mono);font-size:9px;letter-spacing:.2px;color:var(--t3);flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.col-lbl-mark{font-weight:500;}

.footer{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;}
.legend{display:flex;align-items:center;gap:11px;flex-wrap:wrap;justify-content:center;}
.leg-item{display:flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--t2);}
.leg-s{width:7px;height:7px;border-radius:50%;flex-shrink:0;display:inline-block;}
.leg-amber-hi{background:rgba(245,184,48,0.85);box-shadow:0 0 6px rgba(232,152,10,0.6);}
.leg-amber-lo{background:rgba(200,130,0,0.45);}
.leg-blue{background:rgba(61,168,232,0.75);box-shadow:0 0 6px rgba(61,168,232,0.45);}
.leg-red{background:rgba(232,80,48,0.75);box-shadow:0 0 6px rgba(232,80,48,0.45);}
.leg-div{width:1px;height:11px;background:var(--b2);flex-shrink:0;}
.reset-btn{display:flex;align-items:center;gap:5px;height:34px;padding:0 16px;background:transparent;border:1px solid var(--b2);border-radius:7px;color:var(--t2);font-family:var(--font-ui);font-weight:500;font-size:11px;letter-spacing:2px;transition:all .15s;}
.reset-btn:hover{color:var(--t1);border-color:rgba(100,140,220,0.45);background:rgba(255,255,255,0.025);}

.guide-body{padding:18px 20px;display:flex;flex-direction:column;gap:14px;}
.guide-intro{font-family:var(--font-ui);font-size:13px;line-height:1.65;color:var(--t1);font-weight:300;}
.guide-intro strong{color:var(--amber-br);font-weight:500;}
.guide-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
@media(max-width:520px){.guide-grid{grid-template-columns:1fr;}}
.guide-section{background:var(--bg-card);border:1px solid var(--b1);border-radius:8px;padding:11px 13px;}
.guide-section-hdr{display:flex;align-items:center;gap:7px;margin-bottom:5px;}
.guide-section-title{font-family:var(--font-ui);font-weight:600;font-size:12px;letter-spacing:1px;color:var(--t1);}
.guide-section-body{font-family:var(--font-ui);font-size:12px;line-height:1.65;color:var(--t2);font-weight:300;}
.guide-friends-summary{display:flex;flex-direction:column;gap:6px;}
.gfs-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;font-family:var(--font-ui);font-size:12px;color:var(--t1);font-weight:300;}
.gfs-big{background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.15);}
.gfs-small{background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.14);}
.gfs-mix{background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.14);}
.gfs-icon{font-size:16px;flex-shrink:0;}

.cfg-body{padding:15px 17px;display:flex;flex-direction:column;gap:13px;}
.cfg-stats{display:flex;align-items:center;gap:16px;}
.cfg-stat{display:flex;flex-direction:column;gap:3px;}
.cfg-stat-sep{width:1px;height:32px;background:var(--b1);flex-shrink:0;}
.cfg-stat-lbl{font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--t2);}
.cfg-stat-val{font-family:var(--font-ui);font-weight:700;font-size:24px;color:var(--amber);line-height:1;}
.cfg-stat-sm{font-size:12px;color:var(--t2);font-weight:400;}
.cfg-range{-webkit-appearance:none;appearance:none;width:100%;height:2px;background:linear-gradient(90deg,var(--amber-dim),var(--bg-raise));border-radius:1px;outline:none;}
.cfg-range::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:var(--amber);box-shadow:0 0 12px var(--amber-gl);}
.cfg-range-ends{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:var(--t2);}
.cfg-presets{display:flex;gap:5px;flex-wrap:wrap;}
.preset-btn{background:var(--bg-raise);border:1px solid var(--b2);border-radius:5px;color:var(--t2);font-family:var(--font-mono);font-size:11px;padding:5px 10px;min-width:36px;text-align:center;transition:all .12s;}
.preset-btn:hover{border-color:rgba(100,140,220,0.5);color:var(--t1);}
.preset-btn.preset-on{background:var(--amber-dim);border-color:var(--b-amber);color:var(--amber);}
.app-fs .hdr{display:none !important;}.app-fs .drawer-wrap{display:none !important;}.app-fs .footer{display:none !important;}
.app-fs .col-labels{opacity:0.55;}
.app-fs .page{gap:10px;padding:16px 16px 80px;}
.abacus-zone{display:flex;flex-direction:column;align-items:center;}
.abacus-zone-fs{transform:scale(1.3);transform-origin:50% 0;margin-bottom:88px;}
.fs-hud{position:fixed;bottom:0;left:0;right:0;z-index:200;padding:10px 20px;background:rgba(6,10,20,0.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid rgba(80,110,180,0.25);display:flex;align-items:center;justify-content:center;}
.fs-hud-inner{display:flex;align-items:center;gap:10px;max-width:960px;width:100%;flex-wrap:wrap;justify-content:center;}
.fs-seg{display:flex;align-items:center;height:34px;background:var(--bg-card);border:1px solid var(--b2);border-radius:8px;overflow:hidden;flex-shrink:0;}
.fs-seg-btn{display:flex;align-items:center;gap:5px;height:100%;background:transparent;border:none;color:var(--t2);font-family:var(--font-ui);font-size:11px;font-weight:500;letter-spacing:1px;padding:0 12px;transition:all .15s;cursor:pointer;}
.fs-seg-btn:hover{color:var(--t1);}
.fs-seg-on{color:var(--t1) !important;background:rgba(255,255,255,0.055) !important;}
.fs-seg-div{width:1px;height:14px;background:var(--b2);}
.fs-btn{display:flex;align-items:center;gap:6px;height:34px;padding:0 14px;background:var(--bg-card);border:1px solid var(--b2);border-radius:8px;color:var(--t2);font-family:var(--font-ui);font-size:11px;font-weight:500;letter-spacing:1px;transition:all .15s;flex-shrink:0;white-space:nowrap;cursor:pointer;}
.fs-btn:hover{color:var(--t1);border-color:rgba(90,130,210,0.5);}
.fs-exit{border-color:rgba(232,80,48,0.22);}
.fs-exit:hover{color:rgba(240,90,60,0.9) !important;border-color:rgba(232,80,48,0.5) !important;}
.fs-hint{font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--t3);flex-shrink:0;}
@media(max-width:640px){
  .page{padding:20px 12px 40px!important;gap:10px!important;}
  .hdr{flex-direction:column;gap:8px!important;align-items:flex-start!important;}
  .hdr-right{width:100%;justify-content:flex-start;}
  .fm-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))!important;padding:14px 12px!important;}
  .fm-card{padding:16px 10px 14px!important;}
  .fm-topbar{padding:12px 14px!important;}
  .vd-row{flex-direction:column!important;max-width:100%!important;}
  .vd-eye{width:100%!important;flex-direction:row!important;padding:6px 10px!important;}
  .frame-body{padding:12px 10px 14px!important;}
  .hud{padding:14px 14px!important;}
  .prac-body{padding:12px 12px!important;}
  .guide-body{padding:14px 14px!important;}
  .abacus-zone-fs{transform:scale(1)!important;margin-bottom:60px!important;}
  .fs-hud{padding:8px 12px!important;}
  .cfg-body{padding:12px 12px!important;}
}
@media(max-width:480px){
  .page{padding:14px 8px 32px!important;}
  .chip{padding:0 9px!important;font-size:10px!important;height:32px!important;}
  .seg-btn{padding:0 8px!important;font-size:10px!important;}
  .fm-grid{grid-template-columns:1fr 1fr!important;gap:8px!important;}
  .vd-num{font-size:32px!important;}
  .vd-panel{padding:10px 14px 8px!important;}
}
`;