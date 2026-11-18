// Combat v2: fists, a pistol, an automatic SMG and a spread shotgun. Shooting raycasts
// from the camera against peds, cops and cars; hits flash a marker, knock peds down and
// raise the wanted level. Cars take damage: they smoke, then wreck (and can explode).
// Muzzle flash, tracers and impact particles are simple meshes, no textures.
import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { damageCar } from './vehicles.js';

export function createCombat(scene) {
  // Muzzle flash: a small additive sprite at the gun.
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0 });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), flashMat);
  scene.add(flash);
  // Tracer pool.
  const tracers = [];
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 8; i += 1) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), tracerMat.clone());
    t.visible = false;
    scene.add(t);
    tracers.push({ mesh: t, life: 0 });
  }
  // Impact particle pool (small boxes that fly and fade).
  const particles = [];
  const partGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  for (let i = 0; i < 60; i += 1) {
    const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true }));
    m.visible = false;
    scene.add(m);
    particles.push({ mesh: m, vel: new THREE.Vector3(), life: 0 });
  }
  return {
    scene, flash, flashMat, tracers, particles,
    cooldown: 0,
    reloadTimer: 0,
    tracerIndex: 0,
    partIndex: 0,
    smokeTimer: 0,
  };
}

export function spawnParticles(combat, x, y, z, count, color) {
  for (let i = 0; i < count; i += 1) {
    const p = combat.particles[combat.partIndex];
    combat.partIndex = (combat.partIndex + 1) % combat.particles.length;
    p.mesh.visible = true;
    p.mesh.position.set(x, y, z);
    p.mesh.material.color.setHex(color);
    p.mesh.material.opacity = 1;
    p.vel.set((Math.random() - 0.5) * 6, Math.random() * 5 + 1, (Math.random() - 0.5) * 6);
    p.life = 0.5 + Math.random() * 0.3;
  }
}

/** A big orange explosion burst for a wrecked car. */
export function spawnExplosion(combat, x, y, z) {
  spawnParticles(combat, x, y, z, 26, 0xff7722);
  spawnParticles(combat, x, y + 0.5, z, 14, 0xffcc33);
  spawnParticles(combat, x, y, z, 10, 0x555555);
}

function fireTracer(combat, from, to) {
  const t = combat.tracers[combat.tracerIndex];
  combat.tracerIndex = (combat.tracerIndex + 1) % combat.tracers.length;
  const mid = from.clone().add(to).multiplyScalar(0.5);
  t.mesh.position.copy(mid);
  t.mesh.lookAt(to);
  t.mesh.scale.set(1, 1, from.distanceTo(to));
  t.mesh.visible = true;
  t.mesh.material.opacity = 0.9;
  t.life = 0.08;
}

function muzzleAt(camera, player) {
  const pos = new THREE.Vector3();
  camera.getWorldPosition(pos);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return pos.clone().add(dir.multiplyScalar(0.9)).add(new THREE.Vector3(0, -0.15, 0));
}

/** Raycast one shot along a direction; returns the closest hit or null. */
function raycastHit(origin, dir, range, peds, cops, cars) {
  let best = null;
  let bestDist = range;
  const test = (list, kind) => {
    for (const t of list) {
      if (t.state === 'down' || t.dead) continue;
      const cx = t.pos.x - origin.x;
      const cz = t.pos.z - origin.z;
      const along = cx * dir.x + cz * dir.z;
      if (along < 0 || along > bestDist) continue;
      const perp = Math.abs(cx * dir.z - cz * dir.x);
      const radius = kind === 'car' ? 1.6 : 0.8;
      if (perp < radius) {
        best = { target: t, kind, dist: along };
        bestDist = along;
      }
    }
  };
  test(peds, 'ped');
  test(cops, 'cop');
  test(cars, 'car');
  return best;
}

/**
 * Try to shoot. Returns an event string: 'shot' | 'dry' | 'reload' | 'melee' | null.
 * Applies damage to the first ped/cop/car hit and calls onHit(kind, target, killed).
 * onCarWrecked(car) fires when a car is destroyed by gunfire.
 */
