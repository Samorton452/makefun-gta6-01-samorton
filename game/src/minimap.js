// Minimap: a 2D canvas in the HUD corner. Draws the street grid, the beach, the player arrow,
// police blips, the mission marker and north. North is up; the map covers the whole city.
import { WORLD } from './config.js';

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const SIZE = canvas.width;
  const HALF = WORLD.halfSize;
  const toMap = (v) => ((v + HALF) / (HALF * 2)) * SIZE;

  return {
    draw(G) {
      const w = SIZE;
      ctx.clearRect(0, 0, w, w);
      // Background: city blocks.
      ctx.fillStyle = '#20242a';
      ctx.fillRect(0, 0, w, w);
      ctx.fillStyle = '#3a3f46';
      for (let i = 0; i < G.city.streets.length - 1; i += 1) {
        for (let j = 0; j < G.city.streets.length - 1; j += 1) {
          const x0 = G.city.streets[i] + WORLD.roadWidth / 2;
          const z0 = G.city.streets[j] + WORLD.roadWidth / 2;
          ctx.fillRect(toMap(x0), toMap(z0), toMap(x0 + 64) - toMap(x0), toMap(z0 + 64) - toMap(z0));
        }
      }
      // Beach + water (south edge).
      ctx.fillStyle = '#c9b078';
      ctx.fillRect(0, toMap(WORLD.beachZ), w, w - toMap(WORLD.beachZ));
      ctx.fillStyle = '#2e7fa8';
      ctx.fillRect(0, toMap(WORLD.waterZ), w, w - toMap(WORLD.waterZ));
      // Roads.
      ctx.strokeStyle = '#5a5f68';
      ctx.lineWidth = 4;
      for (const s of G.city.streets) {
        ctx.beginPath();
        ctx.moveTo(toMap(s), 0);
        ctx.lineTo(toMap(s), w);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, toMap(s));
        ctx.lineTo(w, toMap(s));
        ctx.stroke();
      }
      // Mission marker (yellow diamond, pulsing).
      if (G.missions.markerPos) {
        const pulse = 6 + Math.sin(G.time * 5) * 2;
        ctx.fillStyle = '#ffd23c';
        ctx.beginPath();
        ctx.moveTo(toMap(G.missions.markerPos.x), toMap(G.missions.markerPos.z) - pulse);
        ctx.lineTo(toMap(G.missions.markerPos.x) + pulse, toMap(G.missions.markerPos.z));
        ctx.lineTo(toMap(G.missions.markerPos.x), toMap(G.missions.markerPos.z) + pulse);
        ctx.lineTo(toMap(G.missions.markerPos.x) - pulse, toMap(G.missions.markerPos.z));
        ctx.closePath();
        ctx.fill();
      }
      // Police blips (red/blue dots).
      for (const car of G.police.cars) {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(toMap(car.pos.x), toMap(car.pos.z), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const cop of G.police.cops) {
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.arc(toMap(cop.pos.x), toMap(cop.pos.z), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Rival car (mission 4) — orange.
      if (G.missions.rival && !G.missions.rival.dead) {
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(toMap(G.missions.rival.pos.x), toMap(G.missions.rival.pos.z), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Player arrow (white, rotated to the facing yaw).
      const p = G.player.inCar ? G.player.inCar.pos : G.player.pos;
      const yaw = G.player.inCar ? G.player.inCar.yaw : G.player.yaw;
      ctx.save();
      ctx.translate(toMap(p.x), toMap(p.z));
      ctx.rotate(yaw);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5.5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5.5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // North tick.
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('N', 6, 13);
    },
  };
}
