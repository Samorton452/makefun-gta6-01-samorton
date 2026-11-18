// Solmar Heat v2 — boot, the fixed-step loop, and the glue between every system:
// driving (with drift and wrecks), crimes, police (roadblocks + helicopter), missions
// (ten jobs), pickups (health, armour, weapons, ammo, cash), busted/wasted, save/load
// and the screenshot staging. The game moves between menu / playing / paused / busted /
// wasted / end.
import * as THREE from 'three';
import { STEP, WEAPONS, WEAPON_ORDER, WEATHER_ORDER, WEATHER_LABELS, MISSION_REWARDS } from './config.js';
import { createRandom } from './random.js';
import {
  createInput,
  ACTION_ENTER_CAR, ACTION_RELOAD, ACTION_WEAPON, ACTION_PAUSE,
  ACTION_JUMP, ACTION_RADIO, ACTION_MUTE, ACTION_WEATHER, ACTION_HORN, ACTION_SHOOT,
  ACTION_MINIMAP_ZOOM,
} from './input.js';
import { createAudio } from './audio.js';
import { createCity } from './city.js';
import { createPlayer, stepPlayerOnFoot, updateCamera, freshAmmo } from './player.js';
import { createCar, addHeadlights, driveCar, removeCar } from './vehicles.js';
import { createTraffic, stepTraffic, trafficTarget, adjustTrafficCount } from './traffic.js';
import { createPedestrians, stepPedestrians, scarePeds } from './pedestrians.js';
import { createPolice, addWanted, stepPolice, clearPolice } from './police.js';
import { createCombat, tryShoot, stepCombat, spawnParticles, spawnExplosion } from './combat.js';
import { createMissions, startMission, stepMissions, abortMission } from './missions.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createWeather, stepWeather, isRaining } from './weather.js';
import { loadSave, writeSave, applySave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261117;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);

// --- Renderer / scene -------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d9);
scene.fog = new THREE.Fog(0x87b5d9, 160, 800);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 40, 120);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Systems ----------------------------------------------------------------
const audio = createAudio();
const city = createCity(scene, random);
const player = createPlayer(scene);
const traffic = createTraffic(scene, city, random, 15);
const peds = createPedestrians(scene, city, random, 34);
const police = createPolice(scene);
const combat = createCombat(scene);
const missions = createMissions(scene);
const weather = createWeather(scene);
const hud = createHud();
const minimap = createMinimap(document.getElementById('minimap'));
const input = createInput(canvas);

// Parked cars the player can steal, scattered on roadside lanes.
const parkedCars = [];
const PARKED_TYPES = ['sedan', 'sedan', 'taxi', 'sports', 'truck', 'muscle', 'van', 'sedan', 'muscle', 'taxi', 'sports', 'sedan'];
for (let i = 0; i < 12; i += 1) {
  const type = PARKED_TYPES[i % PARKED_TYPES.length];
  const p = city.randomRoadPoint(random);
  const horizontal = Math.abs(p.z - city.nearestStreet(p.z)) < 0.01;
  const street = horizontal ? p.z : p.x;
  const x = horizontal ? p.x : street + (random() < 0.5 ? 6.5 : -6.5);
  const z = horizontal ? street + (random() < 0.5 ? 6.5 : -6.5) : p.z;
  const yaw = horizontal ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI);
  const car = createCar(scene, type, x, z, yaw);
  car.driver = null;
  parkedCars.push(car);
}
const allCars = [...traffic, ...parkedCars];

