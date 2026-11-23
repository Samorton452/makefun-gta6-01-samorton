// Story missions for Solmar Heat v2.2: twelve jobs — ten for Mara Voss's crew,
// one for the new fixer Lena Cross (mission 11), and a finale for Mara (12).
// Each a chain of steps with an objective marker, a timer where it matters,
// and a cash reward.
// Step types: enterCar, goto, escape, chase, wait, timed (goto against the clock),
// survive (hold out at high wanted for N seconds), collect (visit N spots), steal
// (take a specific car). Timed steps fail when the clock runs out.
// All characters, places and story beats are original.
import * as THREE from 'three';
import { MISSION_REWARDS } from './config.js';
import { createCar } from './vehicles.js';

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
  marina: { x: -160, z: 320 },
  lighthouse: { x: -160, z: 400 },
  tower: { x: -80, z: -240 },
  airport: { x: 240, z: -240 },
  eastPark: { x: 200, z: -160 },
  northGate: { x: 0, z: -320 },
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
  {
    id: 6,
    title: 'Shake Down',
    giver: 'Eddie Kwan',
    brief: 'Three shops on Marina Row owe the crew protection money. Swing by each one and collect — politely, but firmly.',
    steps: [
      {
        type: 'collect',
        targets: [
          { x: 240, z: -160, text: 'Collect from the corner store on Marina Row' },
          { x: 160, z: 0, text: 'Collect from the surf shop' },
          { x: 240, z: 160, text: 'Collect from the diner' },
        ],
        text: 'Collect protection money (0/3)',
        radius: 9,
      },
    ],
  },
  {
    id: 7,
    title: 'Night Run',
    giver: 'Mara Voss',
    brief: 'A boat is coming in at the marina after dark. Grab the cargo off the pier and run it to the beach bar — you have 90 seconds before the harbour patrol locks the docks down.',
    steps: [
      { type: 'goto', target: SPOTS.marina, text: 'Reach the marina pier', radius: 10 },
      { type: 'timed', target: SPOTS.beachBar, seconds: 90, text: 'Deliver the cargo to the beach bar — fast!', radius: 10, onStart: 'heat' },
    ],
  },
  {
    id: 8,
    title: 'Deadline',
    giver: 'Mara Voss',
    brief: 'A buyer is waiting at the north gate and the clock is running. Hit all four checkpoints across town in 75 seconds — miss one and the deal is dead.',
    steps: [
      {
        type: 'timed',
        targets: [
          { x: -240, z: 80, text: 'Checkpoint 1 — Old Town' },
          { x: 80, z: -240, text: 'Checkpoint 2 — Downtown' },
          { x: 240, z: 80, text: 'Checkpoint 3 — Marina Row' },
          { x: 0, z: -320, text: 'Checkpoint 4 — the north gate' },
        ],
        seconds: 75,
        text: 'Hit the checkpoints (0/4)',
        radius: 10,
      },
    ],
  },
  {
    id: 9,
    title: 'Heat Wave',
    giver: 'Mara Voss',
    brief: 'The whole Solmar PD is on you — five stars, helicopter overhead. Survive 90 seconds of heat and prove you cannot be caught.',
    steps: [
      { type: 'survive', seconds: 90, text: 'Survive the heat — stay alive for 90 seconds!', onStart: 'heat5' },
    ],
  },
  {
    id: 10,
    title: 'King of Solmar',
    giver: 'Mara Voss',
    brief: 'The Sunset GT — the rarest car on the coast — is parked at the marina, and Rico’s crew is guarding it. Steal it, lose the chase, and bring it home to the garage. Do this, and the city is yours.',
    steps: [
      { type: 'steal', carType: 'gt', text: 'Steal the Sunset GT at the marina (press E)', onStart: 'heat3' },
      { type: 'goto', target: SPOTS.garage, text: 'Bring the GT to the garage', radius: 10 },
    ],
  },
  {
    id: 11,
    title: 'Harbour Heist',
    giver: 'Lena Cross',
    brief: 'Lena Cross runs the harbour — and she has a job Mara would never touch. The warehouse vault holds a shipment of uncut stones. Crack it, hold the room while the safe opens, and slip out to the marina before the harbour patrol locks the docks.',
    steps: [
      { type: 'goto', target: SPOTS.warehouse, text: 'Reach the warehouse on Marina Row', radius: 10 },
      { type: 'wait', seconds: 8, text: 'Cracking the vault — hold on...', onStart: 'heat4' },
      { type: 'escape', target: SPOTS.marina, text: 'Escape to the marina and lose the cops', radius: 10 },
    ],
  },
  {
    id: 12,
    title: 'The Last Score',
    giver: 'Mara Voss',
    brief: 'One last job, then Mara retires the crew on top. Three vault keys are stashed across town — the bank, the downtown tower and the airport office. Grab all three, then run the GT’s sister car to the garage in 90 seconds while the whole city watches.',
    steps: [
      {
        type: 'collect',
        targets: [
          { x: 0, z: -80, text: 'Vault key 1 — the Solmar Trust Bank' },
          { x: -80, z: -240, text: 'Vault key 2 — the downtown tower' },
          { x: 240, z: -240, text: 'Vault key 3 — the airport office' },
        ],
        text: 'Collect the vault keys (0/3)',
        radius: 9,
      },
      { type: 'timed', target: SPOTS.garage, seconds: 90, text: 'Run to the garage — 90 seconds!', radius: 10, onStart: 'heat3' },
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
    timeLeft: null, // seconds left on a timed/survive step (HUD reads this)
    rival: null, // the rival car for mission 4
    rivals: [], // rival cars for mission 10
    rivalHealth: 100,
    gtCar: null, // the Sunset GT for mission 10
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
  missions.timeLeft = null;
  missions.failedReason = null;
  if (index === 3) {
    // Mission 4: spawn the rival car near the player and make it flee.
    const rival = G.spawnRivalCar();
    missions.rival = rival;
    missions.rivalHealth = 100;
  }
  if (index === 9) {
    // Mission 10: the Sunset GT waits at the marina; two rival sports cars guard it.
    // A restart first clears the previous attempt's cars so only one GT exists.
    if (missions.gtCar) {
      G.scene.remove(missions.gtCar.model);
      missions.gtCar.dead = true;
      missions.gtCar = null;
    }
    for (const old of missions.rivals) {
      G.scene.remove(old.model);
      old.dead = true;
    }
    missions.rivals = [];
    const gt = createCar(G.scene, 'gt', -160, 300, Math.PI / 2, 0xd8a020);
    gt.driver = null;
    G.parkedCars.push(gt);
    G.allCars.push(gt);
    missions.gtCar = gt;
    missions.rivals = [];
    for (const dx of [-14, 14]) {
      const rival = createCar(G.scene, 'sports', -160 + dx, 280, 0, 0xc22e2e);
      rival.driver = 'rival';
      G.allCars.push(rival);
      missions.rivals.push(rival);
    }
  }
  enterStep(missions, G);
  return m;
}

function enterStep(missions, G) {
  const m = missions.list[missions.activeIndex];
  const step = m.steps[missions.stepIndex];
  missions.markerPos = null;
  missions.timer = 0;
  missions.timeLeft = null;
  if (step.type === 'goto' || step.type === 'escape') {
    missions.markerPos = step.target;
  } else if (step.type === 'timed' && step.target) {
    missions.markerPos = step.target;
    missions.timeLeft = step.seconds;
  } else if (step.type === 'timed' && step.targets) {
    missions.markerPos = step.targets[0];
    missions.timeLeft = step.seconds;
    step.collected = 0;
  } else if (step.type === 'collect') {
    missions.markerPos = step.targets[0];
    step.collected = 0;
  } else if (step.type === 'chase' && missions.rival) {
    missions.markerPos = null; // marker follows the rival car
  } else if (step.type === 'survive') {
    missions.timeLeft = step.seconds;
  } else if (step.type === 'steal' && missions.gtCar) {
    missions.markerPos = { x: missions.gtCar.pos.x, z: missions.gtCar.pos.z };
  }
  if (step.onStart === 'heat') {
    G.police.wanted = Math.max(G.police.wanted, 2);
    G.audio.startSiren();
  }
  if (step.onStart === 'heat3') {
    G.police.wanted = Math.max(G.police.wanted, 3);
    G.audio.startSiren();
  }
  if (step.onStart === 'heat4') {
    G.police.wanted = 4;
    G.audio.startSiren();
  }
  if (step.onStart === 'heat5') {
    G.police.wanted = 5;
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
  } else if (step.type === 'survive') {
    missions.timeLeft -= dt;
    done = missions.timeLeft <= 0;
  } else if (step.type === 'timed') {
    missions.timeLeft -= dt;
    if (missions.timeLeft <= 0) {
      missions.failedReason = 'Out of time — the deal is dead.';
      return 'failed';
    }
    if (step.target) {
      const d = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
      done = d < step.radius;
    } else if (step.targets) {
      const target = step.targets[step.collected || 0];
      const d = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
      if (d < step.radius) {
        step.collected = (step.collected || 0) + 1;
        G.audio.pickup();
        G.player.cash += 100;
        if (step.collected < step.targets.length) {
          missions.markerPos = step.targets[step.collected];
          updateMarker(missions);
        } else {
          done = true;
        }
      }
    }
  } else if (step.type === 'collect') {
    const target = step.targets[step.collected || 0];
    const d = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
    if (d < step.radius) {
      step.collected = (step.collected || 0) + 1;
      G.audio.cash();
      G.player.cash += 150;
      if (step.collected < step.targets.length) {
        missions.markerPos = step.targets[step.collected];
        updateMarker(missions);
      } else {
        done = true;
      }
    }
  } else if (step.type === 'steal') {
    done = !!G.player.inCar && G.player.inCar === missions.gtCar;
    if (done) {
      // The rival guards give chase once the GT is taken.
      for (const r of missions.rivals) {
        if (!r.dead) r.driver = 'rival';
      }
      G.police.wanted = Math.max(G.police.wanted, 3);
      G.audio.startSiren();
    }
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
    missions.rivals = [];
    missions.gtCar = null;
    missions.timeLeft = null;
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
  missions.rivals = [];
  missions.gtCar = null;
  missions.timeLeft = null;
  missions.failedReason = null;
}
