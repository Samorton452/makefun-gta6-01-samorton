// Keyboard and mouse input for Solmar Heat v2.
// Held keys are read every frame; one-shot presses (enter car, reload, pause, ...) are
// queued as bit flags and taken once by the loop, so a press between two frames is never
// lost. The mouse wheel cycles weapons, like Q.
import { KEYS } from './config.js';

export const ACTION_ENTER_CAR = 1;
export const ACTION_RELOAD = 2;
export const ACTION_WEAPON = 4;
export const ACTION_PAUSE = 8;
export const ACTION_JUMP = 16;
export const ACTION_RADIO = 32;
export const ACTION_MUTE = 64;
export const ACTION_WEATHER = 128;
export const ACTION_HORN = 256;
export const ACTION_CONFIRM = 512;
export const ACTION_SHOOT = 1024;
export const ACTION_MINIMAP_ZOOM = 2048;

const ONE_SHOT = new Map([
  [KEYS.enterCar, ACTION_ENTER_CAR],
  [KEYS.reload, ACTION_RELOAD],
  [KEYS.weapon, ACTION_WEAPON],
  [KEYS.pause, ACTION_PAUSE],
  [KEYS.jump, ACTION_JUMP],
  [KEYS.radio, ACTION_RADIO],
  [KEYS.mute, ACTION_MUTE],
  [KEYS.weather, ACTION_WEATHER],
  [KEYS.horn, ACTION_HORN],
  [KEYS.minimapZoom, ACTION_MINIMAP_ZOOM],
]);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseDX = 0;
  let mouseDY = 0;
  let mouseDown = false;
  let locked = false;

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') return; // browser owns pointer-lock exit
    if (ONE_SHOT.has(event.code)) {
      if (!event.repeat) actions |= ONE_SHOT.get(event.code);
    } else if (event.code === 'Enter') {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else {
      held.add(event.code);
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (event) => {
    if (!locked) return;
    mouseDX += event.movementX;
    mouseDY += event.movementY;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouseDown = true;
      actions |= ACTION_SHOOT;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseDown = false;
  });
  // Mouse wheel cycles the weapon, same as Q.
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    actions |= ACTION_WEAPON;
  }, { passive: false });

  return {
    isDown(code) {
      return held.has(code);
    },
    /** WASD / arrows as -1..1 axes: x = strafe right, z = forward. */
    axes() {
      const x = (held.has(KEYS.right) || held.has('ArrowRight') ? 1 : 0)
        - (held.has(KEYS.left) || held.has('ArrowLeft') ? 1 : 0);
      const z = (held.has(KEYS.forward) || held.has('ArrowUp') ? 1 : 0)
        - (held.has(KEYS.back) || held.has('ArrowDown') ? 1 : 0);
      return { x, z };
    },
    sprint() {
      return held.has(KEYS.sprint) || held.has('ShiftRight');
    },
    mouseDown() {
      return mouseDown;
    },
    /** Mouse movement since the last call, in pixels. */
    takeMouse() {
      const dx = mouseDX;
      const dy = mouseDY;
      mouseDX = 0;
      mouseDY = 0;
      return { dx, dy };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Ask the browser for pointer lock (must come from a user gesture). */
    requestLock() {
      if (!locked) canvas.requestPointerLock();
    },
    isLocked() {
      return locked;
    },
  };
}
