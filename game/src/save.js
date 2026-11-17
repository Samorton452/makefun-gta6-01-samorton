// Save / load through localStorage: cash, completed missions, health, position and time of
// day. A save never blocks the game if storage is unavailable (private windows).
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
      cash: Math.round(G.player.cash),
      health: Math.round(G.player.health),
      armour: Math.round(G.player.armour),
      completed: G.missions.completed.slice(),
      x: Math.round(G.player.pos.x * 10) / 10,
      z: Math.round(G.player.pos.z * 10) / 10,
      timeOfDay: G.weather.timeOfDay,
      weapon: G.player.weapon,
      ammo: G.player.ammo,
      reserve: G.player.reserve,
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
  if (Array.isArray(data.completed)) G.missions.completed = data.completed.slice();
  if (typeof data.x === 'number' && typeof data.z === 'number') {
    G.player.pos.x = data.x;
    G.player.pos.z = data.z;
  }
  if (typeof data.timeOfDay === 'number') G.weather.timeOfDay = data.timeOfDay;
  if (data.weapon === 'fists' || data.weapon === 'pistol') G.player.weapon = data.weapon;
  if (typeof data.ammo === 'number') G.player.ammo = data.ammo;
  if (typeof data.reserve === 'number') G.player.reserve = data.reserve;
}
