// Hidden stash collectibles for Solmar Heat v2.2: eight glowing crates tucked
// away around the city — a park bench, the beach, a downtown sidewalk, the old
// town kerb. Finding one pays $250. Found stashes stay found across saves
// (save.js stores their indices) and show on the minimap as green diamonds.
// All spots sit on parks, beach sand or sidewalks, never inside a building.
import * as THREE from 'three';
import { STASH_REWARD, STASH_COUNT } from './config.js';
import { writeSave } from './save.js';

// Stash spots: parks, beach sand and sidewalks (safe ground, no buildings).
const STASH_SPOTS = [
  { x: 20, z: 20 }, // Palm Plaza Park, by the trees
  { x: 60, z: 60 }, // Palm Plaza Park, south corner
  { x: 180, z: -100 }, // East Park, by the pond
  { x: 120, z: 316 }, // Solmar Beach, east end
  { x: -40, z: 320 }, // Solmar Beach, middle
  { x: 240, z: 316 }, // Solmar Beach, far east
  { x: -311, z: 160 }, // Old Town sidewalk
  { x: 160, z: -311 }, // Downtown sidewalk
];

export function createCollectibles(scene) {
  const stashes = [];
  const crateGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const glowGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  for (let i = 0; i < STASH_COUNT; i += 1) {
    const spot = STASH_SPOTS[i % STASH_SPOTS.length];
    const group = new THREE.Group();
    const crate = new THREE.Mesh(
      crateGeo,
      new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.7, emissive: 0x1a5c34, emissiveIntensity: 0.5 }),
    );
    crate.position.y = 0.55;
    crate.castShadow = true;
    group.add(crate);
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.16, 0.95),
      new THREE.MeshStandardMaterial({ color: 0xffd23c, roughness: 0.5, emissive: 0xaa8800, emissiveIntensity: 0.6 }),
    );
    lid.position.y = 1.05;
    group.add(lid);
    const glow = new THREE.Mesh(
      glowGeo,
      new THREE.MeshBasicMaterial({ color: 0x37d67a, transparent: true, opacity: 0.14, depthWrite: false }),
    );
    glow.position.y = 0.6;
    group.add(glow);
    group.position.set(spot.x, 0, spot.z);
    scene.add(group);
    stashes.push({ x: spot.x, z: spot.z, group, glow, found: false, bob: i * 0.8 });
  }
  return {
    stashes,
    total: STASH_COUNT,
    /** How many stashes the player has found so far. */
    get foundCount() {
      let n = 0;
      for (const s of stashes) if (s.found) n += 1;
      return n;
    },
    /** Mark stashes found (by index) — used when a save is loaded. */
    markFound(indices) {
      if (!Array.isArray(indices)) return;
      for (const i of indices) {
        const s = stashes[i];
        if (s && !s.found) {
          s.found = true;
          s.group.visible = false;
        }
      }
    },
    /** Indices of the stashes found so far, for the save file. */
    foundIndices() {
      const out = [];
      stashes.forEach((s, i) => { if (s.found) out.push(i); });
      return out;
    },
  };
}

/**
 * Step the stashes: bob + spin the unfound ones, and collect any the player
 * walks over on foot. Returns the number collected this step (0 or 1).
 */
export function stepCollectibles(collectibles, dt, G) {
  const player = G.player;
  if (player.inCar) return 0;
  let collected = 0;
  for (const s of collectibles.stashes) {
    if (s.found) continue;
    s.group.rotation.y += dt * 1.2;
    s.group.position.y = Math.sin(G.time * 2 + s.bob) * 0.12;
    s.glow.material.opacity = 0.11 + Math.sin(G.time * 3 + s.bob) * 0.05;
    const d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z);
    if (d < 2.2) {
      s.found = true;
      s.group.visible = false;
      player.cash += STASH_REWARD;
      collected += 1;
      G.audio.pickup();
      const n = collectibles.foundCount;
      G.hud.showToast(
        n >= collectibles.total
          ? `Hidden stash found! +$${STASH_REWARD} — all ${collectibles.total} stashes found!`
          : `Hidden stash found! +$${STASH_REWARD} (${n}/${collectibles.total})`,
        2800,
      );
      writeSaveIfPossible(G);
    }
  }
  return collected;
}

// A stash find is worth keeping: persist the save right away so a crash or a
// quit does not lose it. writeSave is cheap and never throws.
function writeSaveIfPossible(G) {
  try {
    writeSave(G);
  } catch {
    // Saving must never break play.
  }
}
