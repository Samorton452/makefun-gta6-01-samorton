// HUD: the DOM overlay — health/armour bars, cash, wanted stars, weapon + ammo, speedometer,
// clock, objective text, damage flash, and the message toasts. Menus live in index.html;
// this module only updates the live values and shows/hides panels.
import { clockString } from './weather.js';
import { WEAPONS } from './config.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'),
    healthFill: $('health-fill'),
    armourFill: $('armour-fill'),
    cash: $('cash'),
    stars: $('stars'),
    weapon: $('weapon'),
    ammo: $('ammo'),
    speed: $('speedo'),
    speedValue: $('speed-value'),
    clock: $('clock'),
    weather: $('weather-label'),
    objective: $('objective'),
    objectiveTitle: $('objective-title'),
    objectiveText: $('objective-text'),
    toast: $('toast'),
    damage: $('damage-flash'),
    crosshair: $('crosshair'),
    radio: $('radio-label'),
    menu: $('menu'),
    pauseMenu: $('pause-menu'),
    missionList: $('mission-list'),
    missionListPause: $('mission-list-pause'),
    endScreen: $('end-screen'),
    endTitle: $('end-title'),
    endText: $('end-text'),
    busted: $('busted'),
    wasted: $('wasted'),
  };
  let toastTimer = null;
  return {
    els,
    showToast(message, ms = 2600) {
      els.toast.textContent = message;
      els.toast.classList.add('show');
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), ms);
    },
    flashDamage() {
      els.damage.classList.remove('hit');
      void els.damage.offsetWidth; // restart the animation
      els.damage.classList.add('hit');
    },
    /** Refresh every live value from the game state. Called once a frame. */
    update(G) {
      const p = G.player;
      els.healthFill.style.width = `${Math.max(0, p.health)}%`;
      els.armourFill.style.width = `${Math.max(0, p.armour)}%`;
      els.cash.textContent = `$${Math.floor(p.cash).toLocaleString('en-US')}`;
      let stars = '';
      for (let i = 0; i < 5; i += 1) stars += i < G.police.wanted ? '★' : '☆';
      els.stars.textContent = stars;
      els.stars.classList.toggle('hot', G.police.wanted > 0);
      const w = WEAPONS[p.weapon];
      els.weapon.textContent = w.name;
      els.ammo.textContent = p.weapon === 'fists' ? '—' : `${p.ammo} / ${p.reserve}`;
      const inCar = p.inCar;
      els.speed.style.display = inCar ? 'block' : 'none';
      if (inCar) els.speedValue.textContent = String(Math.round(Math.abs(inCar.speed) * 3.6));
      els.clock.textContent = clockString(G.weather.timeOfDay);
      els.weather.textContent = G.weather.weather === 'rain' ? 'Rain' : 'Clear';
      els.radio.textContent = G.audio.isMuted() ? 'MUTED (M)' : G.audio.stationName();
      // Objective panel.
      const obj = G.missions.activeIndex >= 0
        ? (() => {
          const m = G.missions.list[G.missions.activeIndex];
          const step = m.steps[G.missions.stepIndex];
          return { title: `${m.title} — ${G.missions.stepIndex + 1}/${m.steps.length}`, text: step.text };
        })()
        : null;
      if (obj) {
        els.objective.style.display = 'block';
        els.objectiveTitle.textContent = obj.title;
        els.objectiveText.textContent = obj.text;
      } else if (G.missions.completed.length > 0) {
        els.objective.style.display = 'block';
        els.objectiveTitle.textContent = 'Free roam';
        els.objectiveText.textContent = 'Press P for missions, E to steal a car, Q to swap weapon.';
      } else {
        els.objective.style.display = 'block';
        els.objectiveTitle.textContent = 'Welcome to Solmar';
        els.objectiveText.textContent = 'Press P, pick a mission, and get to work. E steals a car.';
      }
      // Crosshair only when on foot with the pistol out.
      els.crosshair.style.display = !inCar && p.weapon === 'pistol' ? 'block' : 'none';
    },
    showPanel(name) {
      els.menu.style.display = name === 'menu' ? 'flex' : 'none';
      els.pauseMenu.style.display = name === 'pause' ? 'flex' : 'none';
      els.endScreen.style.display = name === 'end' ? 'flex' : 'none';
      els.hud.style.display = name === 'play' ? 'block' : 'none';
      els.busted.style.display = name === 'busted' ? 'flex' : 'none';
      els.wasted.style.display = name === 'wasted' ? 'flex' : 'none';
    },
    showEnd(title, text) {
      els.endTitle.textContent = title;
      els.endText.textContent = text;
      this.showPanel('end');
    },
    /** Build the mission list on the menu / pause screen. */
    renderMissionList(missions, onStart) {
      const build = (root) => {
        if (!root) return;
        root.innerHTML = '';
        missions.list.forEach((m, i) => {
          const done = missions.completed.includes(m.id);
          const btn = document.createElement('button');
          btn.className = 'mission-btn';
          btn.textContent = `${done ? '✓ ' : ''}${i + 1}. ${m.title} — ${m.giver} ($${[400, 600, 900, 1200, 2500][i]})`;
          btn.addEventListener('click', () => onStart(i));
          root.appendChild(btn);
        });
      };
      build(els.missionList);
      build(els.missionListPause);
    },
  };
}
