// Day/night cycle and weather for Solmar: a sun that arcs across the sky, a moon at night,
// streetlight glow after dark, and rain (visible streaks + a wet, darker look).
import * as THREE from 'three';

export function createWeather(scene) {
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.camera.far = 500;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.7);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0x8fa8ff, 0);
  moon.position.set(-60, 80, -40);
  scene.add(moon);

  // Rain: a Points cloud that falls around the camera and recycles.
  const rainCount = 1200;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i += 1) {
    rainPos[i * 3] = (Math.random() - 0.5) * 120;
    rainPos[i * 3 + 1] = Math.random() * 40;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaccee, size: 0.35, transparent: true, opacity: 0.55 }));
  rain.visible = false;
  scene.add(rain);

  const sky = new THREE.Color(0x87b5d9);
  return {
    sun, hemi, moon, rain, rainPos, rainCount, sky,
    timeOfDay: 10.5, // hours, 0-24; start late morning
    weather: 'clear', // clear | rain
    rainAmount: 0,
  };
}

function lerpColor(a, b, t, out) {
  out.setRGB(
    THREE.MathUtils.lerp(a.r, b.r, t),
    THREE.MathUtils.lerp(a.g, b.g, t),
    THREE.MathUtils.lerp(a.b, b.b, t),
  );
}

const DAY_SKY = new THREE.Color(0x87b5d9);
const DUSK_SKY = new THREE.Color(0xe8905a);
const NIGHT_SKY = new THREE.Color(0x0d1526);
const DAY_SUN = new THREE.Color(0xfff2d8);
const DUSK_SUN = new THREE.Color(0xff9a4d);
const NIGHT_FOG = new THREE.Color(0x0d1526);

export function stepWeather(w, dt, camera, city) {
  // A full day takes 12 minutes of play.
  w.timeOfDay = (w.timeOfDay + dt / 720) % 24;
  const t = w.timeOfDay;
  // Sun angle: sunrise 6h, sunset 19h.
  const dayFrac = THREE.MathUtils.clamp((t - 6) / 13, 0, 1);
  const sunAngle = Math.PI * dayFrac;
  const sunHeight = Math.sin(sunAngle);
  const isDay = sunHeight > 0.02;
  const dusk = THREE.MathUtils.clamp(1 - Math.abs(sunHeight) * 4, 0, 1) * (isDay ? 1 : 0);

  w.sun.position.set(Math.cos(sunAngle) * 160, Math.max(4, sunHeight * 160), 60);
  w.sun.target.position.set(0, 0, 0);
  w.sun.intensity = isDay ? 2.4 * Math.min(1, sunHeight * 3) : 0;
  w.sun.color.copy(DAY_SUN).lerp(DUSK_SUN, dusk);
  w.moon.intensity = isDay ? 0 : 0.5;
  w.hemi.intensity = isDay ? 0.7 : 0.25;

  // Sky + fog.
  const sky = w.sky;
  if (isDay) {
    lerpColor(DAY_SKY, DUSK_SKY, dusk, sky);
  } else {
    sky.copy(NIGHT_SKY);
  }
  if (w.weather === 'rain') sky.lerp(new THREE.Color(0x5a6a78), 0.45);
  const scene = w.sun.parent;
  scene.background = sky;
  scene.fog = scene.fog || new THREE.Fog(sky.getHex(), 120, 700);
  scene.fog.color.copy(sky);
  scene.fog.near = isDay ? 160 : 90;
  scene.fog.far = isDay ? 800 : 420;

  // Streetlights glow at night.
  const lampGlow = isDay ? 0.25 : 1.6;
  for (const lamp of city.lights) {
    lamp.material.emissiveIntensity = lampGlow;
  }

  // Rain falls around the camera.
  const targetRain = w.weather === 'rain' ? 1 : 0;
  w.rainAmount += (targetRain - w.rainAmount) * Math.min(1, dt * 1.5);
  w.rain.visible = w.rainAmount > 0.02;
  if (w.rain.visible) {
    w.rain.material.opacity = 0.55 * w.rainAmount;
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (let i = 0; i < w.rainCount; i += 1) {
      w.rainPos[i * 3 + 1] -= 55 * dt;
      if (w.rainPos[i * 3 + 1] < 0) {
        w.rainPos[i * 3 + 1] = 30 + Math.random() * 10;
        w.rainPos[i * 3] = cx + (Math.random() - 0.5) * 120;
        w.rainPos[i * 3 + 2] = cz + (Math.random() - 0.5) * 120;
      }
    }
    w.rain.geometry.attributes.position.needsUpdate = true;
    w.rain.position.set(0, 0, 0);
  }
  return { isDay, dusk };
}

export function clockString(timeOfDay) {
  const h = Math.floor(timeOfDay) % 24;
  const m = Math.floor((timeOfDay - Math.floor(timeOfDay)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
