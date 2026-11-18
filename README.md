[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/BaleineGu/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/BaleineGu/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

# Emberlight — Keeper of the Last Lantern

An original top-down arena survival game for the make.fun bounty
`best-game-01` ($1,000, top 10 paid, deadline 2026-11-18T18:00:00Z), by
@guinrm. Plain static files, no network request, no library: open
`game/index.html` in desktop Chrome and play.

## The game

Night has swallowed the grove, and you are the keeper of its last
lantern. Shadow wisps pour in from the dark. Your lantern's light is
your weapon: wisps outside the light are fast and hard to hurt, wisps
inside it slow down and burn twice as fast. Survive all 10 waves until
dawn breaks — and choose one relic after every wave you clear.

- **Move** — WASD or arrow keys (or hold the mouse to steer toward it)
- **Shoot** — embers fly on their own at the nearest wisp; aim with the mouse
- **Flare** — click, or press Space: a burst of light that blasts every
  wisp nearby (6 s cooldown)
- **Relics** — after each wave, pick 1 of 3 (click, or press 1 / 2 / 3):
  sharper embers, faster fire, a wider lantern, a sturdier heart, and more
- **Score** — kills chain into a combo multiplier; shards, oil and hearts
  drop from fallen wisps
- **Pause** — P or Esc · **Mute** — M · **Restart** — R, or the button

Lose all three hearts and the night takes the grove. Clear wave 10 and
the dawn returns — that is the win screen.

## Files

- `game/index.html` + `game/style.css` — the page and its look
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — seeded random, so screenshot scenes repeat
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — WebAudio synth sounds and a quiet pad
- `game/src/enemies.js` — the four wisp kinds and how waves are built
- `game/src/upgrades.js` — the relic cards offered between waves
- `game/src/world.js` — the state, the rules, collisions, scoring
- `game/src/render.js` — canvas drawing, HUD, menus and banners
- `game/src/shots.js` — deterministic `?shot=title|play|victory|over` scenes
- `game/src/main.js` — the loop and the screen state machine
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with `vendor/makefun-game.ts`

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
# or: python3 -m http.server --directory game 8080
```

Screenshots are real renders of the game's own code in headless
Chromium, driven by `?shot=<scene>&seed=<n>` (see `shots.json`).
