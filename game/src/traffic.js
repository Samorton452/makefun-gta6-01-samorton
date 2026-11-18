// Traffic AI v2: cars that drive the street grid, keep to a lane, slow for the car
// ahead, honk when stuck, and turn at intersections. They share the car models and
// driving physics with player cars. Rush hour (morning and evening) puts more cars
// on the road; the count is adjusted live by adjustTrafficCount().
import { createCar, driveCar } from './vehicles.js';

const TYPES = ['sedan', 'sedan', 'taxi', 'taxi', 'sports', 'truck', 'muscle', 'van'];

/** How many traffic cars the streets should hold at a given time of day (hours). */
export function trafficTarget(timeOfDay) {
  const morningRush = timeOfDay >= 7.5 && timeOfDay <= 9.5;
  const eveningRush = timeOfDay >= 16.5 && timeOfDay <= 19;
  if (morningRush || eveningRush) return 22;
  const night = timeOfDay >= 22 || timeOfDay <= 5;
  if (night) return 9;
  return 15;
}

function spawnTrafficCar(scene, city, random) {
  const type = TYPES[Math.floor(random() * TYPES.length)];
  const p = city.randomRoadPoint(random);
  // Snap to a lane: drive along the street, offset to the right side.
  const horizontal = Math.abs(p.z - city.nearestStreet(p.z)) < 0.01;
  const street = horizontal ? p.z : p.x;
  const dir = random() < 0.5 ? 1 : -1;
  let x = p.x;
  let z = p.z;
  let yaw = 0;
  if (horizontal) {
    z = street + (dir > 0 ? 3.5 : -3.5);
    yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    x = street + (dir > 0 ? -3.5 : 3.5);
    yaw = dir > 0 ? Math.PI : 0;
  }
  const car = createCar(scene, type, x, z, yaw);
  car.driver = 'traffic';
  car.cruise = 7 + random() * 5;
  car.route = { horizontal, street, dir };
  car.turnCooldown = 0;
  car.blockedTimer = 0;
  car.honkCooldown = 0;
  return car;
}

export function createTraffic(scene, city, random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    cars.push(spawnTrafficCar(scene, city, random));
  }
  return cars;
}

/** Grow or shrink the traffic pool toward the target count (rush hour). */
export function adjustTrafficCount(cars, scene, city, random, target) {
  if (cars.length < target) {
    const add = Math.min(target - cars.length, 2);
    for (let i = 0; i < add; i += 1) cars.push(spawnTrafficCar(scene, city, random));
  } else if (cars.length > target) {
    // Trim from the end of the pool; nearby streets refill on the next step.
    const drop = cars.splice(cars.length - (cars.length - target));
    for (const car of drop) {
      car.dead = true;
      scene.remove(car.model);
    }
  }
}

/**
 * One traffic step: follow the current street; at an intersection maybe turn.
 * extra: { timeOfDay, audio, playerPos } — audio for honks, playerPos for respawns.
 */
export function stepTraffic(cars, dt, city, allCars, playerPos, extra = {}) {
  const audio = extra.audio || null;
  for (const car of cars) {
    if (car.dead) continue;
    const r = car.route;
    car.turnCooldown -= dt;
    car.honkCooldown -= dt;
    // Slow down if another car is close ahead; honk if stuck behind one.
    let throttle = 0.55;
    const fx = Math.sin(car.yaw);
    const fz = Math.cos(car.yaw);
    let blocked = false;
    for (const other of allCars) {
      if (other === car || other.dead) continue;
      const dx = other.pos.x - car.pos.x;
      const dz = other.pos.z - car.pos.z;
      const ahead = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (ahead > 0 && ahead < 9 && side < 2.5) {
        throttle = -0.4;
        blocked = true;
      }
    }
    if (blocked) {
      car.blockedTimer += dt;
      if (car.blockedTimer > 2.5 && car.honkCooldown <= 0 && audio) {
        audio.horn();
        car.honkCooldown = 4 + Math.random() * 3;
      }
    } else {
      car.blockedTimer = 0;
    }
    // Near an intersection? Possibly turn onto the crossing street.
    const along = r.horizontal ? car.pos.x : car.pos.z;
    const nearest = city.nearestStreet(along);
    const distToCross = Math.abs(along - nearest);
    if (distToCross < 4 && car.turnCooldown <= 0 && Math.random() < 0.35) {
      // Turn: switch axis, snap onto the crossing street, pick a new direction.
      const newDir = Math.random() < 0.5 ? 1 : -1;
      const crossStreet = nearest;
      if (r.horizontal) {
        car.pos.x = crossStreet;
        car.pos.z = crossStreet + (newDir > 0 ? -3.5 : 3.5);
        car.yaw = newDir > 0 ? Math.PI : 0;
        car.route = { horizontal: false, street: crossStreet, dir: newDir };
      } else {
        car.pos.z = crossStreet;
        car.pos.x = crossStreet + (newDir > 0 ? 3.5 : -3.5);
        car.yaw = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        car.route = { horizontal: true, street: crossStreet, dir: newDir };
      }
      car.turnCooldown = 3;
      car.speed = Math.max(3, car.speed * 0.6);
    }
    // Gentle steering back onto the lane centre.
    const lane = r.horizontal ? r.street + (r.dir > 0 ? 3.5 : -3.5) : r.street + (r.dir > 0 ? -3.5 : 3.5);
    const lateral = r.horizontal ? car.pos.z - lane : car.pos.x - lane;
    const steer = Math.max(-0.6, Math.min(0.6, -lateral * 0.25));
    // Keep inside the city; at the edge, turn around.
    const edge = 330;
    if (Math.abs(car.pos.x) > edge || Math.abs(car.pos.z) > edge) {
      car.yaw += Math.PI;
      car.route.dir *= -1;
      car.pos.x = Math.max(-edge, Math.min(edge, car.pos.x));
      car.pos.z = Math.max(-edge, Math.min(edge, car.pos.z));
    }
    // Cap speed at the cruise speed.
    if (car.speed > car.cruise) throttle = Math.min(throttle, 0);
    driveCar(car, dt, throttle, steer, city, allCars);
    // Respawn far-away cars near the player so the streets stay alive.
    if (playerPos && Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z) > 320) {
      const nearX = Math.max(-320, Math.min(320, playerPos.x + (Math.random() - 0.5) * 220));
      const nearZ = Math.max(-320, Math.min(320, playerPos.z + (Math.random() - 0.5) * 220));
      if (Math.random() < 0.5) {
        car.pos.x = nearX;
        car.pos.z = city.nearestStreet(nearZ);
      } else {
        car.pos.x = city.nearestStreet(nearX);
        car.pos.z = nearZ;
      }
      car.yaw = Math.random() * Math.PI * 2;
      car.speed = 5;
    }
  }
}
