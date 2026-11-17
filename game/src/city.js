// The city of Solmar: a procedural coastal grid built from boxes and canvas textures.
// Ground (roads, sidewalks, beach, lane markings) is one big canvas texture; buildings are
// boxes with a generated window facade; streetlights, trees, benches and hydrants are props.
// Exports the collision boxes and the road graph the traffic, minimap and missions use.
import * as THREE from 'three';
import { PALETTE, WORLD } from './config.js';

const STREETS = [];
for (let i = 0; i < WORLD.streetCount; i += 1) {
  STREETS.push(-320 + i * WORLD.streetSpacing);
}

function makeFacadeTexture(base, lit) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = `#${base.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 0, 128, 256);
  const cols = 5;
  const rows = 10;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const on = Math.random() < 0.42;
      g.fillStyle = on ? (lit ? '#ffd98a' : '#ffe9b0') : '#2b3542';
      g.fillRect(10 + x * 22, 12 + y * 24, 14, 15);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGroundTexture() {
  const S = 2048;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const toPx = (v) => ((v + WORLD.halfSize) / (WORLD.halfSize * 2)) * S;
  // Base: concrete.
  g.fillStyle = '#8f8a7e';
  g.fillRect(0, 0, S, S);
  // Block tops: slightly varied concrete / grass lots.
  for (let i = 0; i < WORLD.streetCount - 1; i += 1) {
    for (let j = 0; j < WORLD.streetCount - 1; j += 1) {
      const x0 = STREETS[i] + WORLD.roadWidth / 2;
      const z0 = STREETS[j] + WORLD.roadWidth / 2;
      const size = WORLD.streetSpacing - WORLD.roadWidth;
      g.fillStyle = (i + j) % 3 === 0 ? '#7fae62' : '#a39d8f';
      g.fillRect(toPx(x0), toPx(z0), toPx(x0 + size) - toPx(x0), toPx(z0 + size) - toPx(z0));
    }
  }
  // Roads.
  g.fillStyle = '#2e2f33';
  for (const s of STREETS) {
    g.fillRect(toPx(s - WORLD.roadWidth / 2), 0, toPx(WORLD.roadWidth) - toPx(0), S);
    g.fillRect(0, toPx(s - WORLD.roadWidth / 2), S, toPx(WORLD.roadWidth) - toPx(0));
  }
  // Lane dashes.
  g.fillStyle = '#e8d44d';
  for (const s of STREETS) {
    for (let v = -WORLD.halfSize; v < WORLD.halfSize; v += 16) {
      g.fillRect(toPx(s - 0.4), toPx(v), toPx(0.8) - toPx(0), toPx(7) - toPx(0));
      g.fillRect(toPx(v), toPx(s - 0.4), toPx(7) - toPx(0), toPx(0.8) - toPx(0));
    }
  }
  // Crosswalks at intersections.
  g.fillStyle = '#d8d8d8';
  for (const sx of STREETS) {
    for (const sz of STREETS) {
      for (let k = -3; k <= 3; k += 1) {
        g.fillRect(toPx(sx + k * 2 - 0.8), toPx(sz - WORLD.roadWidth / 2 + 1), toPx(1.6) - toPx(0), toPx(3) - toPx(0));
        g.fillRect(toPx(sx + k * 2 - 0.8), toPx(sz + WORLD.roadWidth / 2 - 4), toPx(1.6) - toPx(0), toPx(3) - toPx(0));
      }
    }
  }
  // Beach sand (south edge) and a boardwalk strip.
  g.fillStyle = '#e3cf9e';
  g.fillRect(0, toPx(WORLD.beachZ), S, S - toPx(WORLD.beachZ));
  g.fillStyle = '#b08d5a';
  g.fillRect(0, toPx(WORLD.beachZ - 6), S, toPx(6) - toPx(0));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createCity(scene, random) {
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const buildings = []; // {x,z,w,d,h} for minimap + placement
  const group = new THREE.Group();
  group.name = 'city';

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.halfSize * 2, WORLD.halfSize * 2),
    new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Water (south of the beach) with a slow animated offset.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.halfSize * 2, 120),
    new THREE.MeshStandardMaterial({ color: PALETTE.water, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.9 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.1, WORLD.waterZ + 60);
  group.add(water);

  // Buildings: 1-4 per block, varied heights, window facades.
  const facadeMats = PALETTE.building.map((col) => {
    const tex = makeFacadeTexture(col, false);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6f6a66, roughness: 0.95 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < WORLD.streetCount - 1; i += 1) {
    for (let j = 0; j < WORLD.streetCount - 1; j += 1) {
      const bx = STREETS[i] + WORLD.roadWidth / 2;
      const bz = STREETS[j] + WORLD.roadWidth / 2;
      const blockSize = WORLD.streetSpacing - WORLD.roadWidth;
      // Skip the plaza block in the middle (a park with trees).
      if (i === 4 && j === 4) continue;
      const count = 1 + Math.floor(random() * 3);
      for (let k = 0; k < count; k += 1) {
        const w = 14 + random() * 22;
        const d = 14 + random() * 22;
        const x = bx + 6 + random() * Math.max(1, blockSize - 12 - w);
        const z = bz + 6 + random() * Math.max(1, blockSize - 12 - d);
        const h = 9 + random() * random() * 55;
        const mesh = new THREE.Mesh(boxGeo, facadeMats[Math.floor(random() * facadeMats.length)]);
        mesh.scale.set(w, h, d);
        mesh.position.set(x + w / 2, h / 2, z + d / 2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w + 0.6, 0.8, d + 0.6);
        roof.position.set(x + w / 2, h + 0.4, z + d / 2);
        group.add(roof);
        colliders.push({ minX: x, maxX: x + w, minZ: z, maxZ: z + d });
        buildings.push({ x: x + w / 2, z: z + d / 2, w, d, h });
      }
    }
  }

  // Park in the centre block: trees + benches + a fountain disc.
  const park = { minX: STREETS[4] + 8, maxX: STREETS[5] - 8, minZ: STREETS[4] + 8, maxZ: STREETS[5] - 8 };
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f8f3a, roughness: 1 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 0.9 });
  for (let t = 0; t < 14; t += 1) {
    const x = park.minX + 4 + random() * (park.maxX - park.minX - 8);
    const z = park.minZ + 4 + random() * (park.maxZ - park.minZ - 8);
    addTree(group, x, z, trunkMat, leafMat, random);
  }
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 8, 1, 20),
    new THREE.MeshStandardMaterial({ color: 0x9fc4d4, roughness: 0.3 }),
  );
  fountain.position.set((park.minX + park.maxX) / 2, 0.5, (park.minZ + park.maxZ) / 2);
  group.add(fountain);
  colliders.push({ minX: (park.minX + park.maxX) / 2 - 8, maxX: (park.minX + park.maxX) / 2 + 8, minZ: (park.minZ + park.maxZ) / 2 - 8, maxZ: (park.minZ + park.maxZ) / 2 + 8 });

  // Streetlights along every street, plus a few palm trees and hydrants on sidewalks.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.5 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd76a, emissiveIntensity: 0.9 });
  const lampGeo = new THREE.SphereGeometry(0.45, 8, 6);
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6, 6);
  const armGeo = new THREE.BoxGeometry(1.6, 0.12, 0.12);
  const lights = [];
  for (const s of STREETS) {
    for (let v = -280; v <= 280; v += 80) {
      for (const [x, z, armRot] of [[s + 9, v, 0], [v, s + 9, Math.PI / 2]]) {
        if (Math.abs(x) > 330 || Math.abs(z) > 330) continue;
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 3, z);
        group.add(pole);
        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(x, 5.9, z);
        arm.rotation.y = armRot;
        group.add(arm);
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(x + (armRot === 0 ? -1.4 : 0), 5.8, z + (armRot === 0 ? 0 : -1.4));
        group.add(lamp);
        lights.push(lamp);
      }
    }
  }
  // Palms along the beach boardwalk.
  for (let x = -320; x <= 320; x += 40) {
    addTree(group, x + (random() - 0.5) * 6, WORLD.beachZ - 12, trunkMat, leafMat, random, true);
  }
  // Hydrants.
  const hydMat = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.6 });
  for (let h = 0; h < 24; h += 1) {
    const s = STREETS[Math.floor(random() * STREETS.length)];
    const v = -320 + random() * 640;
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.9, 8), hydMat);
    hyd.position.set(s + 9.5, 0.45, v);
    group.add(hyd);
  }

  scene.add(group);
  return {
    group, colliders, buildings, streets: STREETS, lights, water,
    /** True when the point (with radius) is inside any building/fountain. */
    collides(x, z, radius) {
      for (const c of colliders) {
        if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) return true;
      }
      return false;
    },
    /** Push a circle out of buildings; returns the corrected position. */
    resolveCircle(x, z, radius) {
      for (const c of colliders) {
        const cx = Math.max(c.minX, Math.min(x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
        const dx = x - cx;
        const dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < radius * radius) {
          if (d2 > 1e-6) {
            const d = Math.sqrt(d2);
            x = cx + (dx / d) * radius;
            z = cz + (dz / d) * radius;
          } else {
            // Centre inside the box: push out along the smallest penetration axis.
            const pushL = x - c.minX + radius;
            const pushR = c.maxX - x + radius;
            const pushT = z - c.minZ + radius;
            const pushB = c.maxZ - z + radius;
            const m = Math.min(pushL, pushR, pushT, pushB);
            if (m === pushL) x = c.minX - radius;
            else if (m === pushR) x = c.maxX + radius;
            else if (m === pushT) z = c.minZ - radius;
            else z = c.maxZ + radius;
          }
        }
      }
      return { x, z };
    },
    /** Nearest street coordinate to a value (for snapping traffic/peds to roads). */
    nearestStreet(v) {
      let best = STREETS[0];
      for (const s of STREETS) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
      return best;
    },
    /** A random point on a road (for spawning cars/peds). */
    randomRoadPoint(randomFn) {
      const horizontal = randomFn() < 0.5;
      const s = STREETS[Math.floor(randomFn() * STREETS.length)];
      const v = -320 + randomFn() * 640;
      return horizontal ? { x: v, z: s } : { x: s, z: v };
    },
  };
}

function addTree(group, x, z, trunkMat, leafMat, random, palm = false) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, palm ? 4.5 : 2.6, 6), trunkMat);
  trunk.position.set(x, palm ? 2.25 : 1.3, z);
  trunk.castShadow = true;
  group.add(trunk);
  const leaf = new THREE.Mesh(
    palm ? new THREE.ConeGeometry(2.2, 2.4, 7) : new THREE.SphereGeometry(1.6 + random() * 0.8, 8, 6),
    leafMat,
  );
  leaf.position.set(x, palm ? 5.2 : 3.4, z);
  leaf.castShadow = true;
  group.add(leaf);
}