// Pickups: health, armour, weapons, ammo and cash around town.
const pickups = [];
function addPickup(kind, x, z, weapon) {
  const colors = {
    health: 0x37d67a,
    armour: 0x3a9bdc,
    weapon: 0xff8800,
    ammo: 0xe8d44d,
    cash: 0xffd23c,
  };
  const color = colors[kind] || 0xffffff;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 }),
  );
  mesh.position.set(x, 1.1, z);
  mesh.rotation.y = Math.PI / 4;
  scene.add(mesh);
  pickups.push({ kind, weapon: weapon || null, mesh, x, z, respawn: 0, taken: false });
}
addPickup('health', 80, -240); // hospital
addPickup('health', -80, 240);
addPickup('armour', -160, -240); // police station
addPickup('armour', 240, -240);
addPickup('health', 0, 40); // park
addPickup('armour', 160, 280); // beach bar
addPickup('weapon', -240, 280, 'smg'); // the dock
addPickup('weapon', 240, 240, 'shotgun'); // warehouse
addPickup('ammo', 0, -80); // bank
addPickup('ammo', -240, -240); // safehouse
addPickup('cash', 160, -160); // Mara's house
addPickup('cash', -80, 80); // garage

const G = {
  scene, camera, renderer, city, player, traffic, peds, police, combat, missions,
  weather, hud, minimap, audio, input, parkedCars, allCars, pickups,
  mode: 'menu',
  time: 0,
  menuOrbit: 0,
  minimapZoom: false,
  trafficTimer: 0,
  skidTimer: 0,
  spawnRivalCar() {
    const px = player.pos.x;
    const pz = player.pos.z;
    const car = createCar(scene, 'sports', px + 30, city.nearestStreet(pz + 20), 0, 0xc22e2e);
    car.driver = 'rival';
    allCars.push(car);
    return car;
  },
};

/** Park any leftover mission cars (rivals / the GT) so a restart is clean. */
function clearMissionCars() {
  for (const car of allCars) {
    if (car.driver === 'rival') {
      car.driver = null;
      if (!parkedCars.includes(car)) parkedCars.push(car);
    }
  }
}

function announce(message) {
  status.textContent = message;
}

function damagePlayer(amount, cause) {
  if (G.mode !== 'playing') return;
  let left = amount;
  if (player.armour > 0) {
    const absorbed = Math.min(player.armour, left * 0.6);
    player.armour -= absorbed;
    left -= absorbed;
  }
  player.health -= left;
  hud.flashDamage();
  if (player.health <= 0) {
    player.health = 0;
    wasted();
  }
}

function wasted() {
  abortMission(missions);
  clearMissionCars();
  clearPolice(police, scene);
  police.wanted = 0;
  audio.stopSiren();
  audio.busted();
  player.cash = Math.max(0, player.cash - 150);
  G.mode = 'wasted';
  hud.showPanel('wasted');
  announce('Wasted. You woke up in the hospital.');
}

function busted() {
  abortMission(missions);
  clearMissionCars();
  clearPolice(police, scene);
  police.wanted = 0;
  audio.stopSiren();
  audio.busted();
  player.cash = Math.max(0, player.cash - 200);
  G.mode = 'busted';
  hud.showPanel('busted');
  announce('Busted. The police took you in.');
}

function respawn(x, z) {
  if (player.inCar) {
    player.inCar.driver = null;
    player.inCar = null;
  }
  player.pos.set(x, 0, z);
  player.model.visible = true;
  player.health = 100;
  player.armour = 0;
  player.stamina = 100;
  player.exhausted = false;
  player.model.rotation.x = 0;
  G.mode = 'playing';
  hud.showPanel('play');
  input.requestLock();
}

function startPlaying(fromSave) {
  if (fromSave) {
    const data = loadSave();
    if (data) applySave(G, data);
  } else {
    player.cash = 250;
    player.health = 100;
    player.armour = 0;
    player.stamina = 100;
    player.exhausted = false;
    player.pos.set(0, 0, -40);
    player.weapon = 'pistol';
    player.weapons = ['fists', 'pistol'];
    player.ammoMap = freshAmmo();
    missions.completed = [];
    clearMissionCars();
    abortMission(missions);
    clearPolice(police, scene);
    police.wanted = 0;
  }
  G.mode = 'playing';
  hud.showPanel('play');
  hud.renderMissionList(missions, (i) => startMissionFromMenu(i));
  audio.unlock();
  audio.startEngine();
  audio.startRadio();
  input.requestLock();
  announce('Playing. Press P for missions.');
}

