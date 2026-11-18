// Wanted level and police v2: stars 0-5, police cars and foot cops that spawn at range,
// chase the player, ram or arrest, and lose the player when they stay hidden. v2 adds
// roadblocks at 3+ stars (parked cruisers across the road ahead, with foot cops) and a
// police helicopter at 4+ stars (see helicopter.js) that pins the wanted level while it
// is overhead. Busted / wasted end the run with a respawn at the hospital or the police
// station.
import * as THREE from 'three';
import { createCar, driveCar, addHeadlights, removeCar } from './vehicles.js';
import { createHelicopter, stepHelicopter } from './helicopter.js';
import { WANTED } from './config.js';

export function createPolice(scene) {
  return {
    cars: [], // police cars chasing
    cops: [], // foot cops (reuse simple person models)
    roadblocks: [], // parked cruiser pairs set up ahead of the player
    heli: createHelicopter(scene),
    heliOverhead: false,
    wanted: 0,
    hiddenTimer: 0,
    spawnTimer: 0,
    bustTimer: 0,
    roadblockTimer: 0,
  };
}

export function addWanted(police, amount, audio) {
  police.wanted = Math.min(WANTED.max, police.wanted + amount);
  police.hiddenTimer = 0;
  if (police.wanted > 0 && audio) audio.startSiren();
}

export function clearWanted(police, audio) {
  police.wanted = 0;
  police.hiddenTimer = 0;
  if (audio) audio.stopSiren();
}

function spawnPoliceCar(police, scene, city, playerPos) {
  // Spawn on a road, 60-90 units from the player.
  const angle = Math.random() * Math.PI * 2;
  const x = THREE.MathUtils.clamp(playerPos.x + Math.cos(angle) * 75, -320, 320);
  const z = THREE.MathUtils.clamp(playerPos.z + Math.sin(angle) * 75, -320, 320);
  const car = createCar(scene, 'police', x, city.nearestStreet(z), Math.atan2(playerPos.x - x, playerPos.z - z));
  car.driver = 'police';
  addHeadlights(scene, car);
  police.cars.push(car);
  return car;
}

function spawnFootCop(police, scene, playerPos) {
  const angle = Math.random() * Math.PI * 2;
  const x = playerPos.x + Math.cos(angle) * 14;
  const z = playerPos.z + Math.sin(angle) * 14;
  // A simple dark-uniform person, built inline here.
  const group = new THREE.Group();
  const uni = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98e6b, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), uni);
  torso.position.y = 1.12;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), skin);
  head.position.y = 1.68;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.38), new THREE.MeshStandardMaterial({ color: 0x10151c }));
  cap.position.y = 1.9;
  group.add(cap);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.78, 0.2), uni);
    leg.position.set(side * 0.16, 0.39, 0);
    group.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.62, 0.15), uni);
    arm.position.set(side * 0.38, 1.16, 0);
    group.add(arm);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  const cop = { model: group, pos: group.position, yaw: 0, health: 60, state: 'chase' };
  police.cops.push(cop);
  return cop;
}

/**
 * Set up a roadblock: two cruisers parked across the road ahead of the player,
 * plus a foot cop. They hold position until the player gets close, then join
 * the chase like any other police car.
 */
function spawnRoadblock(police, scene, city, playerPos, playerYaw) {
  const aheadX = playerPos.x + Math.sin(playerYaw) * 70;
  const aheadZ = playerPos.z + Math.cos(playerYaw) * 70;
  // Park the cruisers across the road: side by side over the lane the player
  // is travelling on (offsets across the road, not along it).
  const alongX = Math.abs(Math.sin(playerYaw)) > Math.abs(Math.cos(playerYaw));
  const cars = [];
  for (const offset of [-4.5, 4.5]) {
    const x = alongX ? aheadX : aheadX + offset;
    const z = alongX ? city.nearestStreet(aheadZ) + offset : city.nearestStreet(aheadX) + offset;
    const car = createCar(scene, 'police', x, z, playerYaw + Math.PI / 2);
    car.driver = 'police';
    car.roadblock = true;
    car.roadblockTimer = 25;
    addHeadlights(scene, car);
    police.cars.push(car);
    cars.push(car);
  }
  spawnFootCop(police, scene, { x: aheadX, z: aheadZ });
  police.roadblocks.push({ cars, x: aheadX, z: aheadZ, timer: 30 });
}

/**
 * Step the wanted system. Returns 'busted' when a cop arrests the player, else null.
 * player: the player object; playerInCar: the car or null; audio for the siren.
 */
