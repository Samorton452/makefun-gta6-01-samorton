// Solmar Heat v2 — shared constants for the open-world crime game.
// Original city "Solmar", a sun-soaked coastal city invented for this entry.
// All names, characters and places are original.
export const STEP = 1 / 60;

export const WORLD = {
  // City grid: streets every 80 units, roads 16 wide, blocks 64 wide.
  streetSpacing: 80,
  streetCount: 9, // streets at -320 .. 320
  roadWidth: 16,
  halfSize: 360, // ground plane covers -360..360
  beachZ: 300, // sand starts here (south edge)
  waterZ: 340, // water starts here
  pierZ: 340, // the marina pier starts at the waterline
  pierEndZ: 428, // lighthouse platform at the end of the pier
  pierX: -160, // pier runs down the west side of the marina
};

// Key bindings (also shown on the menu / controls screen).
export const KEYS = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  sprint: 'ShiftLeft',
  enterCar: 'KeyE',
  reload: 'KeyR',
  weapon: 'KeyQ',
  pause: 'KeyP',
  radio: 'KeyC',
  mute: 'KeyM',
  weather: 'KeyV',
  horn: 'KeyH',
  minimapZoom: 'KeyN',
};

// Weather states the V key cycles through, in order.
export const WEATHER_ORDER = ['clear', 'rain', 'fog', 'storm'];
export const WEATHER_LABELS = {
  clear: 'Clear',
  rain: 'Rain',
  fog: 'Fog',
  storm: 'Storm',
};

export const PLAYER = {
  walkSpeed: 5,
  runSpeed: 8.5,
  sprintSpeed: 12,
  jumpSpeed: 8.5,
  radius: 0.55,
  height: 1.8,
  maxHealth: 100,
  maxArmour: 100,
  maxStamina: 100,
  staminaDrain: 24, // per second while sprinting
  staminaRegen: 15, // per second while not sprinting
  staminaExhaustedAt: 0, // can't sprint again until stamina passes this
  staminaRecoverAt: 30,
};

export const CAR = {
  // Arcade driving numbers, per car type.
  sedan: { accel: 16, topSpeed: 34, brake: 30, steer: 1.9, grip: 6, engineBase: 55 },
  taxi: { accel: 14, topSpeed: 30, brake: 28, steer: 1.8, grip: 6, engineBase: 50 },
  sports: { accel: 24, topSpeed: 48, brake: 34, steer: 2.4, grip: 8, engineBase: 62 },
  truck: { accel: 10, topSpeed: 24, brake: 22, steer: 1.4, grip: 5, engineBase: 42 },
  police: { accel: 22, topSpeed: 42, brake: 32, steer: 2.2, grip: 7.5, engineBase: 58 },
  muscle: { accel: 21, topSpeed: 40, brake: 28, steer: 1.9, grip: 5.5, engineBase: 48 },
  van: { accel: 9, topSpeed: 22, brake: 20, steer: 1.3, grip: 5, engineBase: 40 },
  gt: { accel: 28, topSpeed: 54, brake: 36, steer: 2.6, grip: 9, engineBase: 70 },
};

// Every car can take this much damage before it is wrecked.
export const CAR_HEALTH = 100;

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, range: 2.2, rate: 0.45, auto: false, ammo: Infinity },
  pistol: { name: 'Pistol', damage: 34, range: 60, rate: 0.28, auto: false, ammo: 12, reserve: 60 },
  smg: { name: 'SMG', damage: 16, range: 55, rate: 0.09, auto: true, ammo: 24, reserve: 120 },
  shotgun: { name: 'Shotgun', damage: 20, range: 24, rate: 0.85, auto: false, ammo: 6, reserve: 30, pellets: 6, spread: 0.085 },
};

// The order Q (and the mouse wheel) cycles weapons through.
export const WEAPON_ORDER = ['fists', 'pistol', 'smg', 'shotgun'];

export const WANTED = {
  max: 5,
  // Wanted gained by each crime.
  stealCar: 1,
  hitPed: 1,
  shoot: 1,
  killCop: 2,
  // Seconds hidden (no police in sight) before one star fades.
  decaySeconds: 22,
  // Wanted level at which the police set up roadblocks / send the helicopter.
  roadblockAt: 3,
  heliAt: 4,
};

// One reward per mission, in story order (10 missions in v2).
export const MISSION_REWARDS = [400, 600, 900, 1200, 2500, 800, 1500, 2000, 3000, 5000];

export const SAVE_KEY = 'solmar-heat-save-v2';

// Colour palette for the city (sun-soaked, pastel + concrete).
export const PALETTE = {
  building: [0xd8cfc0, 0xc9b8a3, 0xb7c4cc, 0xe0a899, 0x9fb4a6, 0xd9c58a, 0xa8b0c0, 0xcfa3a3],
  roof: [0x8a7f74, 0x6f6a66, 0x9c8f80],
  road: 0x2e2f33,
  sidewalk: 0x9a958c,
  grass: 0x7fae62,
  sand: 0xe3cf9e,
  water: 0x2e7fa8,
  pierWood: 0x8a6b45,
  lighthouse: 0xf2ede2,
  lighthouseStripe: 0xc23b2e,
  billboard: [0x2e6fc2, 0xc22e2e, 0x1f8a4c, 0x7a4a9e],
};

export const CITY_NAME = 'Solmar';
export const GAME_TITLE = 'SOLMAR HEAT';
