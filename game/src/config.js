// Every tuning number for Emberlight lives here, so the game can be balanced
// by editing one file. Lengths are pixels, times seconds, speeds px/second.

export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 250,
  maxHearts: 3,
  // A hit grants this long of shimmer (invulnerability) so one touch is one heart.
  hurtShimmer: 1.2,
  // The lantern's light: wisps inside it are slow and take double ember damage.
  lightRadius: 175,
  lightGrowPerOil: 12,
  emberDamage: 1,
  emberSpeed: 560,
  fireInterval: 0.34,
  emberRange: 520,
  flareCooldown: 6,
  flareRadius: 210,
  flareDamage: 4,
  flarePush: 340,
  // Kills inside this window chain the combo; each step of the chain adds 10%.
  comboWindow: 3,
  comboStep: 0.1,
};

export const WAVES = 10;

// How many wisps each wave throws, and how the mix shifts as the night deepens.
export function wavePlan(wave) {
  const total = 6 + wave * 4;
  return {
    total,
    mote: Math.round(total * Math.max(0.55 - wave * 0.03, 0.25)),
    wisp: Math.round(total * 0.3),
    brute: wave >= 3 ? Math.round(total * 0.12) : 0,
    splitter: wave >= 5 ? Math.round(total * 0.13) : 0,
    // Seconds between spawns shrink as the waves go on.
    spawnGap: Math.max(1.15 - wave * 0.07, 0.45),
    hpBonus: Math.floor((wave - 1) / 4),
  };
}

// Drop chances on a kill: a shard (score), oil (wider light), a heart (rare).
export const DROPS = { shard: 0.35, oil: 0.14, heart: 0.03 };
export const SHARD_SCORE = 25;
export const OIL_SCORE = 10;
