// A small seeded random number generator (mulberry32): the same seed gives the same
// game, which is what makes the screenshot scenes repeatable. v2 adds the small
// helpers the city and AI code reaches for instead of inlining Math.random.

export function createRandom(seed) {
  let a = seed | 0;
  const random = function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Convenience wrappers bound to this stream, so call sites stay readable.
  random.range = (min, max) => min + random() * (max - min);
  random.int = (min, max) => min + Math.floor(random() * (max - min + 1));
  random.pick = (arr) => arr[Math.floor(random() * arr.length)];
  random.chance = (p) => random() < p;
  random.sign = () => (random() < 0.5 ? -1 : 1);
  return random;
}

/** Fisher-Yates shuffle of a copy, using the given seeded stream. */
export function shuffle(random, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Clamp helper (mirrors THREE.MathUtils.clamp for non-3D code). */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Shortest signed angle difference, wrapped to (-PI, PI]. */
export function angleDiff(target, current) {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