export function tryShoot(combat, player, camera, peds, cops, cars, dt, onHit, onCarWrecked) {
  if (combat.cooldown > 0 || combat.reloadTimer > 0) return null;
  const weapon = WEAPONS[player.weapon];
  if (player.weapon === 'fists') {
    combat.cooldown = weapon.rate;
    // Melee: nearest ped/cop in front within range, with a knockback shove.
    const px = player.pos.x + Math.sin(player.yaw) * 1.2;
    const pz = player.pos.z + Math.cos(player.yaw) * 1.2;
    for (const list of [peds, cops]) {
      for (const t of list) {
        if (t.state === 'down') continue;
        if (Math.hypot(t.pos.x - px, t.pos.z - pz) < 1.6) {
          damageTarget(t, weapon.damage, onHit, 'ped');
          // Shove the victim away from the player.
          const d = Math.hypot(t.pos.x - player.pos.x, t.pos.z - player.pos.z) || 1;
          t.pos.x += ((t.pos.x - player.pos.x) / d) * 1.2;
          t.pos.z += ((t.pos.z - player.pos.z) / d) * 1.2;
          spawnParticles(combat, t.pos.x, 1.2, t.pos.z, 6, 0xffffff);
          return 'melee';
        }
      }
    }
    return 'melee';
  }
  const ammo = player.ammoMap[player.weapon];
  if (!ammo || ammo.mag <= 0) return 'dry';
  ammo.mag -= 1;
  combat.cooldown = weapon.rate;
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const baseDir = camera.getWorldDirection(new THREE.Vector3());
  const muzzle = muzzleAt(camera, player);
  combat.flash.position.copy(muzzle);
  combat.flash.lookAt(camera.position);
  combat.flashMat.opacity = 1;

  const pellets = weapon.pellets || 1;
  for (let i = 0; i < pellets; i += 1) {
    // Spread each pellet around the aim direction (shotgun fans out).
    const dir = baseDir.clone();
    if (weapon.spread) {
      dir.x += (Math.random() - 0.5) * weapon.spread * 2;
      dir.y += (Math.random() - 0.5) * weapon.spread;
      dir.z += (Math.random() - 0.5) * weapon.spread * 2;
      dir.normalize();
    }
    const best = raycastHit(origin, dir, weapon.range, peds, cops, cars);
    const end = best
      ? origin.clone().add(dir.clone().multiplyScalar(best.dist))
      : origin.clone().add(dir.clone().multiplyScalar(weapon.range));
    fireTracer(combat, muzzle, end);
    spawnParticles(combat, end.x, Math.max(0.3, end.y), end.z, 4, 0xffcc66);
    if (best) {
      if (best.kind === 'car') {
        const result = damageCar(best.target, weapon.damage);
        spawnParticles(combat, end.x, 1, end.z, 8, 0x888888);
        if (result === 'wrecked') {
          spawnExplosion(combat, best.target.pos.x, 1, best.target.pos.z);
          if (onCarWrecked) onCarWrecked(best.target);
          if (onHit) onHit('car', best.target, true);
        } else if (onHit) {
          onHit('car', best.target, false);
        }
      } else {
        damageTarget(best.target, weapon.damage, onHit, best.kind);
      }
    }
  }
  return 'shot';
}

function damageTarget(target, damage, onHit, kind) {
  target.health -= damage;
  if (target.health <= 0 && target.state !== 'down') {
    target.state = 'down';
    if (onHit) onHit(kind, target, true);
  } else if (onHit) {
    onHit(kind, target, false);
  }
}

export function stepCombat(combat, dt) {
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  if (combat.reloadTimer > 0) combat.reloadTimer -= dt;
  combat.flashMat.opacity = Math.max(0, combat.flashMat.opacity - dt * 14);
  for (const t of combat.tracers) {
    if (t.life > 0) {
      t.life -= dt;
      t.mesh.material.opacity = Math.max(0, t.life / 0.08) * 0.9;
      if (t.life <= 0) t.mesh.visible = false;
    }
  }
  for (const p of combat.particles) {
    if (p.life > 0) {
      p.life -= dt;
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = Math.max(0, p.life * 1.6);
      if (p.life <= 0 || p.mesh.position.y < 0) p.mesh.visible = false;
    }
  }
}