function startMissionFromMenu(i) {
  if (G.mode === 'menu') startPlaying(false);
  else if (G.mode === 'paused') G.mode = 'playing';
  abortMission(missions);
  clearMissionCars();
  const m = startMission(missions, i, G);
  hud.showToast(`${m.title}: ${m.brief}`, 5000);
  hud.showPanel('play');
  input.requestLock();
}

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of allCars) {
    if (car.dead) continue;
    const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}

function enterCar(car) {
  const wasParked = car.driver === null;
  const wasTraffic = car.driver === 'traffic';
  const wasPolice = car.type === 'police';
  if (wasTraffic) {
    const idx = traffic.indexOf(car);
    if (idx >= 0) traffic.splice(idx, 1);
  }
  if (wasParked || wasTraffic) {
    addWanted(police, wasPolice ? 2 : 1, audio);
    hud.showToast(wasPolice ? 'You stole a police cruiser! The law is coming.' : 'Grand theft auto — the cops noticed.', 2200);
  }
  car.driver = 'player';
  player.inCar = car;
  player.model.visible = false;
  player.camYaw = car.yaw + Math.PI;
  addHeadlights(scene, car);
  audio.setEngine(0, true, car.type);
}

function exitCar() {
  const car = player.inCar;
  car.driver = null;
  if (!parkedCars.includes(car)) parkedCars.push(car);
  const sideX = car.pos.x + Math.cos(car.yaw) * 2.2;
  const sideZ = car.pos.z - Math.sin(car.yaw) * 2.2;
  const spot = city.resolveCircle(sideX, sideZ, 0.6);
  player.pos.set(spot.x, 0, spot.z);
  player.model.visible = true;
  player.inCar = null;
  audio.setEngine(0, false);
}

/** The player's car was wrecked (rammed or shot to pieces): bail out on foot. */
function wreckPlayerCar(car) {
  spawnExplosion(combat, car.pos.x, 1, car.pos.z);
  audio.crash();
  audio.stopSiren();
  if (player.inCar === car) {
    const spot = city.resolveCircle(car.pos.x + 2.5, car.pos.z + 2.5, 0.6);
    player.pos.set(spot.x, 0, spot.z);
    player.model.visible = true;
    player.inCar = null;
  }
  hud.showToast('Your car is wrecked! Bail out!', 2600);
  damagePlayer(20, 'wreck');
}

// --- Crime callbacks --------------------------------------------------------
function onHit(kind, target, killed) {
  if (kind === 'ped') {
    if (killed) {
      addWanted(police, 1, audio);
      player.cash += 15;
      hud.showToast('+$15 — the pedestrian dropped some cash.', 1500);
    } else {
      addWanted(police, 1, audio);
    }
    scarePeds(peds, target.pos.x, target.pos.z, 25);
  } else if (kind === 'cop') {
    if (killed) {
      addWanted(police, 2, audio);
      hud.showToast('You took down a cop! Heat is way up.', 2200);
    } else {
      addWanted(police, 1, audio);
    }
  } else if (kind === 'car' && target === missions.rival) {
    // Shooting the mission-4 rival wears it down; the mission step watches its health.
    missions.rivalHealth -= WEAPONS[player.weapon].damage;
    if (missions.rivalHealth <= 0 && !target.dead) {
      target.dead = true;
      target.speed = 0;
    }
  }
}

/** A car was destroyed by gunfire (not the rival path in onHit). */
function onCarWrecked(car) {
  if (car === player.inCar) {
    wreckPlayerCar(car);
  } else if (car.type === 'police') {
    addWanted(police, 1, audio);
    hud.showToast('You blew up a police cruiser!', 2000);
  }
}

