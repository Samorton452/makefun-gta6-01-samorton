// Vehicles: low-poly car models built from boxes, arcade driving, enter/exit.
// Car types: sedan, taxi, sports, truck, police. Traffic and police cars reuse these models.
import * as THREE from 'three';
import { CAR } from './config.js';

const CAR_COLORS = {
  sedan: [0x4a6fa5, 0x8a2f2f, 0x3f5a46, 0x777777, 0xb0a06a],
  taxi: [0xe8c832],
  sports: [0xc22e2e, 0x222222, 0xd8d8d8, 0x2e6fc2],
  truck: [0x5a5a5a, 0x7a4a2e, 0x3e5a7a],
  police: [0x11151a],
};

const CAR_SIZE = {
  sedan: { w: 1.9, l: 4.4, h: 0.75 },
  taxi: { w: 1.9, l: 4.4, h: 0.75 },
  sports: { w: 2.0, l: 4.2, h: 0.62 },
  truck: { w: 2.2, l: 6.0, h: 1.1 },
  police: { w: 1.9, l: 4.5, h: 0.75 },
};

function buildCarModel(type, color) {
  const size = CAR_SIZE[type];
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2530, roughness: 0.15, metalness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, size.l), bodyMat);
  body.position.y = 0.55 + size.h / 2;
  body.castShadow = true;
  group.add(body);

  const cabinH = type === 'truck' ? 0.9 : 0.55;
  const cabinL = type === 'truck' ? 1.4 : size.l * 0.5;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(size.w * 0.86, cabinH, cabinL), glassMat);
  cabin.position.set(0, 0.55 + size.h + cabinH / 2 - 0.05, type === 'truck' ? size.l / 2 - cabinL / 2 - 0.3 : -size.l * 0.06);
  cabin.castShadow = true;
  group.add(cabin);

  if (type === 'truck') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(size.w * 0.95, 0.7, size.l * 0.42), bodyMat);
    bed.position.set(0, 0.55 + size.h + 0.3, -size.l * 0.22);
    bed.castShadow = true;
    group.add(bed);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), new THREE.MeshStandardMaterial({ color: 0xf5d020, emissive: 0xaa8800, emissiveIntensity: 0.4 }));
    sign.position.set(0, 0.55 + size.h + cabinH + 0.08, 0);
    group.add(sign);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(size.w + 0.02, 0.14, size.l * 0.6), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    stripe.position.set(0, 0.85, 0);
    group.add(stripe);
  }
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 }));
    bar.position.set(0, 0.55 + size.h + cabinH + 0.06, 0);
    group.add(bar);
    const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.42), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.2 }));
    lightR.position.set(-0.28, 0.55 + size.h + cabinH + 0.16, 0);
    group.add(lightR);
    const lightB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.42), new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 1.2 }));
    lightB.position.set(0.28, 0.55 + size.h + cabinH + 0.16, 0);
    group.add(lightB);
    const door = new THREE.Mesh(new THREE.BoxGeometry(size.w + 0.04, 0.4, size.l * 0.5), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
    door.position.set(0, 0.75, 0);
    group.add(door);
  }

  // Headlights + taillights.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffedb0, emissiveIntensity: 0.7 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xdd1111, emissiveIntensity: 0.6 });
  for (const sx of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.1), headMat);
    head.position.set(sx * (size.w / 2 - 0.35), 0.75, size.l / 2 + 0.02);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.1), tailMat);
    tail.position.set(sx * (size.w / 2 - 0.35), 0.75, -size.l / 2 - 0.02);
    group.add(tail);
  }

  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(wx * (size.w / 2 - 0.1), 0.36, wz * (size.l / 2 - 0.85));
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }

  group.userData.wheels = wheels;
  group.userData.size = size;
  return group;
}

