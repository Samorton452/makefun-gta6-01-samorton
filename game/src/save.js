// Save / load through localStorage v2: cash, completed missions, health, armour,
// stamina, owned weapons and their ammo, position, time of day, weather and radio
// station. A save never blocks the game if storage is unavailable (private windows).
// v2 uses a new key, so v1 saves do not carry over (the weapon inventory changed).
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(G) {
  try {
    const data = {
      version: 2,
      cash: Math.round(G.player.cash),
      health: Math.round(G.player.health),
      armour: Math.round(G.player.armour),
      stamina: Math.round(G.player.stamina),
      completed: G.missions.completed.slice(),
      weapons: G.player.weapons.slice(),
      ammoMap: JSON.parse(JSON.stringify(G.player.ammoMap)),
      weapon: G.player.weapon,
      x: Math.round(G.player.pos.x * 10) / 10,
      z: Math.round(G.player.pos.z * 10) / 10,
      timeOfDay: G.weather.timeOfDay,
      weather: G.weather.weather,
      station: G.audio.stationIndex(),
      minimapZoom: !!G.minimapZoom,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function applySave(G, data) {
  if (!data) return;
  if (typeof data.cash === 'number') G.player.cash = data.cash;
  if (typeof data.health === 'number') G.player.health = data.health;
  if (typeof data.armour === 'number') G.player.armour = data.armour;
  if (typeof data.stamina === 'number') G.player.stamina = data.stamina;
  if (Array.isArray(data.completed)) G.missions.completed = data.completed.slice();
  if (Array.isArray(data.weapons) && data.weapons.length > 0) {
    G.player.weapons = data.weapons.filter((w) => ['fists', 'pistol', 'smg', 'shotgun'].includes(w));
    if (!G.player.weapons.includes('fists')) G.player.weapons.unshift('fists');
  }
  if (data.ammoMap && typeof data.ammoMap === 'object') {
    for (const key of ['pistol', 'smg', 'shotgun']) {
      const a = data.ammoMap[key];
      if (a && typeof a.mag === 'number' && typeof a.reserve === 'number') {
        G.player.ammoMap[key] = { mag: a.mag, reserve: a.reserve };
      }
    }
  }
  if (typeof data.weapon === 'string' && G.player.weapons.includes(data.weapon)) {
    G.player.weapon = data.weapon;
  }
  if (typeof data.x === 'number' && typeof data.z === 'number') {
    G.player.pos.x = data.x;
    G.player.pos.z = data.z;
  }
  if (typeof data.timeOfDay === 'number') G.weather.timeOfDay = data.timeOfDay;
  if (typeof data.weather === 'string' && ['clear', 'rain', 'fog', 'storm'].includes(data.weather)) {
    G.weather.weather = data.weather;
  }
  if (typeof data.station === 'number') G.audio.setStation(data.station);
  if (typeof data.minimapZoom === 'boolean') G.minimapZoom = data.minimapZoom;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