// --- One fixed step ---------------------------------------------------------
function step(dt, actions) {
  G.time += dt;
  stepWeather(weather, dt, camera, city, audio);
  stepCombat(combat, dt);

  if (G.mode !== 'playing') {
    if (G.mode === 'menu') {
      G.menuOrbit += dt * 0.05;
      camera.position.set(Math.sin(G.menuOrbit) * 150, 55, Math.cos(G.menuOrbit) * 150);
      camera.lookAt(0, 5, 0);
      stepTraffic(traffic, dt, city, allCars, null);
      stepPedestrians(peds, dt, city, null, 0);
    }
    return;
  }

  // --- Global action keys ---
  if (actions & ACTION_PAUSE) {
    G.mode = 'paused';
    hud.showPanel('pause');
    hud.renderMissionList(missions, (i) => startMissionFromMenu(i));
    document.exitPointerLock?.();
    announce('Paused.');
    return;
  }
  if (actions & ACTION_MUTE) {
    const muted = audio.toggleMute();
    hud.showToast(muted ? 'Sound muted (M to unmute)' : 'Sound on', 1200);
  }
  if (actions & ACTION_RADIO) {
    hud.showToast(`Radio: ${audio.nextStation()}`, 1800);
  }
  if (actions & ACTION_WEATHER) {
    const idx = WEATHER_ORDER.indexOf(weather.weather);
    weather.weather = WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
    weather.lightningTimer = 6;
    hud.showToast(`Weather: ${WEATHER_LABELS[weather.weather]}`, 1500);
  }
  if (actions & ACTION_MINIMAP_ZOOM) {
    G.minimapZoom = !G.minimapZoom;
    hud.showToast(G.minimapZoom ? 'Minimap zoomed (N to zoom out)' : 'Minimap: whole city', 1200);
  }
  if (actions & ACTION_WEAPON) {
    const owned = WEAPON_ORDER.filter((k) => player.weapons.includes(k));
    const idx = owned.indexOf(player.weapon);
    player.weapon = owned[(idx + 1) % owned.length];
    hud.showToast(`Weapon: ${WEAPONS[player.weapon].name}`, 1200);
    audio.click();
  }
  if (actions & ACTION_RELOAD && player.weapon !== 'fists') {
    const w = WEAPONS[player.weapon];
    const a = player.ammoMap[player.weapon];
    if (a && a.reserve > 0 && a.mag < w.ammo) {
      const need = w.ammo - a.mag;
      const take = Math.min(need, a.reserve);
      a.mag += take;
      a.reserve -= take;
      combat.reloadTimer = 0.6;
      audio.click();
    }
  }

  // --- On foot / driving ---
  if (player.inCar) {
    const car = player.inCar;
    const axes = input.axes();
    const mouse = input.takeMouse();
    player.camYaw -= mouse.dx * 0.002;
    const handbrake = input.isDown('Space');
    const hitWall = driveCar(car, dt, axes.z, -axes.x, city, allCars, handbrake);
    if (hitWall && Math.abs(car.speed) > 6) {
      audio.crash();
      spawnParticles(combat, car.pos.x, 1, car.pos.z, 6, 0xaaaaaa);
    }
    // Drifting kicks up smoke and a skid sound.
    if (car.skidding) {
      G.skidTimer -= dt;
      spawnParticles(combat, car.pos.x, 0.4, car.pos.z, 2, 0xcccccc);
      if (G.skidTimer <= 0) {
        audio.skid();
        G.skidTimer = 0.35;
      }
    }
    audio.setEngine(Math.abs(car.speed) / car.tune.topSpeed, true, car.type);
    if (actions & ACTION_HORN) audio.horn();
    if (actions & ACTION_ENTER_CAR) exitCar();
    // Shooting from a car is not allowed; click honks instead.
    if (actions & ACTION_SHOOT) audio.horn();
    // The car was wrecked by a ram or a shot: bail out, and skip the rest of
    // the driving branch (the player is on foot again from here).
    if (car.dead) {
      wreckPlayerCar(car);
    } else {
      // Running over pedestrians is a crime.
      for (const ped of peds) {
        if (ped.state === 'down') continue;
        const d = Math.hypot(ped.pos.x - car.pos.x, ped.pos.z - car.pos.z);
        if (d < 2.4 && Math.abs(car.speed) > 4) {
          ped.state = 'down';
          ped.health = 0;
          addWanted(police, 1, audio);
          audio.crash();
          scarePeds(peds, ped.pos.x, ped.pos.z, 25);
          spawnParticles(combat, ped.pos.x, 1, ped.pos.z, 8, 0xff6666);
          hud.showToast('You hit a pedestrian!', 1600);
        }
      }
      // Police ramming the player's car hurts the player.
      for (const pc of police.cars) {
        const d = Math.hypot(pc.pos.x - car.pos.x, pc.pos.z - car.pos.z);
        if (d < 3.4 && Math.abs(pc.speed) > 8) damagePlayer(25 * dt, 'ram');
      }
      player.pos.set(car.pos.x, 0, car.pos.z);
    }
  } else {
    stepPlayerOnFoot(player, input, actions, dt, city);
    audio.setEngine(0, false);
    if (actions & ACTION_ENTER_CAR) {
      const car = nearestCar(4.5);
      if (car) enterCar(car);
    }
    if (actions & ACTION_SHOOT || input.mouseDown()) {
      const result = tryShoot(combat, player, camera, peds, police.cops, allCars, dt, onHit, onCarWrecked);
      if (result === 'shot') {
        if (player.weapon === 'smg') audio.smgShoot();
        else if (player.weapon === 'shotgun') audio.shotgun();
        else audio.shoot();
      } else if (result === 'melee') {
        audio.punch();
      } else if (result === 'dry') {
        audio.click();
        hud.showToast('Out of ammo — press R to reload', 1400);
      }
    }
    // Foot cops can hurt the player up close.
    for (const cop of police.cops) {
      if (cop.state === 'down') continue;
      const d = Math.hypot(cop.pos.x - player.pos.x, cop.pos.z - player.pos.z);
      if (d < 1.8) damagePlayer(9 * dt, 'cop');
    }
  }

  // --- World life ---
  // Rush hour: more traffic in the morning and evening, fewer at night.
  G.trafficTimer -= dt;
  if (G.trafficTimer <= 0) {
    adjustTrafficCount(traffic, scene, city, random, trafficTarget(weather.timeOfDay));
    G.trafficTimer = 5;
  }
  stepTraffic(traffic, dt, city, allCars, player.pos, { audio });
  stepPedestrians(peds, dt, city, player.pos, player.inCar ? Math.abs(player.inCar.speed) : 0, isRaining(weather));
  const policeResult = stepPolice(police, dt, scene, city, player, player.inCar, allCars, audio);
  if (policeResult === 'busted') {
    busted();
    return;
  }

  // Rival car flees the player (mission 4).
  const rival = missions.rival;
  if (rival && !rival.dead) {
    const dx = rival.pos.x - player.pos.x;
    const dz = rival.pos.z - player.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    const fleeX = rival.pos.x + (dx / dist) * 60;
    const fleeZ = rival.pos.z + (dz / dist) * 60;
    const targetYaw = Math.atan2(fleeX - rival.pos.x, fleeZ - rival.pos.z);
    let diff = targetYaw - rival.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    driveCar(rival, dt, 0.9, THREE.MathUtils.clamp(diff * 1.5, -1, 1), city, allCars);
  }

  // Mission 10 rivals chase the player and try to ram the GT.
  if (missions.activeIndex === 9) {
    for (const r of missions.rivals) {
      if (r.dead) continue;
      const dx = player.pos.x - r.pos.x;
      const dz = player.pos.z - r.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - r.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      driveCar(r, dt, dist > 8 ? 0.95 : 0.5, THREE.MathUtils.clamp(diff * 1.5, -1, 1), city, allCars);
      // A hard ram from a rival hurts the player.
      if (dist < 3.4 && Math.abs(r.speed) > 8) damagePlayer(20 * dt, 'ram');
    }
  }

  // Smoking cars trail grey puffs.
  for (const car of allCars) {
    if (car.smoking && !car.dead) {
      car.smokeTimer -= dt;
      if (car.smokeTimer <= 0) {
        spawnParticles(combat, car.pos.x, 1.2, car.pos.z, 2, 0x777777);
        car.smokeTimer = 0.4;
      }
    }
  }

  // --- Missions ---
  const missionResult = stepMissions(missions, dt, G);
  if (missionResult === 'complete') {
    const reward = MISSION_REWARDS[missions.completed.length - 1];
    hud.showToast(`Mission complete! +$${reward}`, 3500);
    writeSave(G); // autosave on every completed job
    if (missions.completed.length >= 10) {
      G.mode = 'end';
      hud.showEnd('YOU OWN SOLMAR', `All ten jobs done. Mara's crew runs the coast now — $${Math.floor(player.cash).toLocaleString()} in your pocket. Free roam continues from the menu.`);
      announce('All missions complete.');
    } else {
      hud.renderMissionList(missions, (i) => startMissionFromMenu(i));
    }
  } else if (missionResult === 'failed') {
    hud.showToast(`Mission failed: ${missions.failedReason}`, 3500);
    audio.fail();
    clearMissionCars();
    abortMission(missions);
  }

  // --- Pickups ---
  for (const pk of pickups) {
    if (pk.taken) {
      pk.respawn -= dt;
      if (pk.respawn <= 0) {
        pk.taken = false;
        pk.mesh.visible = true;
      }
      continue;
    }
    pk.mesh.rotation.y += dt * 2;
    pk.mesh.position.y = 1.1 + Math.sin(G.time * 3 + pk.x) * 0.15;
    if (!player.inCar) {
      const d = Math.hypot(pk.x - player.pos.x, pk.z - player.pos.z);
      if (d < 1.8) {
        if (pk.kind === 'health') player.health = Math.min(100, player.health + 50);
        else if (pk.kind === 'armour') player.armour = Math.min(100, player.armour + 50);
        else if (pk.kind === 'weapon' && pk.weapon) {
          if (!player.weapons.includes(pk.weapon)) player.weapons.push(pk.weapon);
          const w = WEAPONS[pk.weapon];
          const a = player.ammoMap[pk.weapon];
          a.mag = w.ammo;
          a.reserve = Math.min(w.reserve, a.reserve + w.ammo);
          player.weapon = pk.weapon;
        } else if (pk.kind === 'ammo' && player.weapon !== 'fists') {
          const w = WEAPONS[player.weapon];
          const a = player.ammoMap[player.weapon];
          a.reserve = Math.min(w.reserve, a.reserve + w.ammo);
        } else if (pk.kind === 'cash') {
          player.cash += 100;
        }
        pk.taken = true;
        pk.mesh.visible = false;
        pk.respawn = 30;
        audio.pickup();
        const labels = {
          health: '+50 health',
          armour: '+50 armour',
          weapon: pk.weapon ? `Picked up the ${WEAPONS[pk.weapon].name}!` : 'Picked up a weapon!',
          ammo: 'Ammo restocked',
          cash: '+$100',
        };
        hud.showToast(labels[pk.kind] || 'Picked up!', 1400);
      }
    }
  }

  // Slow health regen when the heat is off.
  if (police.wanted === 0 && player.health > 0 && player.health < 50) {
    player.health = Math.min(50, player.health + dt * 1.5);
  }

  // Marker pulse.
  if (missions.marker.visible) {
    const s = 1 + Math.sin(G.time * 4) * 0.12;
    missions.marker.scale.set(s, 1, s);
  }

  // Headlights at night.
  const isNight = weather.sun.intensity < 0.4;
  for (const car of allCars) {
    if (car.headlight) car.headlight.intensity = isNight || isRaining(weather) ? 60 : 0;
  }
}

