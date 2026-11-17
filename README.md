# Solmar Heat — Make GTA 6 (gta6-01)

![bounty](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/Samorton452/makefun-gta6-01-samorton/rank.svg)
![reward](https://make.fun/badge/gta6-01/Samorton452/makefun-gta6-01-samorton/reward.svg)

An open-world crime game in the spirit of GTA 6, built for the make.fun "Make GTA 6"
bounty. Explore the sun-soaked coastal city of **Solmar** on foot or by car, take on
five story missions for the fixer Mara Voss, outrun the Solmar PD, and build your
reputation — all offline, in a desktop browser, from static files.

## The game

- **Free-roam 3D city** — a procedural grid of buildings, roads with markings,
  sidewalks, a park, and a beach with the sea at the south edge. Day/night cycle
  with sun and moon, streetlights after dark, and rain (press V).
- **On foot** — third-person character, walk / run / sprint, jump, mouse-look
  camera with pointer lock, building collision.
- **Driving** — sedans, taxis, sports cars, trucks and police cruisers. Press E
  near a car to steal it; arcade handling with braking, steering and collisions.
- **Traffic & pedestrians** — cars drive the grid and turn at intersections;
  pedestrians stroll the sidewalks and flee when scared.
- **Wanted system** — 0–5 stars. Stealing cars, hitting pedestrians, shooting
  and killing cops raise your heat. Police cars and foot cops chase and arrest;
  lay low out of sight and the stars fade. Get busted or wasted and you wake up
  poorer, but free.
- **Combat** — fists and a pistol (click to shoot, R to reload), with muzzle
  flash, tracers and impact particles.
- **Missions & story** — five jobs for Mara Voss's crew: get wheels, run cab
  fares, move a hot package, stop a rival crew's car, and rob the Solmar Trust
  Bank. Objective markers, step-by-step briefings, cash rewards, replay from
  the pause menu. Health and armour pickups are scattered around town.
- **HUD** — health and armour bars, cash, wanted stars, weapon and ammo,
  speedometer, clock and weather, a live minimap (roads, player arrow, mission
  blip, police blips), and objective text.
- **Sound** — everything synthesized with WebAudio: engine hum tied to speed,
  sirens, gunshots, pickup blips, and two procedural radio stations (C to
  switch, M to mute).
- **Menus & saves** — main menu, pause menu with mission select, save/load via
  localStorage, busted / wasted screens, and an end screen when all five
  missions are done.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Mouse | Look (click the game to lock the pointer) |
| Shift | Sprint |
| Space | Jump |
| E | Enter / exit car |
| Click | Shoot / punch |
| Q | Swap weapon (fists / pistol) |
| R | Reload |
| C | Radio station |
| V | Toggle rain |
| H | Horn |
| M | Mute |
| P / Esc | Pause |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every file the game loads lives under `game/`
(three.js is vendored as `game/vendor/three.module.min.js`).

## Screenshots

`1-cover.jpg` — driving downtown with the HUD, minimap and a 2-star wanted level.
`2-chase.jpg` — a 4-star police chase at dusk. `3-mission.jpg` — the Hot Package
mission in progress. `4-menu.jpg` — the main menu over the city.

All names, characters, places and story beats are original — no Rockstar/GTA
names, no real brands, no copied assets.
