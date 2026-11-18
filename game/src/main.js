// Emberlight's entry point: the game loop, the screen state machine, and the
// deterministic screenshot mode (?shot=title|play|victory|over&seed=<n>).

import { FIELD, STEP } from './config.js';
import { createWorld, startRun, updateWorld, pickRelic, SCREEN_TITLE, SCREEN_PLAY, SCREEN_RELIC, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render, relicCardRects } from './render.js';
import { buildShotWorld } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const audio = createAudio();

if (shot) {
  // Screenshot mode: one deterministic frame, then signal readiness.
  const seed = Number(params.get('seed') || 1);
  const world = buildShotWorld(shot, seed);
  render(ctx, world);
  window.__shotReady = true;
} else {
  const input = createInput(canvas);
  const world = createWorld((Date.now() % 2147483647) | 0);
  let last = performance.now();
  let acc = 0;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function begin() {
    audio.ensure();
    startRun(world);
    world.mouseWasDown = input.mouseDown;
  }

  canvas.addEventListener('click', (event) => {
    if (world.screen === SCREEN_TITLE || world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) {
      begin();
      return;
    }
    if (world.screen === SCREEN_RELIC) {
      const point = canvasPoint(event);
      const rects = relicCardRects();
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (point.x >= r.x && point.x <= r.x + r.width && point.y >= r.y && point.y <= r.y + r.height) {
          pickRelic(world, i, audio);
          return;
        }
      }
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') {
      audio.ensure();
      audio.toggleMute();
      return;
    }
    if (world.screen === SCREEN_TITLE && (event.code === 'Enter' || event.code === 'Space')) {
      begin();
    } else if ((world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) && event.code === 'KeyR') {
      begin();
    } else if (world.screen === SCREEN_PLAY && (event.code === 'KeyP' || event.code === 'Escape')) {
      world.screen = SCREEN_PAUSE;
    } else if (world.screen === SCREEN_PAUSE && (event.code === 'KeyP' || event.code === 'Escape')) {
      world.screen = SCREEN_PLAY;
    } else if (world.screen === SCREEN_PAUSE && event.code === 'KeyR') {
      begin();
    } else if (world.screen === SCREEN_RELIC) {
      if (event.code === 'Digit1') pickRelic(world, 0, audio);
      if (event.code === 'Digit2') pickRelic(world, 1, audio);
      if (event.code === 'Digit3') pickRelic(world, 2, audio);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.screen === SCREEN_PLAY) world.screen = SCREEN_PAUSE;
  });

  function frame(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += elapsed;
    while (acc >= STEP) {
      updateWorld(world, STEP, input, audio);
      acc -= STEP;
    }
    render(ctx, world);
    requestAnimationFrame(frame);
  }

  render(ctx, world);
  requestAnimationFrame(frame);
}
