// Emberlight's state and rules: the keeper, the wisps, the embers, the drops,
// the waves and the score. The renderer only draws this state; nothing here
// touches the canvas. Screens: title, play, relic, pause, over, win.

import { FIELD, PLAYER, STEP, wavePlan, DROPS, SHARD_SCORE, OIL_SCORE } from './config.js';
import { KINDS, KIND_MOTE, KIND_SPLITTER, buildWaveQueue, spawnWisp } from './enemies.js';
import { offerRelics } from './upgrades.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_RELIC = 'relic';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const BEST_KEY = 'emberlight-best';

export function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch (e) {
    // Private mode: the best score just does not persist.
  }
}

export function createWorld(seed) {
  const random = createRandom(seed);
  return {
    random,
    screen: SCREEN_TITLE,
    time: 0,
    wave: 0,
    score: 0,
    best: loadBest(),
    kills: 0,
    combo: 0,
    comboTimer: 0,
    comboBest: 0,
    keeper: {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      radius: PLAYER.radius,
      hearts: PLAYER.maxHearts,
      maxHearts: PLAYER.maxHearts,
      speed: PLAYER.speed,
      lightRadius: PLAYER.lightRadius,
      emberDamage: PLAYER.emberDamage,
      fireInterval: PLAYER.fireInterval,
      flareCooldown: PLAYER.flareCooldown,
      pierce: 0,
      magnet: 90,
      comboWindow: PLAYER.comboWindow,
      hurtShimmer: PLAYER.hurtShimmer,
      fireTimer: 0,
      flareTimer: 0,
      shimmer: 0,
      aimX: FIELD.width / 2,
      aimY: FIELD.height / 2 - 100,
    },
    enemies: [],
    embers: [],
    drops: [],
    particles: [],
    floaters: [],
    spawnQueue: [],
    spawnTimer: 0,
    wavePlan: null,
    relicOffer: [],
    relicsTaken: {},
    banner: '',
    bannerTimer: 0,
    shake: 0,
    dawn: 0,
    mouseWasDown: false,
    stats: null,
  };
}

export function startRun(world, seed) {
  const fresh = createWorld(seed === undefined ? (Math.random() * 2147483647) | 0 : seed);
  fresh.best = world.best;
  Object.assign(world, fresh);
  world.screen = SCREEN_PLAY;
  startWave(world, 1);
}

export function startWave(world, wave) {
  world.wave = wave;
  world.wavePlan = wavePlan(wave);
  world.spawnQueue = buildWaveQueue(world.wavePlan, world.random);
  world.spawnTimer = 0.6;
  world.banner = wave === 1 ? 'Night falls — Wave 1' : `Wave ${wave} of ${PLAYER_WAVES}`;
  world.bannerTimer = 2.2;
}

const PLAYER_WAVES = 10;

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random() * Math.PI * 2;
    const v = speed * (0.3 + world.random() * 0.7);
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.4 + world.random() * 0.4,
      maxLife: 0.8,
      color,
      size: 2 + world.random() * 3,
    });
  }
}

function floater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 1.1 });
}

function inLight(world, x, y) {
  const dx = x - world.keeper.x;
  const dy = y - world.keeper.y;
  return Math.hypot(dx, dy) <= world.keeper.lightRadius;
}

function nearestEnemy(world, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const enemy of world.enemies) {
    const d = Math.hypot(enemy.x - x, enemy.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }
  return best;
}

function killEnemy(world, enemy, audio) {
  const def = KINDS[enemy.kind];
  const mult = 1 + world.combo * PLAYER.comboStep;
  const gained = Math.round(def.score * mult);
  world.score += gained;
  world.kills += 1;
  world.combo += 1;
  world.comboTimer = world.keeper.comboWindow;
  world.comboBest = Math.max(world.comboBest, world.combo);
  floater(world, enemy.x, enemy.y - 10, `+${gained}`, '#fde68a');
  burst(world, enemy.x, enemy.y, def.glow, 14, 160);
  if (audio) audio.kill();
  if (enemy.kind === KIND_SPLITTER) {
    for (let i = 0; i < 2; i += 1) {
      const mote = spawnWisp(KIND_MOTE, 0, world.random);
      mote.x = enemy.x + (i === 0 ? -14 : 14);
      mote.y = enemy.y;
      world.enemies.push(mote);
    }
  }
  const roll = world.random();
  if (roll < DROPS.heart) {
    world.drops.push({ kind: 'heart', x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: 12 });
  } else if (roll < DROPS.heart + DROPS.oil) {
    world.drops.push({ kind: 'oil', x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: 12 });
  } else if (roll < DROPS.heart + DROPS.oil + DROPS.shard) {
    world.drops.push({ kind: 'shard', x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: 12 });
  }
}