export function stepPolice(police, dt, scene, city, player, playerInCar, allCars, audio, onCrime) {
  const playerPos = playerInCar ? playerInCar.pos : player.pos;
  const playerYaw = playerInCar ? playerInCar.yaw : player.yaw;
  // Helicopter: at 4+ stars it circles overhead and pins the wanted level.
  police.heliOverhead = stepHelicopter(police.heli, dt, playerPos, police.wanted, WANTED.heliAt);

  // Spawn pressure scales with the wanted level.
  if (police.wanted > 0) {
    police.spawnTimer -= dt;
    const wantCars = Math.min(police.wanted, 3);
    const wantCops = police.wanted >= 2 ? Math.min(police.wanted - 1, 3) : 0;
    if (police.spawnTimer <= 0) {
      if (police.cars.length < wantCars) spawnPoliceCar(police, scene, city, playerPos);
      else if (police.cops.length < wantCops && !playerInCar) spawnFootCop(police, scene, playerPos);
      police.spawnTimer = 4;
    }
    // Roadblocks at 3+ stars, at most one active, on a cooldown.
    police.roadblockTimer -= dt;
    if (police.wanted >= WANTED.roadblockAt && police.roadblockTimer <= 0 && police.roadblocks.length === 0) {
      spawnRoadblock(police, scene, city, playerPos, playerYaw);
      police.roadblockTimer = 45;
      if (audio) audio.horn();
    }
    // Roadblocks dissolve after their timer, or when the player smashes through.
    for (const rb of police.roadblocks) {
      rb.timer -= dt;
      if (rb.timer <= 0) {
        for (const car of rb.cars) car.roadblock = false;
      }
    }
    police.roadblocks = police.roadblocks.filter((rb) => rb.timer > 0);
    // Wanted decays only when no police can see the player and no heli is overhead.
    let seen = police.heliOverhead;
    for (const car of police.cars) {
      if (Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z) < 55) seen = true;
    }
    for (const cop of police.cops) {
      if (Math.hypot(cop.pos.x - playerPos.x, cop.pos.z - playerPos.z) < 30) seen = true;
    }
    if (!seen) {
      police.hiddenTimer += dt;
      if (police.hiddenTimer >= WANTED.decaySeconds) {
        police.wanted = Math.max(0, police.wanted - 1);
        police.hiddenTimer = 0;
        if (police.wanted === 0 && audio) audio.stopSiren();
      }
    } else {
      police.hiddenTimer = 0;
    }
  } else if (audio) {
    audio.stopSiren();
  }

  // Police cars chase: steer toward the player, ram when close. Roadblock cars
  // hold their line until the player is near, then pull out and join the chase.
  for (const car of police.cars) {
    if (car.dead) continue;
    const dx = playerPos.x - car.pos.x;
    const dz = playerPos.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    if (car.roadblock) {
      car.roadblockTimer -= dt;
      if (dist < 30 || car.roadblockTimer <= 0) car.roadblock = false;
      else continue; // parked across the road, waiting
    }
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - car.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = THREE.MathUtils.clamp(diff * 1.4, -1, 1);
    driveCar(car, dt, dist > 6 ? 0.95 : 0.4, steer, city, allCars);
    // Remove cars that fell far behind.
    if (dist > 260) {
      removeCar(scene, car);
    }
  }
  police.cars = police.cars.filter((c) => !c.dead);

  // Foot cops run at the player; arrest when very close and the player is slow/on foot.
  // At 3+ stars they arrive in pairs and run a little faster.
  let busted = false;
  const copSpeed = police.wanted >= 3 ? 7.4 : 6.5;
  for (const cop of police.cops) {
    if (cop.state === 'down') continue;
    const dx = playerPos.x - cop.pos.x;
    const dz = playerPos.z - cop.pos.z;
    const dist = Math.hypot(dx, dz);
    cop.yaw = Math.atan2(dx, dz);
    const nx = cop.pos.x + Math.sin(cop.yaw) * copSpeed * dt;
    const nz = cop.pos.z + Math.cos(cop.yaw) * copSpeed * dt;
    const corrected = city.resolveCircle(nx, nz, 0.5);
    cop.pos.x = corrected.x;
    cop.pos.z = corrected.z;
    cop.model.rotation.y = cop.yaw;
    if (dist < 1.6 && !playerInCar && player.speed < 4) {
      police.bustTimer += dt;
      if (police.bustTimer > 1.2) busted = true;
    } else {
      police.bustTimer = Math.max(0, police.bustTimer - dt);
    }
  }
  // Cops that fell far behind despawn.
  for (const cop of police.cops) {
    if (Math.hypot(cop.pos.x - playerPos.x, cop.pos.z - playerPos.z) > 200) {
      scene.remove(cop.model);
      cop.state = 'gone';
    }
  }
  police.cops = police.cops.filter((c) => c.state !== 'gone');
  return busted ? 'busted' : null;
}

/** Remove all police (on wanted clear / mission reset). */
export function clearPolice(police, scene) {
  for (const car of police.cars) removeCar(scene, car);
  for (const cop of police.cops) scene.remove(cop.model);
  police.cars = [];
  police.cops = [];
  police.roadblocks = [];
  police.bustTimer = 0;
  if (police.heli) {
    police.heli.active = false;
    police.heli.model.visible = false;
    police.heliOverhead = false;
  }
}
