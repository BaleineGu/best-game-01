// The four wisp kinds that haunt the grove, and how each wave is assembled.
// A wisp outside the lantern's light is faster and harder to see; inside the
// light it slows and takes double ember damage (the world applies that).

import { FIELD } from './config.js';

export const KIND_MOTE = 'mote';
export const KIND_WISP = 'wisp';
export const KIND_BRUTE = 'brute';
export const KIND_SPLITTER = 'splitter';

export const KINDS = {
  [KIND_MOTE]: {
    name: 'Mote',
    radius: 10,
    hp: 1,
    speed: 115,
    damage: 1,
    score: 50,
    color: '#b78cff',
    glow: '#8b5cf6',
  },
  [KIND_WISP]: {
    name: 'Wisp',
    radius: 15,
    hp: 3,
    speed: 78,
    damage: 1,
    score: 100,
    color: '#7dd3fc',
    glow: '#0ea5e9',
  },
  [KIND_BRUTE]: {
    name: 'Brute',
    radius: 24,
    hp: 8,
    speed: 46,
    damage: 1,
    score: 250,
    color: '#f472b6',
    glow: '#db2777',
  },
  [KIND_SPLITTER]: {
    name: 'Splitter',
    radius: 17,
    hp: 4,
    speed: 66,
    damage: 1,
    score: 150,
    color: '#fbbf24',
    glow: '#d97706',
  },
};

// Build a wave's spawn queue from the plan: kinds shuffled, brutes held back.
export function buildWaveQueue(plan, random) {
  const queue = [];
  for (let i = 0; i < plan.mote; i += 1) queue.push(KIND_MOTE);
  for (let i = 0; i < plan.wisp; i += 1) queue.push(KIND_WISP);
  for (let i = 0; i < plan.brute; i += 1) queue.push(KIND_BRUTE);
  for (let i = 0; i < plan.splitter; i += 1) queue.push(KIND_SPLITTER);
  // Shuffle, but keep the first few spawns light so the wave opens gently.
  const shuffled = [];
  const pool = queue.slice();
  while (pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    shuffled.push(pool.splice(index, 1)[0]);
  }
  const light = shuffled.filter((k) => k === KIND_MOTE || k === KIND_WISP);
  const heavy = shuffled.filter((k) => k !== KIND_MOTE && k !== KIND_WISP);
  return light.slice(0, 4).concat(heavy, light.slice(4));
}

// A fresh wisp of a kind, spawned just outside the field edge.
export function spawnWisp(kind, hpBonus, random) {
  const def = KINDS[kind];
  const side = Math.floor(random() * 4);
  const margin = 30;
  let x;
  let y;
  if (side === 0) {
    x = random() * FIELD.width;
    y = -margin;
  } else if (side === 1) {
    x = FIELD.width + margin;
    y = random() * FIELD.height;
  } else if (side === 2) {
    x = random() * FIELD.width;
    y = FIELD.height + margin;
  } else {
    x = -margin;
    y = random() * FIELD.height;
  }
  return {
    kind,
    x,
    y,
    radius: def.radius,
    hp: def.hp + hpBonus,
    maxHp: def.hp + hpBonus,
    speed: def.speed * (0.9 + random() * 0.2),
    wobble: random() * Math.PI * 2,
    wobbleSpeed: 1.5 + random() * 2,
    hitFlash: 0,
  };
}
