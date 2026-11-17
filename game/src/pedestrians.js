// Pedestrians: low-poly people who stroll the sidewalks, cross at intersections and flee
// when scared (gunshots, a car bearing down, or a nearby crime). Some carry cash when bumped.
import * as THREE from 'three';

const SHIRTS = [0xc25a4a, 0x4a7ac2, 0x53a05a, 0xd8b13c, 0x8a5fc2, 0xe0e0e0, 0x333333, 0xd97aa0];
const PANTS = [0x2c2f36, 0x4a3a2c, 0x3a4a5a, 0x5a5a5a];
const SKINS = [0xc98e6b, 0x8a5a3b, 0xe8b98a, 0x6b4423];

function buildPedModel(random) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: SHIRTS[Math.floor(random() * SHIRTS.length)], roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: PANTS[Math.floor(random() * PANTS.length)], roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: SKINS[Math.floor(random() * SKINS.length)], roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.68, 0.32), shirt);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), skin);
  head.position.y = 1.64;
  group.add(head);
  const parts = {};
  const armGeo = new THREE.BoxGeometry(0.15, 0.62, 0.15);
  const legGeo = new THREE.BoxGeometry(0.19, 0.76, 0.19);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, shirt);
    arm.geometry = armGeo.clone();
    arm.geometry.translate(0, -0.26, 0);
    arm.position.set(side * 0.38, 1.16, 0);
    group.add(arm);
    const leg = new THREE.Mesh(legGeo, pants);
    leg.geometry = legGeo.clone();
    leg.geometry.translate(0, -0.35, 0);
    leg.position.set(side * 0.15, 0.76, 0);
    group.add(leg);
    parts[side < 0 ? 'armL' : 'armR'] = arm;
    parts[side < 0 ? 'legL' : 'legR'] = leg;
  }
  group.userData.parts = parts;
  return group;
}

export function createPedestrians(scene, city, random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const model = buildPedModel(random);
    // Start on a sidewalk: just off a street.
    const s = city.streets[Math.floor(random() * city.streets.length)];
    const v = -320 + random() * 640;
    const horizontal = random() < 0.5;
    const x = horizontal ? v : s + 11;
    const z = horizontal ? s + 11 : v;
    model.position.set(x, 0, z);
    scene.add(model);
    peds.push({
      model,
      pos: model.position,
      yaw: Math.random() * Math.PI * 2,
      speed: 1.2 + random() * 1.1,
      state: 'walk', // walk | flee | down
      fleeTimer: 0,
      animTime: random() * 10,
      health: 50,
      target: null,
      retarget: 0,
    });
  }
  return peds;
}

export function scarePeds(peds, x, z, radius) {
  for (const ped of peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.pos.x - x, ped.pos.z - z);
    if (d < radius) {
      ped.state = 'flee';
      ped.fleeTimer = 3 + Math.random() * 3;
      ped.yaw = Math.atan2(ped.pos.x - x, ped.pos.z - z);
    }
  }
}

export function stepPedestrians(peds, dt, city, playerPos, playerSpeed) {
  for (const ped of peds) {
    if (ped.state === 'down') {
      ped.model.rotation.x = THREE.MathUtils.lerp(ped.model.rotation.x, -Math.PI / 2, dt * 4);
      continue;
    }
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      const speed = 5.5;
      const nx = ped.pos.x + Math.sin(ped.yaw) * speed * dt;
      const nz = ped.pos.z + Math.cos(ped.yaw) * speed * dt;
      const corrected = city.resolveCircle(nx, nz, 0.5);
      ped.pos.x = corrected.x;
      ped.pos.z = corrected.z;
      ped.animTime += dt * 13;
      if (ped.fleeTimer <= 0) ped.state = 'walk';
    } else {
      // Stroll: mostly along a sidewalk; re-pick a heading now and then.
      ped.retarget -= dt;
      if (ped.retarget <= 0) {
        ped.retarget = 2 + Math.random() * 4;
        // Keep to the grid: pick one of the four axis directions.
        ped.yaw = Math.floor(Math.random() * 4) * (Math.PI / 2);
      }
      // A fast car coming at the ped makes them flee.
      if (playerPos && playerSpeed > 12) {
        const d = Math.hypot(ped.pos.x - playerPos.x, ped.pos.z - playerPos.z);
        if (d < 12) {
          ped.state = 'flee';
          ped.fleeTimer = 2.5;
          ped.yaw = Math.atan2(ped.pos.x - playerPos.x, ped.pos.z - playerPos.z);
        }
      }
      const nx = ped.pos.x + Math.sin(ped.yaw) * ped.speed * dt;
      const nz = ped.pos.z + Math.cos(ped.yaw) * ped.speed * dt;
      if (city.collides(nx, nz, 0.5) || Math.abs(nx) > 335 || Math.abs(nz) > 335) {
        ped.yaw += Math.PI / 2;
      } else {
        ped.pos.x = nx;
        ped.pos.z = nz;
      }
      ped.animTime += dt * 7;
    }
    const parts = ped.model.userData.parts;
    const swing = Math.sin(ped.animTime) * (ped.state === 'flee' ? 0.85 : 0.5);
    parts.legL.rotation.x = swing;
    parts.legR.rotation.x = -swing;
    parts.armL.rotation.x = -swing * 0.8;
    parts.armR.rotation.x = swing * 0.8;
    ped.model.rotation.y = ped.yaw;
  }
}
