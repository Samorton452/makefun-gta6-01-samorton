// The player on foot: a low-poly person with a walk/run animation, jumping, and a smooth
// third-person orbit camera (pointer lock). Handles building collision and entering cars.
import * as THREE from 'three';
import { PLAYER } from './config.js';

function buildPersonModel(shirtColor, pantsColor, skinColor) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.95 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), skin);
  head.position.y = 1.68;
  head.castShadow = true;
  group.add(head);
  const hairM = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.36), hair);
  hairM.position.y = 1.9;
  group.add(hairM);
  const armGeo = new THREE.BoxGeometry(0.16, 0.66, 0.16);
  const legGeo = new THREE.BoxGeometry(0.2, 0.78, 0.2);
  const parts = {};
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, shirt);
    arm.position.set(side * 0.4, 1.18, 0);
    arm.geometry.translate(0, -0.28, 0);
    arm.castShadow = true;
    group.add(arm);
    const leg = new THREE.Mesh(legGeo, pants);
    leg.position.set(side * 0.16, 0.78, 0);
    leg.geometry.translate(0, -0.36, 0);
    leg.castShadow = true;
    group.add(leg);
    parts[side < 0 ? 'armL' : 'armR'] = arm;
    parts[side < 0 ? 'legL' : 'legR'] = leg;
  }
  group.userData.parts = parts;
  return group;
}

export function createPlayer(scene) {
  const model = buildPersonModel(0x3e6fa5, 0x2c2f36, 0xc98e6b);
  model.position.set(0, 0, -40);
  scene.add(model);
  return {
    model,
    pos: model.position,
    yaw: 0, // facing direction
    camYaw: 0, // camera orbit
    camPitch: 0.22,
    velY: 0,
    grounded: true,
    moving: false,
    speed: 0,
    animTime: 0,
    health: PLAYER.maxHealth,
    armour: 0,
    cash: 250,
    weapon: 'pistol',
    ammo: 12,
    reserve: 60,
    inCar: null,
    wanted: 0,
  };
}

/** Step the on-foot player: WASD relative to the camera, sprint, jump, building collision. */
export function stepPlayerOnFoot(player, input, actions, dt, city) {
  const axes = input.axes();
  const mouse = input.takeMouse();
  player.camYaw -= mouse.dx * 0.0032;
  player.camPitch = THREE.MathUtils.clamp(player.camPitch + mouse.dy * 0.0024, -0.15, 0.9);

  const sprinting = input.sprint() && axes.z > 0;
  const speed = sprinting ? PLAYER.sprintSpeed : axes.z !== 0 || axes.x !== 0 ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const moving = axes.x !== 0 || axes.z !== 0;
  player.moving = moving;

  if (moving) {
    // Move relative to the camera yaw.
    const fx = Math.sin(player.camYaw);
    const fz = Math.cos(player.camYaw);
    const rx = Math.cos(player.camYaw);
    const rz = -Math.sin(player.camYaw);
    let dx = fx * axes.z + rx * axes.x;
    let dz = fz * axes.z + rz * axes.x;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
      const targetYaw = Math.atan2(dx, dz);
      // Turn toward the move direction.
      let diff = targetYaw - player.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.yaw += THREE.MathUtils.clamp(diff, -dt * 10, dt * 10);
      const nx = player.pos.x + dx * speed * dt;
      const nz = player.pos.z + dz * speed * dt;
      const corrected = city.resolveCircle(nx, nz, PLAYER.radius);
      player.pos.x = corrected.x;
      player.pos.z = corrected.z;
      player.speed = speed;
      player.animTime += dt * (sprinting ? 13 : 9);
    }
  } else {
    player.speed = 0;
  }

  // Jump / gravity.
  if (player.grounded && (actions & 16)) {
    player.velY = PLAYER.jumpSpeed;
    player.grounded = false;
  }
  if (!player.grounded) {
    player.velY -= 24 * dt;
    player.pos.y += player.velY * dt;
    if (player.pos.y <= 0) {
      player.pos.y = 0;
      player.velY = 0;
      player.grounded = true;
    }
  }

  // Walk-cycle animation.
  const parts = player.model.userData.parts;
  const swing = moving ? Math.sin(player.animTime) * (sprinting ? 0.85 : 0.6) : 0;
  parts.legL.rotation.x = swing;
  parts.legR.rotation.x = -swing;
  parts.armL.rotation.x = -swing * 0.8;
  parts.armR.rotation.x = swing * 0.8;
  player.model.rotation.y = player.yaw;
  player.model.position.y = player.pos.y + (moving ? Math.abs(Math.sin(player.animTime)) * 0.05 : 0);
}

/** Smooth third-person camera: follows behind the player or the car. */
export function updateCamera(player, camera, dt, city, inCar) {
  const target = new THREE.Vector3();
  let dist = 7;
  let height = 2.2;
  if (inCar) {
    target.copy(inCar.pos).add(new THREE.Vector3(0, 1.6, 0));
    dist = 9;
    height = 2.2;
    // Chase camera: sit behind the car's heading, eased.
    const desiredYaw = inCar.yaw + Math.PI;
    let diff = desiredYaw - player.camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.camYaw += diff * Math.min(1, dt * 2.2);
  } else {
    target.copy(player.pos).add(new THREE.Vector3(0, 1.7, 0));
  }
  const pitch = player.camPitch;
  const cx = target.x - Math.sin(player.camYaw) * Math.cos(pitch) * dist;
  const cz = target.z - Math.cos(player.camYaw) * Math.cos(pitch) * dist;
  const cy = target.y + Math.sin(pitch) * dist + height * 0.35;
  const desired = new THREE.Vector3(cx, Math.max(0.6, cy), cz);
  camera.position.lerp(desired, 1 - Math.pow(0.0001, dt));
  camera.lookAt(target);
}