function fireFlare(world, audio) {
  const keeper = world.keeper;
  if (keeper.flareTimer > 0) return;
  keeper.flareTimer = keeper.flareCooldown;
  world.shake = Math.max(world.shake, 7);
  burst(world, keeper.x, keeper.y, '#fde68a', 26, 320);
  for (const enemy of world.enemies) {
    const d = Math.hypot(enemy.x - keeper.x, enemy.y - keeper.y);
    if (d <= PLAYER.flareRadius + enemy.radius) {
      enemy.hp -= PLAYER.flareDamage;
      enemy.hitFlash = 0.15;
      const push = PLAYER.flarePush / Math.max(d, 40);
      enemy.x += ((enemy.x - keeper.x) / Math.max(d, 1)) * push * 0.12;
      enemy.y += ((enemy.y - keeper.y) / Math.max(d, 1)) * push * 0.12;
    }
  }
  if (audio) audio.flare();
}

function hurtKeeper(world, audio) {
  const keeper = world.keeper;
  if (keeper.shimmer > 0) return;
  keeper.hearts -= 1;
  keeper.shimmer = keeper.hurtShimmer;
  world.shake = Math.max(world.shake, 10);
  world.combo = 0;
  burst(world, keeper.x, keeper.y, '#f87171', 18, 200);
  if (audio) audio.hurt();
  if (keeper.hearts <= 0) {
    endRun(world, false, audio);
  }
}

function endRun(world, won, audio) {
  world.screen = won ? SCREEN_WIN : SCREEN_OVER;
  world.dawn = won ? 1 : 0;
  world.stats = {
    score: world.score,
    wave: world.wave,
    kills: world.kills,
    comboBest: world.comboBest,
    time: world.time,
  };
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.score);
  }
  if (audio) {
    if (won) audio.win();
    else audio.lose();
  }
}