// --- Frame loop -------------------------------------------------------------
let accumulator = 0;
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const actions = input.takeActions();
  accumulator += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  while (accumulator >= STEP) {
    step(STEP, actions);
    accumulator -= STEP;
  }
  // Boats bob and the lighthouse sweeps, even in the menu.
  city.stepCity(G.time);
  // Camera follows every frame (smoothed), even between fixed steps.
  if (G.mode === 'playing' || G.mode === 'paused') {
    updateCamera(player, camera, Math.min(0.05, (now - last) / 1000 + STEP), city, player.inCar);
  }
  hud.update(G);
  minimap.draw(G);
  // Menu backdrop keeps the city alive behind the title.
  renderer.render(scene, camera);
}

// --- Menu wiring ------------------------------------------------------------
document.getElementById('btn-new').addEventListener('click', () => startPlaying(false));
document.getElementById('btn-continue').addEventListener('click', () => {
  if (loadSave()) startPlaying(true);
  else hud.showToast('No saved game yet — start a New Game.', 2200);
});
document.getElementById('btn-resume').addEventListener('click', () => {
  G.mode = 'playing';
  hud.showPanel('play');
  input.requestLock();
});
document.getElementById('btn-restart-mission').addEventListener('click', () => {
  if (missions.activeIndex >= 0) {
    const i = missions.activeIndex;
    abortMission(missions);
    clearMissionCars();
    startMission(missions, i, G);
    hud.showToast('Mission restarted.', 1500);
  }
  G.mode = 'playing';
  hud.showPanel('play');
  input.requestLock();
});
document.getElementById('btn-save').addEventListener('click', () => {
  hud.showToast(writeSave(G) ? 'Game saved.' : 'Could not save (storage unavailable).', 1800);
});
document.getElementById('btn-quit').addEventListener('click', () => {
  G.mode = 'menu';
  hud.showPanel('menu');
  hud.renderMissionList(missions, (i) => startMissionFromMenu(i));
});
document.getElementById('btn-end-menu').addEventListener('click', () => {
  G.mode = 'menu';
  hud.showPanel('menu');
  hud.renderMissionList(missions, (i) => startMissionFromMenu(i));
});
document.getElementById('btn-busted-respawn').addEventListener('click', () => respawn(-160, -240));
document.getElementById('btn-wasted-respawn').addEventListener('click', () => respawn(80, -240));
canvas.addEventListener('click', () => {
  if (G.mode === 'playing') input.requestLock();
});

// --- Boot -------------------------------------------------------------------
hud.renderMissionList(missions, (i) => startMissionFromMenu(i));
hud.showPanel('menu');
announce('Solmar Heat. New Game or Continue.');

if (shot) {
  // Screenshot mode: stage the scene, run it forward a fixed time, then signal ready.
  stageShot(G, shot);
  if (shot === 'menu') {
    hud.showPanel('menu');
  } else {
    hud.showPanel('play');
  }
  const STEPS = 150; // 2.5 s of simulation
  for (let i = 0; i < STEPS; i += 1) {
    step(STEP, 0);
    // Keep the staged car at cruising speed (no keyboard in headless mode).
    if (G.shotSpeed && player.inCar) player.inCar.speed = G.shotSpeed;
    if (G.mode === 'playing') updateCamera(player, camera, STEP, city, player.inCar);
  }
  updateCamera(player, camera, STEP, city, player.inCar);
  hud.update(G);
  minimap.draw(G);
  let painted = 0;
  (function paint() {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  })();
} else {
  requestAnimationFrame(frame);
}
