// The city of Solmar v2: a procedural coastal grid built from boxes and canvas textures.
// Ground (roads, sidewalks, beach, lane markings) is one big canvas texture; buildings are
// boxes with a generated window facade; streetlights, trees, benches and hydrants are props.
// v2 adds a downtown tower district up north, a second park, the marina pier with a
// lighthouse and bobbing boats, billboard signs, and bus stops — plus districtAt() so the
// HUD can name where the player is standing.
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

function makeBillboardTexture(text, bg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = `#${bg.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 6;
  g.strokeRect(4, 4, 248, 120);
  g.fillStyle = '#ffffff';
  g.font = 'bold 34px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 66, 236);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
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
    new THREE.PlaneGeometry(WORLD.halfSize * 2, 160),
    new THREE.MeshStandardMaterial({ color: PALETTE.water, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.9 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.1, WORLD.waterZ + 80);
  group.add(water);

  // Buildings: 1-4 per block, varied heights, window facades. The three northern
  // rows are the downtown tower district: taller, with rooftop plant and antennas.
  const facadeMats = PALETTE.building.map((col) => {
    const tex = makeFacadeTexture(col, false);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6f6a66, roughness: 0.95 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.7 });
  const acMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.9 });
  for (let i = 0; i < WORLD.streetCount - 1; i += 1) {
    for (let j = 0; j < WORLD.streetCount - 1; j += 1) {
      const bx = STREETS[i] + WORLD.roadWidth / 2;
      const bz = STREETS[j] + WORLD.roadWidth / 2;
      const blockSize = WORLD.streetSpacing - WORLD.roadWidth;
      // Skip the plaza block in the middle (a park with trees) and the east park.
      if ((i === 4 && j === 4) || (i === 6 && j === 2)) continue;
      const downtown = j <= 2; // northern rows are the tower district
      const count = downtown ? 1 + Math.floor(random() * 2) : 1 + Math.floor(random() * 3);
      for (let k = 0; k < count; k += 1) {
        const w = 14 + random() * 22;
        const d = 14 + random() * 22;
        const x = bx + 6 + random() * Math.max(1, blockSize - 12 - w);
        const z = bz + 6 + random() * Math.max(1, blockSize - 12 - d);
        const h = downtown
          ? 45 + random() * random() * 75
          : 9 + random() * random() * 55;
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
        // Rooftop plant: an AC box, and downtown towers get a blinking antenna.
        const ac = new THREE.Mesh(boxGeo, acMat);
        ac.scale.set(3, 1.4, 2.4);
        ac.position.set(x + w / 2 - 3, h + 1.5, z + d / 2);
        group.add(ac);
        if (downtown && random() < 0.5) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 9, 6), antennaMat);
          ant.position.set(x + w / 2 + 5, h + 5.2, z + d / 2 - 4);
          group.add(ant);
          const tip = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 1.4 }),
          );
          tip.position.set(x + w / 2 + 5, h + 9.8, z + d / 2 - 4);
          group.add(tip);
        }
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
  function plantPark(bounds, treeCount) {
    for (let t = 0; t < treeCount; t += 1) {
      const x = bounds.minX + 4 + random() * (bounds.maxX - bounds.minX - 8);
      const z = bounds.minZ + 4 + random() * (bounds.maxZ - bounds.minZ - 8);
      addTree(group, x, z, trunkMat, leafMat, random);
    }
    // Benches along the park edge.
    for (let b = 0; b < 4; b += 1) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.9), benchMat);
      bench.position.set(bounds.minX + 6 + b * 12, 0.45, bounds.minZ + 3);
      group.add(bench);
    }
  }
  plantPark(park, 14);
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 8, 1, 20),
    new THREE.MeshStandardMaterial({ color: 0x9fc4d4, roughness: 0.3 }),
  );
  fountain.position.set((park.minX + park.maxX) / 2, 0.5, (park.minZ + park.maxZ) / 2);
  group.add(fountain);
  colliders.push({ minX: (park.minX + park.maxX) / 2 - 8, maxX: (park.minX + park.maxX) / 2 + 8, minZ: (park.minZ + park.maxZ) / 2 - 8, maxZ: (park.minZ + park.maxZ) / 2 + 8 });

  // Second park, east side: a quieter green with a pond disc.
  const eastPark = { minX: STREETS[6] + 8, maxX: STREETS[7] - 8, minZ: STREETS[2] + 8, maxZ: STREETS[3] - 8 };
  plantPark(eastPark, 10);
  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6.5, 0.6, 18),
    new THREE.MeshStandardMaterial({ color: 0x4a8ab0, roughness: 0.2 }),
  );
  pond.position.set((eastPark.minX + eastPark.maxX) / 2, 0.3, (eastPark.minZ + eastPark.maxZ) / 2);
  group.add(pond);

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

  // Billboards on a few downtown towers and the warehouse block.
  const billboards = [
    { text: 'SOLMAR', bg: PALETTE.billboard[0], x: -200, z: -240, yaw: 0 },
    { text: 'VOSS & CO', bg: PALETTE.billboard[1], x: 40, z: -240, yaw: Math.PI },
    { text: 'BEACH BAR', bg: PALETTE.billboard[2], x: 200, z: 240, yaw: Math.PI / 2 },
    { text: 'MARINA', bg: PALETTE.billboard[3], x: -240, z: 80, yaw: -Math.PI / 2 },
  ];
  for (const b of billboards) {
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 11),
      new THREE.MeshStandardMaterial({ map: makeBillboardTexture(b.text, b.bg), roughness: 0.7 }),
    );
    board.position.set(b.x, 26, b.z);
    board.rotation.y = b.yaw;
    group.add(board);
    const post = new THREE.Mesh(new THREE.BoxGeometry(1, 26, 1), poleMat);
    post.position.set(b.x, 13, b.z - 0.4);
    group.add(post);
  }

  // Bus stops: a shelter + bench at four intersections.
  const stopSpots = [[-80, -80], [160, 80], [-240, 160], [80, -240]];
  for (const [sx, sz] of stopSpots) {
    const shelter = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 2.2), new THREE.MeshStandardMaterial({ color: 0x2e6fc2, roughness: 0.6 }));
    shelter.position.set(sx + 11, 2.6, sz + 2);
    group.add(shelter);
    for (const px of [-2, 2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), poleMat);
      post.position.set(sx + 11 + px, 1.3, sz + 2.8);
      group.add(post);
    }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.8), benchMat);
    bench.position.set(sx + 11, 0.5, sz + 2.4);
    group.add(bench);
  }

  // Marina pier: a wooden deck from the boardwalk out over the water, with posts,
  // a lighthouse at the end, and three boats bobbing beside it.
  const pierMat = new THREE.MeshStandardMaterial({ color: PALETTE.pierWood, roughness: 0.9 });
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, WORLD.pierEndZ - WORLD.pierZ), pierMat);
  pierDeck.position.set(WORLD.pierX, 0.8, (WORLD.pierZ + WORLD.pierEndZ) / 2);
  pierDeck.castShadow = true;
  pierDeck.receiveShadow = true;
  group.add(pierDeck);
  for (let z = WORLD.pierZ + 6; z < WORLD.pierEndZ; z += 14) {
    for (const dx of [-4.4, 4.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.4, 8), pierMat);
      post.position.set(WORLD.pierX + dx, 0.4, z);
      group.add(post);
    }
  }
  const pierEnd = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 12), pierMat);
  pierEnd.position.set(WORLD.pierX, 0.9, WORLD.pierEndZ);
  pierEnd.castShadow = true;
  group.add(pierEnd);
  // The deck itself blocks walking (the pier is raised over the water), so the
  // player strolls around it on the sand instead of clipping through the boards.
  colliders.push({ minX: WORLD.pierX - 5, maxX: WORLD.pierX + 5, minZ: WORLD.pierZ, maxZ: WORLD.pierEndZ });

  // Lighthouse: striped tower on the pier platform, with a rotating beam.
  const lightHouse = new THREE.Group();
  const towerMat = new THREE.MeshStandardMaterial({ color: PALETTE.lighthouse, roughness: 0.8 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: PALETTE.lighthouseStripe, roughness: 0.8 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 16, 12), towerMat);
  tower.position.y = 8;
  tower.castShadow = true;
  lightHouse.add(tower);
  for (const y of [4.5, 10.5]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.5, 2.4, 12), stripeMat);
    band.position.y = y;
    lightHouse.add(band);
  }
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 2.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.5 }),
  );
  lampRoom.position.y = 17;
  lightHouse.add(lampRoom);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.5 });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 26, 12, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(14, 17, 0);
  lightHouse.add(beam);
  const beamLight = new THREE.PointLight(0xfff2b0, 0, 90, 1.5);
  beamLight.position.y = 17;
  lightHouse.add(beamLight);
  lightHouse.position.set(WORLD.pierX, 1.2, WORLD.pierEndZ);
  group.add(lightHouse);
  colliders.push({ minX: WORLD.pierX - 8, maxX: WORLD.pierX + 8, minZ: WORLD.pierEndZ - 6, maxZ: WORLD.pierEndZ + 6 });

  // Boats: hull + mast + sail, bobbing gently (animated in stepCity).
  const boats = [];
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.6 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8, side: THREE.DoubleSide });
  for (const [bx, bz, phase] of [[-196, 372, 0], [-132, 396, 2.1], [-188, 412, 4.2]]) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 8), hullMat);
    hull.position.y = 0.4;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6, 6), poleMat);
    mast.position.y = 3.4;
    boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.4), sailMat);
    sail.position.set(0, 3.6, -0.4);
    boat.add(sail);
    boat.position.set(bx, 0.2, bz);
    boat.rotation.y = (phase * 0.7) % Math.PI;
    group.add(boat);
    boats.push({ group: boat, phase, baseY: 0.2 });
  }

  scene.add(group);
  return {
    group, colliders, buildings, streets: STREETS, lights, water,
    pier: { x: WORLD.pierX, z0: WORLD.pierZ, z1: WORLD.pierEndZ },
    lighthouse: lightHouse,
    lighthouseBeam: beam,
    lighthouseLight: beamLight,
    boats,
    /** Bob the boats and sweep the lighthouse beam. Called once a frame. */
    stepCity(time) {
      for (const b of boats) {
        b.group.position.y = b.baseY + Math.sin(time * 0.9 + b.phase) * 0.22;
        b.group.rotation.z = Math.sin(time * 0.7 + b.phase) * 0.03;
      }
      lightHouse.rotation.y = time * 0.25;
      beamLight.intensity = 60 + Math.sin(time * 2) * 15;
    },
    /** Name the district at a world position, for the HUD. */
    districtAt(x, z) {
      if (z >= WORLD.beachZ && x > WORLD.pierX - 30 && x < WORLD.pierX + 30 && z <= WORLD.pierEndZ) return 'Marina Pier';
      if (z >= WORLD.beachZ) return 'Solmar Beach';
      if (z >= WORLD.waterZ) return 'The Sea';
      if (x >= park.minX && x <= park.maxX && z >= park.minZ && z <= park.maxZ) return 'Palm Plaza Park';
      if (x >= eastPark.minX && x <= eastPark.maxX && z >= eastPark.minZ && z <= eastPark.maxZ) return 'East Park';
      if (z <= -240) return 'Downtown';
      if (x <= -160) return 'Old Town';
      if (x >= 160) return 'Marina Row';
      return 'Uptown';
    },
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