function updatePlay(world, dt, input, audio) {
  const keeper = world.keeper;
  world.time += dt;
  keeper.shimmer = Math.max(0, keeper.shimmer - dt);
  keeper.flareTimer = Math.max(0, keeper.flareTimer - dt);
  keeper.fireTimer -= dt;
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }
  world.bannerTimer = Math.max(0, world.bannerTimer - dt);
  world.shake = Math.max(0, world.shake - dt * 26);

  // Move.
  const move = input.moveVector(keeper);
  keeper.x = Math.min(FIELD.width - keeper.radius, Math.max(keeper.radius, keeper.x + move.x * keeper.speed * dt));
  keeper.y = Math.min(FIELD.height - keeper.radius, Math.max(keeper.radius, keeper.y + move.y * keeper.speed * dt));
  keeper.aimX = input.mouseX;
  keeper.aimY = input.mouseY;

  // Flare on click or Space.
  const clicked = input.mouseDown && !world.mouseWasDown;
  world.mouseWasDown = input.mouseDown;
  if (clicked || input.consume('Space')) fireFlare(world, audio);

  // Auto-fire embers at the nearest wisp in range.
  if (keeper.fireTimer <= 0) {
    const target = nearestEnemy(world, keeper.x, keeper.y, PLAYER.emberRange);
    if (target) {
      keeper.fireTimer = keeper.fireInterval;
      const angle = Math.atan2(target.y - keeper.y, target.x - keeper.x);
      world.embers.push({
        x: keeper.x + Math.cos(angle) * (keeper.radius + 6),
        y: keeper.y + Math.sin(angle) * (keeper.radius + 6),
        vx: Math.cos(angle) * PLAYER.emberSpeed,
        vy: Math.sin(angle) * PLAYER.emberSpeed,
        damage: keeper.emberDamage,
        pierce: keeper.pierce,
        life: 1.1,
      });
      if (audio) audio.shoot();
    }
  }

  // Spawn the wave.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = world.wavePlan.spawnGap;
      const kind = world.spawnQueue.shift();
      world.enemies.push(spawnWisp(kind, world.wavePlan.hpBonus, world.random));
    }
  }

  // Wisps drift toward the keeper, wobbling; light slows them.
  for (const enemy of world.enemies) {
    const dx = keeper.x - enemy.x;
    const dy = keeper.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const lit = inLight(world, enemy.x, enemy.y);
    const speed = enemy.speed * (lit ? 0.6 : 1.35);
    enemy.wobble += enemy.wobbleSpeed * dt;
    const wob = Math.sin(enemy.wobble) * 0.35;
    const nx = dx / dist;
    const ny = dy / dist;
    enemy.x += (nx - ny * wob) * speed * dt;
    enemy.y += (ny + nx * wob) * speed * dt;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
  }

  // Embers fly, pierce, and burn wisps — twice as hard inside the light.
  for (const ember of world.embers) {
    ember.x += ember.vx * dt;
    ember.y += ember.vy * dt;
    ember.life -= dt;
    for (const enemy of world.enemies) {
      if (ember.life <= 0) break;
      if (ember.pierce < 0) break;
      const d = Math.hypot(enemy.x - ember.x, enemy.y - ember.y);
      if (d <= enemy.radius + 5) {
        const lit = inLight(world, enemy.x, enemy.y);
        enemy.hp -= ember.damage * (lit ? 2 : 1);
        enemy.hitFlash = 0.12;
        burst(world, ember.x, ember.y, '#fbbf24', 4, 90);
        if (audio) audio.hit();
        if (ember.pierce > 0) {
          ember.pierce -= 1;
        } else {
          ember.life = 0;
        }
      }
    }
  }
  world.embers = world.embers.filter((e) => e.life > 0 && e.x > -20 && e.x < FIELD.width + 20 && e.y > -20 && e.y < FIELD.height + 20);

  // The dead fall; the living touch the keeper.
  const survivors = [];
  for (const enemy of world.enemies) {
    if (enemy.hp <= 0) {
      killEnemy(world, enemy, audio);
      continue;
    }
    survivors.push(enemy);
    const d = Math.hypot(enemy.x - keeper.x, enemy.y - keeper.y);
    if (d <= enemy.radius + keeper.radius - 2) {
      hurtKeeper(world, audio);
      if (world.screen !== SCREEN_PLAY) return;
      // Shove the wisp back so it does not sit on the keeper.
      const push = (enemy.radius + keeper.radius - d) + 6;
      enemy.x += ((enemy.x - keeper.x) / Math.max(d, 1)) * push;
      enemy.y += ((enemy.y - keeper.y) / Math.max(d, 1)) * push;
    }
  }
  world.enemies = survivors;

  // Drops drift to the keeper when close, and are collected on touch.
  const keptDrops = [];
  for (const drop of world.drops) {
    drop.life -= dt;
    if (drop.life <= 0) continue;
    const d = Math.hypot(drop.x - keeper.x, drop.y - keeper.y);
    if (d <= keeper.magnet) {
      drop.x += ((keeper.x - drop.x) / Math.max(d, 1)) * 260 * dt;
      drop.y += ((keeper.y - drop.y) / Math.max(d, 1)) * 260 * dt;
    }
    if (d <= keeper.radius + 12) {
      if (drop.kind === 'shard') {
        world.score += SHARD_SCORE;
        floater(world, drop.x, drop.y - 8, `+${SHARD_SCORE}`, '#fde68a');
      } else if (drop.kind === 'oil') {
        keeper.lightRadius += PLAYER.lightGrowPerOil;
        world.score += OIL_SCORE;
        floater(world, drop.x, drop.y - 8, 'Light grows', '#fde68a');
      } else {
        keeper.hearts = Math.min(keeper.maxHearts, keeper.hearts + 1);
        floater(world, drop.x, drop.y - 8, '+1 heart', '#fda4af');
      }
      burst(world, drop.x, drop.y, '#fde68a', 6, 80);
      if (audio) audio.pickup();
      continue;
    }
    keptDrops.push(drop);
  }
  world.drops = keptDrops;

  // Particles and floating text fade.
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floaters) {
    f.y -= 26 * dt;
    f.life -= dt;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);

  // Wave cleared: a relic, or dawn if the tenth wave falls.
  if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
    if (world.wave >= PLAYER_WAVES) {
      endRun(world, true, audio);
      return;
    }
    world.relicOffer = offerRelics(world.random, world.relicsTaken);
    world.screen = SCREEN_RELIC;
    if (audio) audio.waveHorn();
  }
}

export function updateWorld(world, dt, input, audio) {
  if (world.screen === SCREEN_PLAY) {
    updatePlay(world, dt, input, audio);
  } else if (world.screen === SCREEN_TITLE || world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) {
    // The background drifts: fireflies and the lantern's glow keep moving.
    world.time += dt;
    for (const p of world.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    world.particles = world.particles.filter((p) => p.life > 0);
    if (world.random() < dt * 2) {
      world.particles.push({
        x: world.random() * FIELD.width,
        y: FIELD.height + 6,
        vx: (world.random() - 0.5) * 12,
        vy: -14 - world.random() * 20,
        life: 3,
        maxLife: 3,
        color: '#fbbf24',
        size: 1.5 + world.random() * 2,
      });
    }
  }
  input.endStep();
}

// A relic card was picked (index 0..2): apply it and start the next wave.
export function pickRelic(world, index, audio) {
  if (world.screen !== SCREEN_RELIC) return;
  const relic = world.relicOffer[index];
  if (!relic) return;
  relic.apply(world.keeper);
  world.relicsTaken[relic.id] = (world.relicsTaken[relic.id] || 0) + 1;
  floater(world, world.keeper.x, world.keeper.y - 30, relic.name, '#fde68a');
  if (audio) audio.pickup();
  world.screen = SCREEN_PLAY;
  startWave(world, world.wave + 1);
}

export { STEP };
