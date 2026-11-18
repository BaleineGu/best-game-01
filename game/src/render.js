// Everything Emberlight shows: the grove, the keeper, the wisps, the HUD and
// the five screens. It only reads the world; it never changes it. The canvas
// is 960x600 logical pixels and CSS scales it to the window.

import { FIELD } from './config.js';
import { KINDS } from './enemies.js';
import { SCREEN_TITLE, SCREEN_RELIC, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN } from './world.js';

export const CARD_WIDTH = 240;
export const CARD_HEIGHT = 170;
export const CARD_GAP = 24;

// Card rectangles for the relic screen, in canvas pixels, for click picking.
export function relicCardRects() {
  const total = CARD_WIDTH * 3 + CARD_GAP * 2;
  const x0 = (FIELD.width - total) / 2;
  const y = 250;
  return [0, 1, 2].map((i) => ({
    x: x0 + i * (CARD_WIDTH + CARD_GAP),
    y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  }));
}

// Stars placed by a fixed hash so the night sky never flickers between frames.
const STARS = [];
for (let i = 0; i < 90; i += 1) {
  const h = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  const frac = h - Math.floor(h);
  const h2 = Math.sin(i * 269.5 + 183.3) * 28001.8384;
  const frac2 = h2 - Math.floor(h2);
  STARS.push({
    x: frac * FIELD.width,
    y: frac2 * FIELD.height,
    r: 0.6 + frac2 * 1.4,
    tw: 0.4 + frac * 0.6,
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, '#0b1026');
  grad.addColorStop(0.6, '#141238');
  grad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const t = world.time;
  for (const star of STARS) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.8 + star.x));
    ctx.globalAlpha = a * star.tw;
    ctx.fillStyle = '#e0e7ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // A few sleeping trees at the edges, for depth.
  ctx.fillStyle = '#0a0f24';
  for (let i = 0; i < 7; i += 1) {
    const x = 40 + i * 140;
    ctx.beginPath();
    ctx.moveTo(x, FIELD.height);
    ctx.lineTo(x + 14, FIELD.height - 90 - (i % 3) * 18);
    ctx.lineTo(x + 28, FIELD.height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDrops(ctx, world) {
  for (const drop of world.drops) {
    const bob = Math.sin(world.time * 3 + drop.x) * 3;
    const y = drop.y + bob;
    ctx.save();
    ctx.shadowBlur = 12;
    if (drop.kind === 'shard') {
      ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(drop.x, y - 8);
      ctx.lineTo(drop.x + 6, y);
      ctx.lineTo(drop.x, y + 8);
      ctx.lineTo(drop.x - 6, y);
      ctx.closePath();
      ctx.fill();
    } else if (drop.kind === 'oil') {
      ctx.shadowColor = '#f59e0b';
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(drop.x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(drop.x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = '#fb7185';
      ctx.fillStyle = '#fb7185';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥', drop.x, y);
    }
    ctx.restore();
  }
}

function drawEnemies(ctx, world) {
  const keeper = world.keeper;
  for (const enemy of world.enemies) {
    const def = KINDS[enemy.kind];
    const dist = Math.hypot(enemy.x - keeper.x, enemy.y - keeper.y);
    const lit = dist <= keeper.lightRadius;
    ctx.save();
    ctx.globalAlpha = lit ? 1 : 0.72;
    ctx.shadowColor = def.glow;
    ctx.shadowBlur = lit ? 18 : 6;
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : def.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Eyes that watch the keeper.
    const angle = Math.atan2(keeper.y - enemy.y, keeper.x - enemy.x);
    const ex = Math.cos(angle) * enemy.radius * 0.35;
    const ey = Math.sin(angle) * enemy.radius * 0.35;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(enemy.x + ex - 4, enemy.y + ey - 2, 2.4, 0, Math.PI * 2);
    ctx.arc(enemy.x + ex + 4, enemy.y + ey - 2, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Brutes and splitters wear their health on their face.
    if (enemy.maxHp > 3) {
      ctx.fillStyle = 'rgba(15,23,42,0.7)';
      ctx.fillRect(enemy.x - 18, enemy.y - enemy.radius - 12, 36, 5);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(enemy.x - 18, enemy.y - enemy.radius - 12, 36 * (enemy.hp / enemy.maxHp), 5);
    }
    ctx.restore();
  }
}

function drawEmbers(ctx, world) {
  for (const ember of world.embers) {
    ctx.save();
    ctx.shadowColor = '#fb923c';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fdba74';
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff7ed';
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawKeeper(ctx, world) {
  const keeper = world.keeper;
  const blink = keeper.shimmer > 0 && Math.floor(world.time * 12) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  // The lantern's glow, warm against the night.
  const glow = ctx.createRadialGradient(keeper.x, keeper.y, 10, keeper.x, keeper.y, keeper.lightRadius);
  glow.addColorStop(0, 'rgba(253,230,138,0.36)');
  glow.addColorStop(0.6, 'rgba(251,191,36,0.10)');
  glow.addColorStop(1, 'rgba(251,191,36,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(keeper.x, keeper.y, keeper.lightRadius, 0, Math.PI * 2);
  ctx.fill();
  // The keeper: a hooded figure with a lantern.
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(keeper.x, keeper.y, keeper.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(keeper.x, keeper.y - 4, 7, 0, Math.PI * 2);
  ctx.fill();
  // The lantern swings toward the aim.
  const aim = Math.atan2(keeper.aimY - keeper.y, keeper.aimX - keeper.x);
  const lx = keeper.x + Math.cos(aim) * 22;
  const ly = keeper.y + Math.sin(aim) * 22;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(lx, ly, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(lx, ly, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDarkness(ctx, world) {
  // Night presses in from the edges; the lantern holds it back.
  const keeper = world.keeper;
  const grad = ctx.createRadialGradient(
    keeper.x, keeper.y, keeper.lightRadius * 0.55,
    keeper.x, keeper.y, keeper.lightRadius + 260,
  );
  grad.addColorStop(0, 'rgba(2,6,23,0)');
  grad.addColorStop(1, 'rgba(2,6,23,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of world.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

function drawHud(ctx, world) {
  const keeper = world.keeper;
  ctx.save();
  ctx.textBaseline = 'middle';
  // Hearts.
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  let hearts = '';
  for (let i = 0; i < keeper.maxHearts; i += 1) hearts += i < keeper.hearts ? '♥' : '♡';
  ctx.fillStyle = '#fda4af';
  ctx.fillText(hearts, 16, 26);
  // Wave and score.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0e7ff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`Wave ${Math.max(world.wave, 1)} / 10`, FIELD.width / 2, 20);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${world.score}`, FIELD.width - 16, 20);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Best ${world.best}`, FIELD.width - 16, 42);
  // Combo, when it is alive.
  if (world.combo >= 2) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fdba74';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Combo x${(1 + world.combo * 0.1).toFixed(1)}  (${world.combo})`, FIELD.width / 2, 46);
  }
  // Flare cooldown, bottom left.
  const ready = keeper.flareTimer <= 0;
  ctx.textAlign = 'left';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = ready ? '#fde68a' : '#64748b';
  ctx.fillText(ready ? '✦ Flare ready — click or Space' : `✦ Flare ${keeper.flareTimer.toFixed(1)}s`, 16, FIELD.height - 16);
  // Wave banner.
  if (world.bannerTimer > 0) {
    ctx.globalAlpha = Math.min(1, world.bannerTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(world.banner, FIELD.width / 2, 120);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,15,36,0.82)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(2,6,23,0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('EMBERLIGHT', FIELD.width / 2, 150);
  ctx.fillStyle = '#e0e7ff';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('Keeper of the Last Lantern', FIELD.width / 2, 190);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Wisps fear your lantern light — inside it they slow and burn twice as fast.', FIELD.width / 2, 250);
  ctx.fillText('Survive 10 waves until dawn. Pick a relic after every wave you clear.', FIELD.width / 2, 278);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Move — WASD / arrows · Flare — click or Space · Pause — P · Mute — M', FIELD.width / 2, 330);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fffbeb';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Click or press Enter to begin', FIELD.width / 2, 400);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Best score ${world.best}`, FIELD.width / 2, 440);
  }
  ctx.restore();
}

function drawRelicScreen(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(2,6,23,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillText(`Wave ${world.wave} cleared!`, FIELD.width / 2, 120);
  ctx.fillStyle = '#e0e7ff';
  ctx.font = '19px sans-serif';
  ctx.fillText('The grove holds — for now. Choose a relic:', FIELD.width / 2, 160);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Click a card, or press 1, 2 or 3', FIELD.width / 2, 186);
  const rects = relicCardRects();
  world.relicOffer.forEach((relic, i) => {
    const r = rects[i];
    panel(ctx, r.x, r.y, r.width, r.height);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '40px sans-serif';
    ctx.fillText(relic.icon, r.x + r.width / 2, r.y + 52);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(relic.name, r.x + r.width / 2, r.y + 98);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '15px sans-serif';
    ctx.fillText(relic.blurb, r.x + r.width / 2, r.y + 128);
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText(`[${i + 1}]`, r.x + r.width / 2, r.y + 152);
  });
  ctx.restore();
}

function drawStats(ctx, world, y) {
  const s = world.stats;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0e7ff';
  ctx.font = '20px sans-serif';
  const mins = Math.floor(s.time / 60);
  const secs = Math.floor(s.time % 60).toString().padStart(2, '0');
  ctx.fillText(`Score ${s.score}    ·    Reached wave ${s.wave}    ·    ${s.kills} wisps banished`, FIELD.width / 2, y);
  ctx.fillText(`Best combo ${s.comboBest}    ·    Survived ${mins}:${secs}`, FIELD.width / 2, y + 32);
  if (s.score >= world.best && s.score > 0) {
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('★ New best score ★', FIELD.width / 2, y + 66);
  }
}

function drawOver(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,4,12,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fda4af';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText('The night takes the grove', FIELD.width / 2, 170);
  ctx.fillStyle = '#e0e7ff';
  ctx.font = '18px sans-serif';
  ctx.fillText('Your lantern gutters out — but the grove remembers its keeper.', FIELD.width / 2, 210);
  drawStats(ctx, world, 270);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fffbeb';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Press R or click to play again', FIELD.width / 2, 420);
  ctx.restore();
}

function drawWin(ctx, world) {
  ctx.save();
  const dawnGrad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  dawnGrad.addColorStop(0, 'rgba(253,224,130,0.55)');
  dawnGrad.addColorStop(0.5, 'rgba(251,146,60,0.35)');
  dawnGrad.addColorStop(1, 'rgba(2,6,23,0.25)');
  ctx.fillStyle = dawnGrad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fffbeb';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText('Dawn breaks', FIELD.width / 2, 160);
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('Ten waves, and the light holds. The grove is yours again.', FIELD.width / 2, 200);
  drawStats(ctx, world, 270);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fffbeb';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Press R or click to play again', FIELD.width / 2, 420);
  ctx.restore();
}

function drawPause(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(2,6,23,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('Paused', FIELD.width / 2, 260);
  ctx.fillStyle = '#e0e7ff';
  ctx.font = '18px sans-serif';
  ctx.fillText('P or Esc to return · R to restart · M to mute', FIELD.width / 2, 300);
  ctx.restore();
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0.5) {
    // Time-based shake, so a screenshot scene renders the same frame twice.
    const s = world.shake;
    ctx.translate(Math.sin(world.time * 127.1) * s * 0.5, Math.cos(world.time * 149.3) * s * 0.5);
  }
  drawBackground(ctx, world);
  // The lantern's glow lights the scene before the darkness closes in.
  drawDrops(ctx, world);
  drawEnemies(ctx, world);
  drawEmbers(ctx, world);
  drawKeeper(ctx, world);
  drawParticles(ctx, world);
  if (world.screen !== SCREEN_WIN) drawDarkness(ctx, world);
  if (world.screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
  } else if (world.screen === SCREEN_RELIC) {
    drawHud(ctx, world);
    drawRelicScreen(ctx, world);
  } else if (world.screen === SCREEN_OVER) {
    drawOver(ctx, world);
  } else if (world.screen === SCREEN_WIN) {
    drawWin(ctx, world);
  } else if (world.screen === SCREEN_PAUSE) {
    drawHud(ctx, world);
    drawPause(ctx);
  } else {
    drawHud(ctx, world);
  }
  ctx.restore();
}
