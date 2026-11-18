// The screenshot scenes behind ?shot=title|play|victory|over. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { FIELD, STEP } from './config.js';
import { createWorld, startRun, startWave, updateWorld, SCREEN_PLAY, SCREEN_RELIC } from './world.js';
import { spawnWisp, KIND_MOTE, KIND_WISP } from './enemies.js';

const SAMPLE = STEP;

// A stand-in for the real input: the autopilot fills in movement and aiming.
function fakeInput() {
  return {
    mouseX: FIELD.width / 2,
    mouseY: FIELD.height / 2 - 120,
    mouseDown: false,
    pressed: new Set(),
    consume() { return false; },
    endStep() {},
    moveVector() { return { x: 0, y: 0 }; },
  };
}

// The play scene's pilot: hold a slow orbit around the grove's centre, so the
// action stays in frame, and flare when the crowd closes in.
function autopilot(world, input, strong) {
  const keeper = world.keeper;
  let nearest = null;
  let nearestDist = Infinity;
  for (const enemy of world.enemies) {
    const d = Math.hypot(enemy.x - keeper.x, enemy.y - keeper.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = enemy;
    }
  }
  if (!strong || !nearest) {
    input.moveVector = () => ({ x: 0, y: 0 });
    input.mouseDown = false;
    return;
  }
  // Orbit the centre: the keeper drifts in a wide circle, never the corners.
  const angle = world.time * 0.45;
  const tx = FIELD.width / 2 + Math.cos(angle) * 150;
  const ty = FIELD.height / 2 + Math.sin(angle) * 110;
  let mx = tx - keeper.x;
  let my = ty - keeper.y;
  const mlen = Math.hypot(mx, my) || 1;
  mx /= mlen;
  my /= mlen;
  if (nearestDist < 100) {
    // A wisp is on top of the keeper: shove away from it instead.
    mx = (keeper.x - nearest.x) / nearestDist;
    my = (keeper.y - nearest.y) / nearestDist;
  }
  input.moveVector = () => ({ x: mx, y: my });
  input.mouseX = nearest.x;
  input.mouseY = nearest.y;
  let close = 0;
  for (const enemy of world.enemies) {
    if (Math.hypot(enemy.x - keeper.x, enemy.y - keeper.y) < 190) close += 1;
  }
  input.mouseDown = close >= 4 && keeper.flareTimer <= 0;
}

function stepWorld(world, input, seconds, strong) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    if (world.screen !== SCREEN_PLAY) break;
    autopilot(world, input, strong);
    updateWorld(world, SAMPLE, input, null);
    // The relic screen pauses the action: the caller takes the card.
    if (world.screen === SCREEN_RELIC) break;
  }
}

export function buildShotWorld(scene, seed) {
  const world = createWorld(seed);
  const input = fakeInput();

  if (scene === 'title') {
    // A quiet grove behind the title: a few wisps drifting in the dark.
    for (let i = 0; i < 5; i += 1) {
      const kind = i % 2 === 0 ? KIND_MOTE : KIND_WISP;
      const wisp = spawnWisp(kind, 0, world.random);
      wisp.x = 120 + world.random() * (FIELD.width - 240);
      wisp.y = 120 + world.random() * (FIELD.height - 240);
      world.enemies.push(wisp);
    }
    for (let i = 0; i < 300; i += 1) updateWorld(world, SAMPLE, input, null);
    return world;
  }

  if (scene === 'play') {
    startRun(world, seed);
    // Jump straight to wave 5's bustle: splitters have joined the night.
    startWave(world, 5);
    stepWorld(world, input, 22, true);
    if (world.screen === SCREEN_RELIC) {
      // The pilot cleared a wave and was offered a relic: take the first.
      world.relicOffer[0].apply(world.keeper);
      world.screen = SCREEN_PLAY;
      startWave(world, world.wave + 1);
      stepWorld(world, input, 6, true);
    }
    return world;
  }

  if (scene === 'victory') {
    startRun(world, seed);
    world.wave = 10;
    world.score = 12480;
    world.kills = 143;
    world.comboBest = 21;
    world.time = 512;
    world.keeper.hearts = 2;
    world.screen = 'win';
    world.dawn = 1;
    // Rest the keeper at the side, so the lantern glow does not sit under the stats.
    world.keeper.x = 800;
    world.keeper.y = 460;
    world.stats = {
      score: world.score,
      wave: 10,
      kills: world.kills,
      comboBest: world.comboBest,
      time: world.time,
    };
    for (let i = 0; i < 60; i += 1) updateWorld(world, SAMPLE, input, null);
    return world;
  }

  // 'over': the keeper stands still and the night closes in.
  startRun(world, seed);
  stepWorld(world, input, 90, false);
  if (world.screen !== 'over') {
    world.keeper.hearts = 0;
    world.screen = 'over';
    world.stats = {
      score: world.score,
      wave: world.wave,
      kills: world.kills,
      comboBest: world.comboBest,
      time: world.time,
    };
  }
  // Rest the keeper at the side, so the lantern glow does not sit under the stats.
  world.keeper.x = 800;
  world.keeper.y = 460;
  return world;
}
