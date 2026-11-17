// Screenshot staging: ?shot=cover|chase|mission|menu sets up a lively scene before the
// first frame, then the main loop runs it forward a fixed number of steps so the screenshot
// shows the real game (HUD, minimap, cars, police, mission marker) and repeats every time.
import { createCar, addHeadlights } from './vehicles.js';
import { startMission } from './missions.js';
import { addWanted } from './police.js';

// A few traffic cars near the player so the streets read as alive in the shot.
function addNearbyTraffic(G, x, z) {
  const spots = [
    { type: 'taxi', dx: 26, dz: 18, yaw: Math.PI / 2 },
    { type: 'sedan', dx: -34, dz: -12, yaw: -Math.PI / 2 },
    { type: 'truck', dx: 48, dz: -30, yaw: Math.PI / 2 },
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
  // A parked sports car downtown for the player to drive.
  const car = createCar(G.scene, 'sports', 0, -80, Math.PI / 2, 0xc22e2e);
  addHeadlights(G.scene, car);
  G.parkedCars.push(car);
  G.allCars.push(car);

  if (name === 'menu') {
    G.mode = 'menu';
    G.weather.timeOfDay = 17.5;
    G.camera.position.set(60, 42, 120);
    G.camera.lookAt(0, 8, 0);
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
    G.weather.timeOfDay = 18.3; // dusk
    G.weather.weather = 'clear';
    addWanted(G.police, 4, G.audio);
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
    startMission(G.missions, 4, G); // The Big One: escape in progress
    G.police.wanted = 4;
  } else if (name === 'mission') {
    G.weather.timeOfDay = 11.0;
    startMission(G.missions, 2, G); // Hot Package: drive to the dock
    addWanted(G.police, 2, G.audio);
    // Stage on the x=-160 street, driving south toward the dock at (-240, 280).
    car.pos.set(-160, 0, 120);
    car.yaw = 0;
    P.pos.set(-160, 0, 120);
    P.camYaw = Math.PI;
    car.speed = 18;
    G.shotSpeed = 18;
    addNearbyTraffic(G, -160, 120);
  } else {
    // cover: downtown, wanted 2, mission 1 active, a police car closing in.
    G.weather.timeOfDay = 15.5;
    startMission(G.missions, 0, G);
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
