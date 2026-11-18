// The relic cards offered after each cleared wave. The player picks one of
// three (click, or keys 1 / 2 / 3); each relic changes one number on the
// keeper, so the build a player ends with is genuinely theirs.

import { shuffle } from './random.js';

export const RELICS = [
  {
    id: 'sharper',
    name: 'Sharpened Embers',
    icon: '◆',
    blurb: '+1 ember damage',
    apply: (keeper) => { keeper.emberDamage += 1; },
  },
  {
    id: 'rapid',
    name: 'Quick Hands',
    icon: '≋',
    blurb: 'Fire 18% faster',
    apply: (keeper) => { keeper.fireInterval *= 0.82; },
  },
  {
    id: 'lantern',
    name: 'Tall Lantern',
    icon: '☼',
    blurb: '+28 light radius',
    apply: (keeper) => { keeper.lightRadius += 28; },
  },
  {
    id: 'heart',
    name: 'Stout Heart',
    icon: '♥',
    blurb: '+1 max heart, heal 1',
    apply: (keeper) => {
      keeper.maxHearts += 1;
      keeper.hearts = Math.min(keeper.maxHearts, keeper.hearts + 1);
    },
  },
  {
    id: 'boots',
    name: 'Soft Boots',
    icon: '➤',
    blurb: '+12% move speed',
    apply: (keeper) => { keeper.speed *= 1.12; },
  },
  {
    id: 'flare',
    name: 'Bright Flare',
    icon: '✦',
    blurb: 'Flare recharges 30% faster',
    apply: (keeper) => { keeper.flareCooldown *= 0.7; },
  },
  {
    id: 'pierce',
    name: 'Piercing Embers',
    icon: '↗',
    blurb: 'Embers pass through one wisp',
    apply: (keeper) => { keeper.pierce += 1; },
  },
  {
    id: 'magnet',
    name: 'Ember Magnet',
    icon: '◎',
    blurb: 'Drops drift to you from farther',
    apply: (keeper) => { keeper.magnet += 90; },
  },
  {
    id: 'combo',
    name: 'Long Fuse',
    icon: '∞',
    blurb: 'Combo lasts 1.5 s longer',
    apply: (keeper) => { keeper.comboWindow += 1.5; },
  },
  {
    id: 'guard',
    name: 'Thick Shimmer',
    icon: '◐',
    blurb: 'After a hit, shimmer lasts longer',
    apply: (keeper) => { keeper.hurtShimmer += 0.6; },
  },
];

// Three different relics the player does not already hold at its cap.
export function offerRelics(random, taken) {
  const pool = RELICS.filter((relic) => {
    if (relic.id === 'pierce') return (taken.pierce || 0) < 2;
    if (relic.id === 'heart') return (taken.heart || 0) < 2;
    return true;
  });
  return shuffle(random, pool).slice(0, 3);
}