/** Create a car entity (player-drivable, traffic or police). */
export function createCar(scene, type, x, z, yaw, color) {
  const colors = CAR_COLORS[type];
  const col = color ?? colors[Math.floor(Math.random() * colors.length)];
  const model = buildCarModel(type, col);
  model.position.set(x, 0, z);
  model.rotation.y = yaw;
  scene.add(model);
  const tune = CAR[type];
  const car = {
    type,
    model,
    pos: model.position, // Vector3, y stays 0
    yaw,
    speed: 0,
    steer: 0,
    tune,
    radius: Math.max(CAR_SIZE[type].w, CAR_SIZE[type].l) / 2,
    length: CAR_SIZE[type].l,
    width: CAR_SIZE[type].w,
    driver: null, // 'player' | 'traffic' | 'police' | null (parked)
    headlight: null,
    brakeLight: false,
    dead: false,
  };
  return car;
}

export function addHeadlights(scene, car) {
  if (car.headlight) return car.headlight;
  const spot = new THREE.SpotLight(0xfff2c0, 0, 45, 0.55, 0.5, 1.2);
  spot.position.set(0, 1, car.length / 2);
  const target = new THREE.Object3D();
  target.position.set(0, 0, 18);
  car.model.add(target);
  spot.target = target;
  car.model.add(spot);
  car.headlight = spot;
  return spot;
}

/** Arcade driving step: throttle -1..1, steer -1..1. Collides with buildings via city. */
export function driveCar(car, dt, throttle, steerInput, city, otherCars) {
  const t = car.tune;
  // Steering eases toward the input, less effective at speed.
  const steerTarget = steerInput * t.steer * Math.max(0.35, 1 - Math.abs(car.speed) / (t.topSpeed * 1.6));
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  car.yaw += car.steer * (car.speed / t.topSpeed) * dt * 2.2 * Math.sign(car.speed || 1);
  if (throttle > 0) car.speed += t.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 0.5) car.speed += t.brake * throttle * dt; // brake
    else car.speed += t.accel * 0.55 * throttle * dt; // reverse
  }
  // Drag + rolling resistance.
  car.speed -= car.speed * 0.35 * dt;
  if (Math.abs(car.speed) < 0.05 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-t.topSpeed * 0.4, Math.min(t.topSpeed, car.speed));

  const nx = car.pos.x + Math.sin(car.yaw) * car.speed * dt;
  const nz = car.pos.z + Math.cos(car.yaw) * car.speed * dt;
  // Building collision: stop and scrape.
  const r = car.width / 2 + 0.15;
  const corrected = city.resolveCircle(nx, nz, r);
  const hitWall = corrected.x !== nx || corrected.z !== nz;
  if (hitWall) {
    car.speed *= 0.55;
  }
  car.pos.x = corrected.x;
  car.pos.z = corrected.z;
  // Soft car-car collision: push apart, bleed speed.
  if (otherCars) {
    for (const other of otherCars) {
      if (other === car || other.dead) continue;
      const dx = car.pos.x - other.pos.x;
      const dz = car.pos.z - other.pos.z;
      const d = Math.hypot(dx, dz);
      const min = (car.length + other.length) / 2 - 0.6;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d;
        const uz = dz / d;
        car.pos.x += ux * push;
        car.pos.z += uz * push;
        other.pos.x -= ux * push;
        other.pos.z -= uz * push;
        car.speed *= 0.85;
        other.speed *= 0.85;
      }
    }
  }
  car.model.rotation.y = car.yaw;
  // Wheel spin + front wheel steer.
  const spin = car.speed * dt / 0.36;
  const wheels = car.model.userData.wheels;
  for (let i = 0; i < wheels.length; i += 1) {
    wheels[i].rotation.x += spin;
  }
  // Body lean / pitch for feel.
  car.model.rotation.z = -car.steer * Math.min(1, Math.abs(car.speed) / 20) * 0.03;
  car.model.rotation.x = THREE.MathUtils.clamp(-throttle * car.speed * 0.0006, -0.02, 0.03);
  return hitWall;
}

export function removeCar(scene, car) {
  scene.remove(car.model);
  car.dead = true;
}
