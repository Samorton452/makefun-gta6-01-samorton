// The police helicopter: at wanted level 4+ a chopper circles above the player with a
// searchlight, so the wanted level cannot fade while it is overhead. It flies in from
// the edge of the map and leaves once the heat drops.
import * as THREE from 'three';

export function createHelicopter(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.6, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2530, roughness: 0.15, metalness: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 5.2), bodyMat);
  body.castShadow = true;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 1.6), glassMat);
  nose.position.set(0, -0.1, 3);
  group.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.6), bodyMat);
  tail.position.set(0, 0.3, -4.4);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.2), bodyMat);
  fin.position.set(0, 1, -6.4);
  group.add(fin);
  // Main rotor (spins) + tail rotor.
  const rotor = new THREE.Group();
  for (let i = 0; i < 2; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 }));
    blade.rotation.y = (i * Math.PI) / 2;
    rotor.add(blade);
  }
  rotor.position.y = 1.2;
  group.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  tailRotor.position.set(0.5, 1, -6.4);
  group.add(tailRotor);
  // Skids.
  for (const sx of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 4.4), bodyMat);
    skid.position.set(sx * 1.3, -1.1, 0);
    group.add(skid);
  }
  // Searchlight: a spotlight aimed at the ground + a visible cone.
  const spot = new THREE.SpotLight(0xfff6c0, 0, 120, 0.22, 0.4, 0.6);
  spot.position.set(0, -0.8, 0);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -40, 0);
  group.add(spotTarget);
  spot.target = spotTarget;
  group.add(spot);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, 40, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.rotation.x = Math.PI;
  cone.position.y = -20;
  group.add(cone);

  group.visible = false;
  scene.add(group);
  return {
    model: group,
    rotor,
    tailRotor,
    spot,
    cone,
    pos: group.position,
    active: false, // flying above the player
    leaving: false,
    angle: 0, // orbit angle around the player
    height: 42,
  };
}

/**
 * Step the helicopter. wanted >= heliAt brings it in; below that it leaves.
 * Returns true while it is overhead (wanted cannot decay then).
 */
export function stepHelicopter(heli, dt, playerPos, wanted, heliAt) {
  heli.rotor.rotation.y += dt * 22;
  heli.tailRotor.rotation.x += dt * 30;
  if (wanted >= heliAt) {
    if (!heli.active) {
      // Fly in from the north edge.
      heli.active = true;
      heli.leaving = false;
      heli.model.visible = true;
      heli.pos.set(playerPos.x, heli.height, playerPos.z - 180);
      heli.angle = 0;
    }
    // Orbit the player, spotlight pinned on them.
    heli.angle += dt * 0.35;
    const rx = playerPos.x + Math.sin(heli.angle) * 26;
    const rz = playerPos.z + Math.cos(heli.angle) * 26;
    heli.pos.x += (rx - heli.pos.x) * Math.min(1, dt * 1.6);
    heli.pos.z += (rz - heli.pos.z) * Math.min(1, dt * 1.6);
    heli.pos.y += (heli.height + Math.sin(heli.angle * 2) * 3 - heli.pos.y) * Math.min(1, dt * 1.2);
    heli.model.lookAt(playerPos.x, heli.pos.y, playerPos.z);
    heli.spot.intensity = 220;
    heli.cone.material.opacity = 0.14;
    return true;
  }
  if (heli.active) {
    // Climb away and switch off once far enough.
    heli.leaving = true;
    heli.pos.y += 22 * dt;
    heli.pos.z -= 40 * dt;
    heli.spot.intensity = Math.max(0, heli.spot.intensity - dt * 200);
    heli.cone.material.opacity = Math.max(0, heli.cone.material.opacity - dt * 0.2);
    if (heli.pos.y > 130) {
      heli.active = false;
      heli.leaving = false;
      heli.model.visible = false;
    }
    return false;
  }
  return false;
}
