// Story missions for Solmar Heat: five jobs for the fixer Mara Voss, each a chain of steps
// with an objective marker, a timer where it matters, and a cash reward. Plus a free-roam
// side activity (taxi fares) the player can run from the pause menu.
// All characters, places and story beats are original.
import * as THREE from 'three';
import { MISSION_REWARDS } from './config.js';

// Mission spots on the map (streets are at -320..320 in steps of 80).
const SPOTS = {
  marasHouse: { x: 160, z: -160 },
  garage: { x: -80, z: 80 },
  dock: { x: -240, z: 280 },
  warehouse: { x: 240, z: 240 },
  bank: { x: 0, z: -80 },
  safehouse: { x: -240, z: -240 },
  plaza: { x: 0, z: 0 },
  beachBar: { x: 80, z: 280 },
};

const MISSIONS = [
  {
    id: 1,
    title: 'Wheels Up',
    giver: 'Mara Voss',
    brief: 'Mara needs a driver she can trust. Get yourself a car — any car — and bring it to her house on Coral Row.',
    steps: [
      { type: 'enterCar', text: 'Get in a car (walk up to one and press E)' },
      { type: 'goto', target: SPOTS.marasHouse, text: "Drive to Mara's house", radius: 10 },
    ],
  },
  {
    id: 2,
    title: 'Cab Call',
    giver: 'Mara Voss',
    brief: 'Mara’s cousin runs the cab rank. Three fares are waiting around town — pick them up and drop them off. Tips are good if you hurry.',
    steps: [
      { type: 'goto', target: { x: -160, z: 0 }, text: 'Pick up fare 1 at Palm Plaza', radius: 9 },
      { type: 'goto', target: { x: 80, z: 160 }, text: 'Drop fare 1 at the beach bar', radius: 9 },
      { type: 'goto', target: { x: 240, z: -80 }, text: 'Pick up fare 2 on Marina Row', radius: 9 },
      { type: 'goto', target: SPOTS.plaza, text: 'Drop fare 2 at the park', radius: 9 },
      { type: 'goto', target: { x: -80, z: -240 }, text: 'Pick up fare 3 uptown', radius: 9 },
      { type: 'goto', target: SPOTS.beachBar, text: 'Drop fare 3 at the beach bar', radius: 9 },
    ],
  },
  {
    id: 3,
    title: 'Hot Package',
    giver: 'Eddie Kwan',
    brief: 'A package is waiting at the south dock. Grab it and run it to the warehouse — the harbour police are already sniffing around.',
    steps: [
      { type: 'goto', target: SPOTS.dock, text: 'Pick up the package at the south dock', radius: 9 },
      { type: 'goto', target: SPOTS.warehouse, text: 'Deliver the package to the warehouse', radius: 9, onStart: 'heat' },
    ],
  },
  {
    id: 4,
    title: 'Rival Run',
    giver: 'Mara Voss',
    brief: 'Rico’s crew has been muscling in on our turf. Run their red sports car off the road — ram it or shoot it until it stops.',
    steps: [
      { type: 'chase', text: 'Stop the rival sports car (ram it or shoot it)', radius: 6 },
      { type: 'goto', target: SPOTS.garage, text: 'Return to the garage', radius: 10 },
    ],
  },
  {
    id: 5,
    title: 'The Big One',
    giver: 'Mara Voss',
    brief: 'The Solmar Trust Bank. Walk in, take the cash, and get out. The whole city will be looking for you — lose them and reach the safehouse.',
    steps: [
      { type: 'goto', target: SPOTS.bank, text: 'Reach the Solmar Trust Bank', radius: 10 },
      { type: 'wait', seconds: 6, text: 'Grabbing the cash — hold on...', onStart: 'heat4' },
      { type: 'escape', target: SPOTS.safehouse, text: 'Escape to the safehouse and lose the cops', radius: 10 },
    ],
  },
];

export function createMissions(scene) {
  // Objective marker: a glowing beacon column + a pulsing ground ring.
  const markerGroup = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 15;
  markerGroup.add(beam);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  markerGroup.add(ring);
  markerGroup.visible = false;
  scene.add(markerGroup);

  return {
    list: MISSIONS,
    activeIndex: -1, // index into MISSIONS, -1 = free roam
    stepIndex: 0,
    marker: markerGroup,
    markerPos: null, // {x, z} or null
    timer: 0, // step countdown for 'wait' steps
    rival: null, // the rival car for mission 4
    rivalHealth: 100,
    completed: [], // mission ids completed this save
    failedReason: null,
    fareTimer: 0,
  };
}

