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

// Shot-mode JPEG download: the only browser that can render this WebGL game is
// the managed cloud browser, and it cannot save a staged view as a file (its
// screenshots come back as images it cannot upload to GitHub). So when a ?shot=
// view finishes staging, the game itself downloads the frame as a JPG.
// stageShot runs only on ?shot= URLs (main.js calls it only inside `if (shot)`),
// so normal play never triggers a download and the game has no new UI.
const SHOT_FILES = { cover: '1-cover.jpg', chase: '2-chase.jpg', mission: '3-mission.jpg', menu: '4-menu.jpg' };
const MAX_JPEG_BYTES = 256 * 1024;
// A JPEG data URL is base64, so 256 KiB of JPEG is ~4/3 that in characters,
// plus the "data:image/jpeg;base64," prefix.
const MAX_DATA_URL_LEN = 23 + Math.ceil((MAX_JPEG_BYTES * 4) / 3);

function downloadShotFrame(name) {
  try {
    const src = document.getElementById('game');
    if (!src || !src.width || !src.height) return;
    // Fit inside 1280x720, keeping the short side at least 480 px.
    let scale = Math.min(1, 1280 / src.width, 720 / src.height);
    if (Math.min(src.width, src.height) * scale < 480) {
      const bumped = Math.min(480 / Math.min(src.width, src.height), 1);
      if (Math.max(src.width, src.height) * bumped <= 1280) scale = bumped;
    }
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(src, 0, 0, w, h);
    // Composite the minimap (a 2D canvas, already drawn for this frame) in the
    // bottom-right corner, where the HUD shows it.
    const mini = document.getElementById('minimap');
    if (mini && mini.width > 0 && mini.height > 0) {
      const ms = Math.round(Math.min(150, w * 0.14));
      ctx.drawImage(mini, w - ms - 12, h - ms - 12, ms, ms);
    }
    // JPEG quality ~0.85, stepped down until the file fits the 256 KiB cap.
    let quality = 0.85;
    let url = off.toDataURL('image/jpeg', quality);
    while (url.length > MAX_DATA_URL_LEN && quality > 0.3) {
      quality = Math.max(0.3, quality - 0.15);
      url = off.toDataURL('image/jpeg', quality);
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = SHOT_FILES[name] || `${name}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    // A failed download must never break the game or the ready signal.
    if (window.console) console.warn('[shots] download failed:', err);
  }
}

// Hook the ready flag: main.js sets window.__shotReady = true in the same JS
// task as the final renderer.render(), before the browser composites — so the
// WebGL drawing buffer is still valid when this setter runs, with no need for
// preserveDrawingBuffer (which would cost a buffer copy on every frame of
// normal play). The getter keeps the flag readable for the browser, which polls it.
function installShotDownload(name) {
  if (typeof window === 'undefined') return;
  let ready = false;
  let downloaded = false;
  try {
    Object.defineProperty(window, '__shotReady', {
      configurable: true,
      enumerable: true,
      get() { return ready; },
      set(value) {
        ready = !!value;
        if (ready && !downloaded) {
          downloaded = true;
          downloadShotFrame(name);
        }
      },
    });
  } catch (err) {
    if (window.console) console.warn('[shots] hook install failed:', err);
  }
}

export function stageShot(G, name) {
  installShotDownload(name);
  const P = G.player;
  // A parked muscle car downtown for the player to drive.
  const car = createCar(G.scene, 'muscle', 0, -80, Math.PI / 2, 0x1f6b3a);
  addHeadlights(G.scene, car);
  G.parkedCars.push(car);
  G.allCars.push(car);

  if (name === 'menu') {
    G.mode = 'menu';
    G.weather.timeOfDay = 17.5;
    // Frame the marina pier and lighthouse at dusk. The menu camera orbits the
    // city (radius 150, height 55, looking at the centre) and advances 0.125 rad
    // during the 150 staging steps, so set the orbit to end near 195 deg: the
    // camera then sits north-west of the centre looking south-east, and the pier
    // and lighthouse land in the clear right-hand margin beside the menu card,
    // with the sun out of frame. (Setting the camera here would be overwritten
    // by the orbit on the first step, so the orbit angle is the lever.)
    G.menuOrbit = 3.278;
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
    // The car drives NORTH up the x=0 street: the chase camera sits ahead of the
    // car and looks back at it, so with the car heading north the helicopter's
    // orbit falls in front of the car, inside the frame, instead of off to the
    // side (driving east put it 65+ deg off-axis, out of frame).
    G.weather.timeOfDay = 18.3; // dusk
    G.weather.weather = 'clear';
    car.pos.set(0, 0, -160);
    car.yaw = Math.PI;
    P.pos.set(0, 0, -160);
    P.camYaw = car.yaw + Math.PI;
    // The staged cruisers ram the player car hard during the 150 sim steps, and
    // the stock 100 health wrecks it before the shot. Make it invulnerable for
    // the staging so the frame shows the player driving an intact car.
    car.health = 100000;
    // Tilt the chase camera up a touch and fly the helicopter low: at its stock
    // height (42) it sits above the top of the frame.
    P.camPitch = -0.12;
    G.police.heli.height = 16;
    startMission(G.missions, 8, G); // Heat Wave: survive 90 s at 5 stars
    G.police.wanted = 5;
    // Cruisers chasing from behind, on the same street.
    const c1 = createCar(G.scene, 'police', -4, -130, Math.PI);
    addHeadlights(G.scene, c1);
    G.allCars.push(c1);
    G.police.cars.push(c1);
    const c2 = createCar(G.scene, 'police', 4, -128, Math.PI);
    addHeadlights(G.scene, c2);
    G.allCars.push(c2);
    G.police.cars.push(c2);
    car.speed = 18;
    G.shotSpeed = 18;
    addNearbyTraffic(G, 0, -160);
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
