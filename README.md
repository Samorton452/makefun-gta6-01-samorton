# makefun-gta6-01-samorton

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Samorton452/makefun-gta6-01-samorton/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Samorton452/makefun-gta6-01-samorton/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Heat is an open-world crime game: steal cars, outrun the police helicopter, and work your way up Mara Voss's crew across twelve missions in the city of Solmar — plus a harbour heist for the fixer Lena Cross.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every file the game loads lives under `game/`
(three.js is vendored as `game/vendor/three.module.min.js`). Or open
`game/index.html` directly in desktop Chrome — the game runs fully offline.

---

<sub>Entered on [make.fun](https://make.fun/?ref=zjzg1gnp&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

## The game

- **Free-roam 3D city** — a procedural grid of buildings, roads with markings,
  sidewalks, two parks, a downtown tower district, and a marina pier with a
  lighthouse and bobbing boats at the south edge. Day/night cycle with sun and
  moon, streetlights after dark, and four weather states — clear, rain, fog and
  storm with lightning and thunder (press V to cycle).
- **On foot** — third-person character, walk / run / sprint on a stamina meter,
  jump, mouse-look camera with pointer lock, building collision.
- **Driving** — sedans, taxis, sports cars, trucks, muscle cars, vans, police
  cruisers and the rare gold Sunset GT. Press E near a car to steal it; arcade
  handling with braking, steering, handbrake drifts (Space in a car), collisions
  and a damage model — cars smoke, then wreck and explode.
- **Traffic & pedestrians** — cars drive the grid, turn at intersections, honk
  when stuck, and thicken at rush hour; pedestrians stroll the sidewalks, wait
  at crosswalks, hurry in the rain and flee when scared.
- **Wanted system** — 0–5 stars. Stealing cars, hitting pedestrians, shooting
  and killing cops raise your heat. Police cars and foot cops chase and arrest;
  at 3 stars the PD sets up roadblocks ahead of you, at 4 stars a helicopter
  circles overhead with a searchlight and your heat cannot fade. Lay low out of
  sight and the stars fade. Get busted or wasted and you wake up poorer, but free.
- **Combat** — fists, pistol, automatic SMG and a spread shotgun (Q or mouse
  wheel to swap, R to reload), with muzzle flash, tracers and impact particles.
  Weapon, ammo and cash pickups are scattered around town.
- **Missions & story** — twelve jobs: ten for Mara Voss's crew — get wheels, run cab
  fares, move a hot package, stop a rival crew's car, rob the Solmar Trust Bank,
  shake down three shops, run a 90-second night delivery, hit four checkpoints
  against the clock, survive a 5-star heat wave, and steal the Sunset GT from
  Rico's crew — plus a harbour heist for the new fixer Lena Cross (crack the
  warehouse vault, hold the room at 4 stars, escape to the marina) and a finale,
  The Last Score: collect three vault keys across town, then a timed 90-second
  run to the garage at 3 stars. Objective markers with distances, mission timers,
  cash rewards, replay from the pause menu, and an autosave after every completed job.
- **HUD** — health, armour and stamina bars, cash, wanted stars, weapon and
  ammo with owned-weapon chips, speedometer, clock, weather and district, a live
  minimap (roads, player arrow, mission blip, police blips, helicopter ring,
  pickups; N zooms in on the player), and objective text with a mission timer.
  Eight hidden stash crates pay $250 each on foot — the objective line shows
  how many you've found (Stashes n/8) and unfound stashes show as green
  diamonds on the minimap. Park a damaged car on a teal REPAIR pad (crew
  garage or downtown) to fix it for cash.
- **Sound** — everything synthesized with WebAudio: engine hum tied to speed
  and car type, sirens, gunshots, pickup blips, thunder, skid noise, and three
  procedural radio stations (C to switch, M to mute).
- **Menus & saves** — main menu, pause menu with mission select, save/load via
  localStorage (v2 format: weapons, ammo, station, weather, minimap zoom, found
  stashes), busted / wasted screens, and an end screen when all twelve missions are done.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Mouse | Look (click the game to lock the pointer) |
| Shift | Sprint (drains stamina) |
| Space | Jump / handbrake drift while driving |
| E | Enter / exit car |
| Click | Shoot / punch |
| Q / mouse wheel | Swap weapon (fists / pistol / SMG / shotgun) |
| R | Reload |
| C | Radio station (3 stations) |
| V | Cycle weather (clear → rain → fog → storm) |
| N | Minimap zoom |
| H | Horn |
| M | Mute |
| P / Esc | Pause |

## Screenshots

`1-cover.jpg` — driving a muscle car downtown with the HUD, minimap and a 2-star
wanted level. `2-chase.jpg` — the Heat Wave mission: 5 stars, helicopter overhead
at dusk. `3-mission.jpg` — the Deadline checkpoint race in progress.
`4-menu.jpg` — the main menu over the marina pier and lighthouse at dusk.

All names, characters, places and story beats are original — no Rockstar/GTA
names, no real brands, no copied assets.
