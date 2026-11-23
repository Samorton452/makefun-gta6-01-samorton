// Minimap v2: a 2D canvas in the HUD corner. Draws the street grid, the beach, the
// player arrow, police blips, the mission marker and north. North is up; the map
// covers the whole city, or — with N — a zoomed window around the player. v2 also
// shows pickups, the police helicopter, and district labels.
import { WORLD } from './config.js';

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const SIZE = canvas.width;
  const HALF = WORLD.halfSize;

  return {
    draw(G) {
      const w = SIZE;
      const zoomed = !!G.minimapZoom;
      // Zoomed view: a 240-unit window centred on the player; otherwise the whole city.
      const viewHalf = zoomed ? 120 : HALF;
      const px = G.player.inCar ? G.player.inCar.pos.x : G.player.pos.x;
      const pz = G.player.inCar ? G.player.inCar.pos.z : G.player.pos.z;
      const cx = zoomed ? px : 0;
      const cz = zoomed ? pz : 0;
      const toMap = (v, c) => ((v - c + viewHalf) / (viewHalf * 2)) * SIZE;
      const toMapX = (v) => toMap(v, cx);
      const toMapZ = (v) => toMap(v, cz);

      ctx.clearRect(0, 0, w, w);
      // Background: city blocks.
      ctx.fillStyle = '#20242a';
      ctx.fillRect(0, 0, w, w);
      ctx.fillStyle = '#3a3f46';
      for (let i = 0; i < G.city.streets.length - 1; i += 1) {
        for (let j = 0; j < G.city.streets.length - 1; j += 1) {
          const x0 = G.city.streets[i] + WORLD.roadWidth / 2;
          const z0 = G.city.streets[j] + WORLD.roadWidth / 2;
          ctx.fillRect(toMapX(x0), toMapZ(z0), toMapX(x0 + 64) - toMapX(x0), toMapZ(z0 + 64) - toMapZ(z0));
        }
      }
      // Beach + water (south edge).
      ctx.fillStyle = '#c9b078';
      ctx.fillRect(0, toMapZ(WORLD.beachZ), w, w - toMapZ(WORLD.beachZ));
      ctx.fillStyle = '#2e7fa8';
      ctx.fillRect(0, toMapZ(WORLD.waterZ), w, w - toMapZ(WORLD.waterZ));
      // Roads.
      ctx.strokeStyle = '#5a5f68';
      ctx.lineWidth = zoomed ? 6 : 4;
      for (const s of G.city.streets) {
        ctx.beginPath();
        ctx.moveTo(toMapX(s), 0);
        ctx.lineTo(toMapX(s), w);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, toMapZ(s));
        ctx.lineTo(w, toMapZ(s));
        ctx.stroke();
      }
      // District labels (whole-city view only, so the text stays readable).
      if (!zoomed) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText('DOWNTOWN', toMapX(-60), toMapZ(-300));
        ctx.fillText('OLD TOWN', toMapX(-300), toMapZ(0));
        ctx.fillText('MARINA ROW', toMapX(180), toMapZ(0));
        ctx.fillText('BEACH', toMapX(40), toMapZ(322));
        ctx.fillText('MARINA PIER', toMapX(-190), toMapZ(360));
      }
      // Pickups: health (green), armour (blue), weapon (orange), cash (gold).
      if (G.pickups) {
        for (const pk of G.pickups) {
          if (pk.taken) continue;
          const colors = { health: '#37d67a', armour: '#3a9bdc', weapon: '#ff8800', ammo: '#e8d44d', cash: '#ffd23c' };
          ctx.fillStyle = colors[pk.kind] || '#ffffff';
          ctx.beginPath();
          ctx.arc(toMapX(pk.x), toMapZ(pk.z), zoomed ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Hidden stashes (green diamonds) — only the ones still out there.
      if (G.collectibles) {
        ctx.fillStyle = '#37d67a';
        for (const s of G.collectibles.stashes) {
          if (s.found) continue;
          const mx = toMapX(s.x);
          const mz = toMapZ(s.z);
          ctx.beginPath();
          ctx.moveTo(mx, mz - 4);
          ctx.lineTo(mx + 4, mz);
          ctx.lineTo(mx, mz + 4);
          ctx.lineTo(mx - 4, mz);
          ctx.closePath();
          ctx.fill();
        }
      }
      // Mission marker (yellow diamond, pulsing).
      if (G.missions.markerPos) {
        const pulse = 6 + Math.sin(G.time * 5) * 2;
        ctx.fillStyle = '#ffd23c';
        ctx.beginPath();
        ctx.moveTo(toMapX(G.missions.markerPos.x), toMapZ(G.missions.markerPos.z) - pulse);
        ctx.lineTo(toMapX(G.missions.markerPos.x) + pulse, toMapZ(G.missions.markerPos.z));
        ctx.lineTo(toMapX(G.missions.markerPos.x), toMapZ(G.missions.markerPos.z) + pulse);
        ctx.lineTo(toMapX(G.missions.markerPos.x) - pulse, toMapZ(G.missions.markerPos.z));
        ctx.closePath();
        ctx.fill();
      }
      // Police blips (red/blue dots).
      for (const car of G.police.cars) {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(toMapX(car.pos.x), toMapZ(car.pos.z), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const cop of G.police.cops) {
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.arc(toMapX(cop.pos.x), toMapZ(cop.pos.z), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Police helicopter (yellow ring) when it is overhead.
      if (G.police.heliOverhead && G.police.heli) {
        ctx.strokeStyle = '#ffd23c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(toMapX(G.police.heli.pos.x), toMapZ(G.police.heli.pos.z), 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Rival car (missions 4 and 10) — orange.
      if (G.missions.rival && !G.missions.rival.dead) {
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(toMapX(G.missions.rival.pos.x), toMapZ(G.missions.rival.pos.z), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (G.missions.rivals) {
        for (const r of G.missions.rivals) {
          if (r.dead) continue;
          ctx.fillStyle = '#ff8800';
          ctx.beginPath();
          ctx.arc(toMapX(r.pos.x), toMapZ(r.pos.z), 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Player arrow (white, rotated to the facing yaw).
      const p = G.player.inCar ? G.player.inCar.pos : G.player.pos;
      const yaw = G.player.inCar ? G.player.inCar.yaw : G.player.yaw;
      ctx.save();
      ctx.translate(toMapX(p.x), toMapZ(p.z));
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
      // North tick + zoom hint.
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('N', 6, 13);
      if (zoomed) ctx.fillText('ZOOM', w - 44, 13);
    },
  };
}
