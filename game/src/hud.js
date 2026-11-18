// HUD v2: the DOM overlay — health/armour/stamina bars, cash, wanted stars, weapon +
// ammo, owned-weapon chips, speedometer, clock, weather, district, objective text with
// distance, mission timer, damage flash, and the message toasts. Menus live in
// index.html; this module only updates the live values and shows/hides panels.
import { clockString } from './weather.js';
import { WEAPONS, MISSION_REWARDS, WEATHER_LABELS } from './config.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'),
    healthFill: $('health-fill'),
    armourFill: $('armour-fill'),
    staminaFill: $('stamina-fill'),
    cash: $('cash'),
    stars: $('stars'),
    weapon: $('weapon'),
    ammo: $('ammo'),
    weaponChips: $('weapon-chips'),
    speed: $('speedo'),
    speedValue: $('speed-value'),
    clock: $('clock'),
    weather: $('weather-label'),
    district: $('district-label'),
    objective: $('objective'),
    objectiveTitle: $('objective-title'),
    objectiveText: $('objective-text'),
    objectiveDist: $('objective-dist'),
    missionTimer: $('mission-timer'),
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
      els.staminaFill.style.width = `${Math.max(0, p.stamina)}%`;
      els.staminaFill.classList.toggle('low', p.exhausted);
      els.cash.textContent = `$${Math.floor(p.cash).toLocaleString('en-US')}`;
      let stars = '';
      for (let i = 0; i < 5; i += 1) stars += i < G.police.wanted ? '★' : '☆';
      els.stars.textContent = stars;
      els.stars.classList.toggle('hot', G.police.wanted > 0);
      const w = WEAPONS[p.weapon];
      els.weapon.textContent = w.name;
      if (p.weapon === 'fists') {
        els.ammo.textContent = '—';
      } else {
        const a = p.ammoMap[p.weapon];
        els.ammo.textContent = a ? `${a.mag} / ${a.reserve}` : '0 / 0';
      }
      // Owned-weapon chips: one per weapon the player has, current highlighted.
      if (els.weaponChips) {
        const chips = p.weapons.map((key) => {
          const name = WEAPONS[key].name;
          return key === p.weapon ? `[${name}]` : name;
        }).join('  ·  ');
        if (els.weaponChips.textContent !== chips) els.weaponChips.textContent = chips;
      }
      const inCar = p.inCar;
      els.speed.style.display = inCar ? 'block' : 'none';
      if (inCar) els.speedValue.textContent = String(Math.round(Math.abs(inCar.speed) * 3.6));
      els.clock.textContent = clockString(G.weather.timeOfDay);
      els.weather.textContent = WEATHER_LABELS[G.weather.weather] || 'Clear';
      if (els.district) {
        const d = G.city.districtAt(p.pos.x, p.pos.z);
        if (els.district.textContent !== d) els.district.textContent = d;
      }
      els.radio.textContent = G.audio.isMuted() ? 'MUTED (M)' : G.audio.stationName();
      // Objective panel: title, step text, distance to the target, and the
      // mission timer when the current step is timed.
      const obj = G.missions.activeIndex >= 0
        ? (() => {
          const m = G.missions.list[G.missions.activeIndex];
          const step = m.steps[G.missions.stepIndex];
          return { mission: m, step, stepIndex: G.missions.stepIndex, total: m.steps.length };
        })()
        : null;
      if (obj) {
        els.objective.style.display = 'block';
        els.objectiveTitle.textContent = `${obj.mission.title} — ${obj.stepIndex + 1}/${obj.total}`;
        els.objectiveText.textContent = obj.step.text;
        // Distance to the current target, when the step has one.
        const target = obj.step.target || (obj.step.targets && obj.step.targets[obj.step.collected || 0]);
        if (target) {
          const px = inCar ? inCar.pos.x : p.pos.x;
          const pz = inCar ? inCar.pos.z : p.pos.z;
          const dist = Math.hypot(target.x - px, target.z - pz);
          els.objectiveDist.textContent = `${Math.round(dist)} m`;
          els.objectiveDist.style.display = 'block';
        } else {
          els.objectiveDist.style.display = 'none';
        }
        if (G.missions.timeLeft != null && G.missions.timeLeft > 0) {
          els.missionTimer.textContent = `⏱ ${Math.ceil(G.missions.timeLeft)}s`;
          els.missionTimer.style.display = 'block';
          els.missionTimer.classList.toggle('urgent', G.missions.timeLeft < 15);
        } else {
          els.missionTimer.style.display = 'none';
        }
      } else if (G.missions.completed.length > 0) {
        els.objective.style.display = 'block';
        els.objectiveTitle.textContent = 'Free roam';
        els.objectiveText.textContent = 'Press P for missions, E to steal a car, Q to swap weapon.';
        els.objectiveDist.style.display = 'none';
        els.missionTimer.style.display = 'none';
      } else {
        els.objective.style.display = 'block';
        els.objectiveTitle.textContent = 'Welcome to Solmar';
        els.objectiveText.textContent = 'Press P, pick a mission, and get to work. E steals a car.';
        els.objectiveDist.style.display = 'none';
        els.missionTimer.style.display = 'none';
      }
      // Crosshair only when on foot with a gun out.
      els.crosshair.style.display = !inCar && p.weapon !== 'fists' ? 'block' : 'none';
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
          btn.textContent = `${done ? '✓ ' : ''}${i + 1}. ${m.title} — ${m.giver} ($${MISSION_REWARDS[i]})`;
          btn.addEventListener('click', () => onStart(i));
          root.appendChild(btn);
        });
      };
      build(els.missionList);
      build(els.missionListPause);
    },
  };
}
