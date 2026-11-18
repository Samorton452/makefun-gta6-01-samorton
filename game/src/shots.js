// Screenshot staging v2: ?shot=cover|chase|mission|menu sets up a lively scene before
// the first frame, then the main loop runs it forward a fixed number of steps so the
// screenshot shows the real game (HUD, minimap, cars, police, helicopter, mission
// marker) and repeats every time.
import { createCar, addHeadlights } from './vehicles.js';
import { startMission } from './missions.js';
import { addWanted } from './police.js';

// A few traffic cars near the player so the streets read as alive in the shot.
function addNearbyTraffic(G, x, z) {
  const spots = [
    { type: 'taxi', dx: 26, dz: 18, yaw: Math.PI / 2 },
    { type: 'muscle', dx: -34, dz: -12, yaw: -Math.PI / 2 },
    { type: 'van', dx: 48, dz: -30, yaw: Math.PI / 2 },
  ];
  for (const s of spots) {
    const car = createCar(G.scene, s.type, x + s.dx, G.city.nearestStreet(z + s.dz), s.yaw);
    car.driver = 'traffic';
    car.cruise = 9;
    car.route = { horizontal: true, street: G.city.nearestStreet(z + s.dz), dir: 1 };
    car.turnCooldown = 5;
    G.traffic.push(car);
    G.allCars.push(car);
  }
}

export function stageShot(G, name) {
  const P = G.player;
  // A parked muscle car downtown for the player to drive.
  const car = createCar(G.scene, 'muscle', 0, -80, Math.PI / 2, 0x1f6b3a);
  addHeadlights(G.scene, car);
  G.parkedCars.push(car);
  G.allCars.push(car);

  if (name === 'menu') {
    G.mode = 'menu';
    G.weather.timeOfDay = 17.5;
    // Frame the marina pier and lighthouse at dusk.
    G.camera.position.set(-100, 42, 220);
    G.camera.lookAt(-160, 10, 400);
    return;
  }

  // All play shots: player is driving, HUD on, camera chasing.
  G.mode = 'playing';
  G.player.inCar = car;
  car.driver = 'player';
  P.pos.set(car.pos.x, 0, car.pos.z);
  P.model.visible = false;
  P.camYaw = car.yaw + Math.PI;
  G.audio.unlock();

  if (name === 'chase') {
    // Heat Wave: five stars at dusk, the helicopter overhead, cruisers closing in.
    G.weather.timeOfDay = 18.3; // dusk
    G.weather.weather = 'clear';
    startMission(G.missions, 8, G); // Heat Wave: survive 90 s at 5 stars
    G.police.wanted = 5;
    const c1 = createCar(G.scene, 'police', -30, -80, Math.PI / 2);
    addHeadlights(G.scene, c1);
    G.allCars.push(c1);
    G.police.cars.push(c1);
    const c2 = createCar(G.scene, 'police', 24, -104, Math.PI / 2);
    addHeadlights(G.scene, c2);
    G.allCars.push(c2);
    G.police.cars.push(c2);
    car.speed = 26;
    G.shotSpeed = 26;
    addNearbyTraffic(G, 0, -80);
  } else if (name === 'mission') {
    // Deadline: checkpoint race in the morning sun, wanted 2.
    G.weather.timeOfDay = 11.0;
    startMission(G.missions, 7, G); // Deadline: 4 checkpoints, 75 s
    addWanted(G.police, 2, G.audio);
    // Stage on the x=-160 street, driving south toward the first checkpoint.
    car.pos.set(-160, 0, 120);
    car.yaw = 0;
    P.pos.set(-160, 0, 120);
    P.camYaw = Math.PI;
    car.speed = 18;
    G.shotSpeed = 18;
    addNearbyTraffic(G, -160, 120);
  } else {
    // cover: downtown, wanted 2, mission 6 active, a police car closing in.
    G.weather.timeOfDay = 15.5;
    startMission(G.missions, 5, G); // Shake Down: collect on Marina Row
    addWanted(G.police, 2, G.audio);
    const c1 = createCar(G.scene, 'police', -40, -80, Math.PI / 2);
    addHeadlights(G.scene, c1);
    G.allCars.push(c1);
    G.police.cars.push(c1);
    car.speed = 22;
    G.shotSpeed = 22;
    addNearbyTraffic(G, 0, -80);
  }
}