export function startMission(missions, index, G) {
  const m = missions.list[index];
  missions.activeIndex = index;
  missions.stepIndex = 0;
  missions.timer = 0;
  missions.failedReason = null;
  if (index === 3) {
    // Mission 4: spawn the rival car near the player and make it flee.
    const rival = G.spawnRivalCar();
    missions.rival = rival;
    missions.rivalHealth = 100;
  }
  enterStep(missions, G);
  return m;
}

function enterStep(missions, G) {
  const m = missions.list[missions.activeIndex];
  const step = m.steps[missions.stepIndex];
  missions.markerPos = null;
  missions.timer = 0;
  if (step.type === 'goto' || step.type === 'escape') {
    missions.markerPos = step.target;
  } else if (step.type === 'chase' && missions.rival) {
    missions.markerPos = null; // marker follows the rival car
  }
  if (step.onStart === 'heat') {
    G.police.wanted = Math.max(G.police.wanted, 2);
    G.audio.startSiren();
  }
  if (step.onStart === 'heat4') {
    G.police.wanted = 4;
    G.audio.startSiren();
  }
  if (step.type === 'wait') missions.timer = step.seconds;
  updateMarker(missions);
}

function updateMarker(missions) {
  const m = missions.marker;
  if (missions.markerPos) {
    m.visible = true;
    m.position.set(missions.markerPos.x, 0, missions.markerPos.z);
  } else {
    m.visible = false;
  }
}

export function currentObjective(missions) {
  if (missions.activeIndex < 0) return null;
  const m = missions.list[missions.activeIndex];
  const step = m.steps[missions.stepIndex];
  return { mission: m, step, stepIndex: missions.stepIndex, total: m.steps.length };
}

/**
 * Advance the active mission. Returns 'complete' | 'failed' | null.
 * G carries player, cars, police, audio and callbacks.
 */
export function stepMissions(missions, dt, G) {
  if (missions.activeIndex < 0) return null;
  const m = missions.list[missions.activeIndex];
  const step = m.steps[missions.stepIndex];
  const playerPos = G.player.inCar ? G.player.inCar.pos : G.player.pos;
  let done = false;

  if (step.type === 'enterCar') {
    done = !!G.player.inCar;
  } else if (step.type === 'goto' || step.type === 'escape') {
    const d = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
    if (step.type === 'escape') {
      done = d < step.radius && G.police.wanted === 0;
    } else {
      done = d < step.radius;
    }
  } else if (step.type === 'wait') {
    missions.timer -= dt;
    done = missions.timer <= 0;
  } else if (step.type === 'chase') {
    const rival = missions.rival;
    if (!rival || rival.dead) {
      done = true;
    } else {
      // Marker follows the rival.
      missions.marker.visible = true;
      missions.marker.position.set(rival.pos.x, 0, rival.pos.z);
      missions.markerPos = { x: rival.pos.x, z: rival.pos.z };
      const d = Math.hypot(playerPos.x - rival.pos.x, playerPos.z - rival.pos.z);
      // Ram damage: a hard hit at speed hurts the rival.
      if (d < 5 && G.player.inCar && Math.abs(G.player.inCar.speed) > 10) {
        missions.rivalHealth -= 25 * dt * 4;
      }
      if (missions.rivalHealth <= 0) {
        rival.speed = 0;
        rival.dead = true;
        done = true;
      }
    }
  }

  // Failure: busted or wasted is handled by main; a chase that runs too far fails.
  if (step.type === 'chase' && missions.rival && !missions.rival.dead) {
    const d = Math.hypot(playerPos.x - missions.rival.pos.x, playerPos.z - missions.rival.pos.z);
    if (d > 300) {
      missions.failedReason = 'You lost the rival car.';
      return 'failed';
    }
  }

  if (!done) return null;
  missions.stepIndex += 1;
  if (missions.stepIndex >= m.steps.length) {
    const reward = MISSION_REWARDS[missions.activeIndex];
    G.player.cash += reward;
    missions.completed.push(m.id);
    missions.activeIndex = -1;
    missions.markerPos = null;
    missions.marker.visible = false;
    missions.rival = null;
    G.audio.success();
    G.audio.cash();
    return 'complete';
  }
  G.audio.pickup();
  enterStep(missions, G);
  return null;
}

export function abortMission(missions) {
  missions.activeIndex = -1;
  missions.stepIndex = 0;
  missions.markerPos = null;
  missions.marker.visible = false;
  missions.rival = null;
  missions.failedReason = null;
}
