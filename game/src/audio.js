// Synthesized sound for Solmar Heat v2: WebAudio only, no audio files.
// Engine hum (pitched per car type), sirens, gunshots, pickups, UI clicks, thunder
// and a procedural radio loop are all built from oscillators and filtered noise.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let engineType = 'sedan';
  let sirenOsc = null;
  let sirenGain = null;
  let radioTimer = null;
  let radioStep = 0;
  let station = 0;
  let skidCooldown = 0;

  // Three invented radio stations: a laid-back coastal groove, a faster night
  // drive beat, and a slow smooth-jazz talk station for cruising the beach.
  const STATIONS = [
    { name: 'SOLMAR FM 88.2 — Coast Groove', bpm: 96, bass: [0, 0, 7, 0, 5, 0, 3, 7], lead: [0, 3, 5, 7, 10, 7, 5, 3] },
    { name: 'NIGHT DRIVE 101.5', bpm: 128, bass: [0, 0, 0, 3, 0, 0, 5, 3], lead: [0, 0, 7, 10, 12, 10, 7, 5] },
    { name: 'SOLMAR TALK 94.7 — Smooth Jazz', bpm: 72, bass: [0, 5, 0, 3, 0, 7, 5, 0], lead: [0, 7, 10, 7, 5, 3, 0, 3] },
  ];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Call from a user gesture (menu click / first key) so the browser allows audio. */
  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, type = 'lowpass') {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  // Engine pitch follows the car type: the GT growls higher, the truck rumbles low.
  const ENGINE_BASE = { sedan: 55, taxi: 52, sports: 62, truck: 42, police: 58, muscle: 48, van: 40, gt: 70 };
  function setEngine(speed01, on, type) {
    if (!engineOsc || !engineGain) return;
    if (type) engineType = type;
    const base = ENGINE_BASE[engineType] || 55;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0, t, 0.08);
    engineOsc.frequency.setTargetAtTime(base + speed01 * 130, t, 0.06);
    engineFilter.frequency.setTargetAtTime(280 + speed01 * 900, t, 0.1);
  }

  function startSiren() {
    if (!ensure() || sirenOsc) return;
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'sine';
    sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0.045;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 0.8;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(sirenOsc.frequency);
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    lfo.start();
    sirenOsc._lfo = lfo;
  }

  function stopSiren() {
    if (!sirenOsc) return;
    try {
      sirenOsc._lfo.stop();
      sirenOsc.stop();
    } catch { /* already stopped */ }
    sirenOsc = null;
  }

  function radioTick() {
    if (!ctx || muted) return;
    const st = STATIONS[station];
    const stepDur = 60 / st.bpm / 2;
    const scale = [0, 2, 3, 5, 7, 8, 10]; // minor pentatonic-ish, A root
    const bassNote = st.bass[radioStep % st.bass.length];
    const leadNote = st.lead[radioStep % st.lead.length];
    tone(110 * Math.pow(2, bassNote / 12), stepDur * 1.8, 'triangle', 0.12);
    if (radioStep % 2 === 0) tone(220 * Math.pow(2, scale[leadNote % scale.length] / 12), stepDur * 0.9, 'square', 0.035);
    if (radioStep % 4 === 2) noise(0.05, 0.05, 6000, 'highpass'); // hat tick
    radioStep += 1;
  }

  function startRadio() {
    if (!ensure() || radioTimer) return;
    radioStep = 0;
    radioTimer = window.setInterval(radioTick, (60 / STATIONS[station].bpm / 2) * 1000);
  }

  function stopRadio() {
    if (radioTimer) window.clearInterval(radioTimer);
    radioTimer = null;
  }

  return {
    unlock,
    startEngine,
    setEngine,
    startSiren,
    stopSiren,
    startRadio,
    stopRadio,
    nextStation() {
      station = (station + 1) % STATIONS.length;
      if (radioTimer) {
        stopRadio();
        startRadio();
      }
      return STATIONS[station].name;
    },
    stationName() {
      return STATIONS[station].name;
    },
    stationIndex() {
      return station;
    },
    setStation(i) {
      station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
      if (radioTimer) {
        stopRadio();
        startRadio();
      }
      return STATIONS[station].name;
    },
    shoot() {
      noise(0.14, 0.5, 1800);
      tone(180, 0.1, 'square', 0.25, 60);
    },
    smgShoot() {
      noise(0.09, 0.32, 2200);
      tone(220, 0.06, 'square', 0.16, 90);
    },
    shotgun() {
      noise(0.3, 0.6, 900);
      tone(120, 0.18, 'square', 0.3, 40);
    },
    punch() {
      noise(0.08, 0.3, 500);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.2);
      window.setTimeout(() => tone(1318, 0.12, 'sine', 0.2), 70);
    },
    cash() {
      tone(1046, 0.08, 'sine', 0.18);
      window.setTimeout(() => tone(1568, 0.14, 'sine', 0.18), 80);
    },
    click() {
      tone(660, 0.05, 'square', 0.08);
    },
    fail() {
      tone(220, 0.35, 'sawtooth', 0.18, 110);
    },
    success() {
      [523, 659, 784].forEach((f, i) => window.setTimeout(() => tone(f, 0.16, 'triangle', 0.18), i * 90));
    },
    horn() {
      tone(370, 0.22, 'sawtooth', 0.12);
      tone(466, 0.22, 'sawtooth', 0.1);
    },
    crash() {
      noise(0.25, 0.4, 900);
    },
    skid() {
      // Throttled by the caller (a few per second at most).
      noise(0.16, 0.16, 3200, 'highpass');
    },
    thunder() {
      // A low rolling rumble, a beat after the lightning flash.
      noise(1.4, 0.35, 220);
      window.setTimeout(() => noise(0.9, 0.22, 160), 260);
    },
    busted() {
      [392, 330, 262].forEach((f, i) => window.setTimeout(() => tone(f, 0.22, 'sawtooth', 0.16), i * 160));
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
