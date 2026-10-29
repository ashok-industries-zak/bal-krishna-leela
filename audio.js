'use strict';
// Procedural audio: bansuri-style flute melodies, tabla theka, tanpura drone, and SFX.
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf, timer = null, theme = null, nextT = 0, step = 0;
  let enabled = true;
  const SA = 293.66; // D4 as Sa
  const RATIO = { S:1, r:16/15, R:9/8, g:6/5, G:5/4, M:4/3, P:3/2, d:8/5, D:5/3, n:9/5, N:15/8 };

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = enabled ? 0.7 : 0; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function setEnabled(v) { enabled = v; if (master) master.gain.value = v ? 0.7 : 0; }

  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(f, dur, o = {}) {
    if (!ctx) return;
    const t = o.t ?? ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    env(g, t, o.a || 0.005, o.vol ?? 0.3, dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o = {}) {
    if (!ctx) return;
    const t = o.t ?? ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.ftype || 'bandpass'; f.frequency.value = o.freq || 2000; f.Q.value = o.q || 1;
    const g = ctx.createGain(); env(g, t, 0.002, o.vol ?? 0.2, dur);
    s.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function flute(f, dur, t, vol = 0.2) {
    const o = ctx.createOscillator(); o.type = 'sine';
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.07;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.3;
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.3, dur));
    lfo.connect(lg); lg.connect(o.frequency);
    o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05); // meend-like glide
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + Math.max(0.06, dur - 0.07));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus);
    [o, o2, lfo].forEach(n => { n.start(t); n.stop(t + dur + 0.05); });
    noise(Math.min(dur, 0.12), { t, vol: 0.03, freq: f * 3, q: 2, bus: musicBus }); // breath
  }
  function tabla(bol, t) {
    if (bol === '-') return;
    if (bol === 'Dha' || bol === 'Ge' || bol === 'Dhi') tone(105, 0.35, { t, slide: 68, vol: 0.45, bus: musicBus });
    if (bol === 'Dha' || bol === 'Na' || bol === 'Ti' || bol === 'Dhi' || bol === 'Ta') {
      tone(bol === 'Ti' ? 900 : 680, 0.16, { t, vol: 0.14, bus: musicBus });
      noise(0.03, { t, vol: 0.1, freq: 3200, q: 2, bus: musicBus });
    }
    if (bol === 'Ka') noise(0.05, { t, vol: 0.14, freq: 700, q: 1, bus: musicBus });
  }
  function noteFreq(n, scale) {
    let oct = 0;
    while (n.startsWith('.')) { oct--; n = n.slice(1); }
    while (n.endsWith("'")) { oct++; n = n.slice(0, -1); }
    return SA * RATIO[n] * Math.pow(2, oct);
  }
  function parse(str) {
    // "S1 R1 G2 -2" -> events in eighth notes
    const ev = []; let pos = 0;
    str.trim().split(/\s+/).forEach(tok => {
      const m = tok.match(/^([.]*[A-Za-z-]'*)(\d+)$/);
      if (!m) return;
      const len = +m[2];
      if (m[1] !== '-') ev.push({ pos, note: m[1], len });
      pos += len;
    });
    return { ev, len: pos };
  }
  const THEMES = {
    title: { bpm: 80, taal: ['Dha','-','Ge','Na','Ti','Na','Ka','Dhi'], vol: 0.17,
      mel: parse("G2 R1 S1 R2 G2 P2 G1 R1 S4 .D2 S1 R1 G2 P2 D2 P1 G1 R4 G2 P1 D1 S'4 D2 P1 G1 R2 S2 .D2 S2 R2 G2 R4 S4") },
    level: { bpm: 104, taal: ['Dha','Ge','Na','Ti','Na','Ka','Dhi','Na'], vol: 0.16,
      mel: parse("S1 R1 G1 P1 D2 P2 G1 P1 D1 S'1 D2 P2 G1 R1 S1 R1 G2 P2 R4 -4 P1 D1 S'1 R'1 S'2 D2 P1 G1 R1 G1 P4 D1 P1 G1 R1 S2 .D2 S4 -4") },
    storm: { bpm: 112, taal: ['Dha','Ge','Na','Ti','Na','Ka','Dhi','Na'], vol: 0.15,
      mel: parse("S1 g1 M1 P1 n2 P2 M1 g1 R1 g1 S4 P1 n1 S'1 n1 P2 M2 g1 M1 P1 M1 g1 R1 S2 .n1 S1 g1 M1 P2 -2 n1 P1 M1 g1 R2 S2 S4 -4") },
    boss: { bpm: 138, taal: ['Dha','Dha','Ti','Na','Dha','Ka','Dhi','Na'], vol: 0.15,
      mel: parse("S1 r1 G1 M1 P2 d2 P1 M1 G1 r1 S2 -2 d1 N1 S'1 N1 d2 P2 M1 G1 r1 G1 M2 -2 P1 d1 N1 S'1 r'2 S'2 N1 d1 P1 M1 G2 r2 S1 r1 G1 r1 S2 .N2 S4 -4") }
  };
  function sched() {
    if (!ctx || !theme) return;
    const eighth = 60 / theme.bpm / 2;
    while (nextT < ctx.currentTime + 0.15) {
      const s = step % theme.mel.len;
      for (const e of theme.mel.ev) if (e.pos === s) flute(noteFreq(e.note), e.len * eighth * 0.96, nextT, theme.vol);
      tabla(theme.taal[step % 8], nextT);
      if (step % 16 === 0) tone(SA * 0.75, 3, { t: nextT, type: 'triangle', vol: 0.05, bus: musicBus, a: 0.03 });
      if (step % 16 === 4 || step % 16 === 8) tone(SA, 2.5, { t: nextT, type: 'triangle', vol: 0.04, bus: musicBus, a: 0.03 });
      if (step % 16 === 12) tone(SA / 2, 3, { t: nextT, type: 'triangle', vol: 0.05, bus: musicBus, a: 0.03 });
      nextT += eighth; step++;
    }
  }
  function startMusic(name) {
    if (!ctx) return;
    stopMusic();
    theme = THEMES[name]; step = 0; nextT = ctx.currentTime + 0.08;
    timer = setInterval(sched, 25); sched();
  }
  function stopMusic() { if (timer) clearInterval(timer); timer = null; theme = null; }

  function sfx(name) {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'jump': tone(330, 0.13, { type: 'square', slide: 660, vol: 0.12 }); break;
      case 'throw': noise(0.06, { vol: 0.15, freq: 2500 }); tone(900, 0.08, { type: 'triangle', slide: 500, vol: 0.12 }); break;
      case 'hit': tone(220, 0.1, { type: 'square', slide: 110, vol: 0.18 }); noise(0.05, { vol: 0.18, freq: 1200 }); break;
      case 'ting': tone(1800, 0.15, { type: 'triangle', vol: 0.12 }); tone(2400, 0.1, { type: 'sine', vol: 0.08, t: t + 0.03 }); break;
      case 'kill': [1, 1.25, 1.5, 2].forEach((m, i) => tone(SA * 2 * m, 0.25, { t: t + i * 0.05, vol: 0.12, type: 'triangle' })); break;
      case 'hurt': tone(420, 0.3, { type: 'sawtooth', slide: 110, vol: 0.18 }); break;
      case 'feather': tone(1175, 0.08, { type: 'triangle', vol: 0.12 }); tone(1760, 0.12, { type: 'triangle', vol: 0.12, t: t + 0.06 }); break;
      case 'marbles': [0, 0.05, 0.1].forEach(d => tone(2000 + Math.random() * 800, 0.04, { t: t + d, vol: 0.1, type: 'triangle' })); break;
      case 'heal': ['S', 'G', 'P', "S'"].forEach((n, i) => tone(noteFreq(n) * 2, 0.22, { t: t + i * 0.07, vol: 0.13 })); break;
      case 'gold': ['S', 'R', 'G', 'P', 'D', "S'"].forEach((n, i) => tone(noteFreq(n) * 2, 0.3, { t: t + i * 0.06, vol: 0.13, type: 'triangle' })); break;
      case 'bell': tone(880, 1.6, { vol: 0.15 }); tone(1320, 1.2, { vol: 0.08 }); tone(2210, 0.6, { vol: 0.05 }); break;
      case 'flute': ['S', 'R', 'G', 'P', 'D', "S'", "R'", "G'"].forEach((n, i) => tone(noteFreq(n) * 2, 0.35, { t: t + i * 0.06, vol: 0.12 })); break;
      case 'bossHit': tone(140, 0.18, { type: 'square', slide: 60, vol: 0.22 }); noise(0.08, { vol: 0.2, freq: 600 }); break;
      case 'bossDown': tone(200, 1.5, { type: 'sawtooth', slide: 40, vol: 0.15 }); noise(1.2, { vol: 0.15, freq: 400, q: 0.5 }); break;
      case 'moksha': ['S', 'G', 'P', "S'", "G'", "P'"].forEach((n, i) => { tone(noteFreq(n) * 2, 1.2, { t: t + i * 0.12, vol: 0.1 }); }); tone(880, 2.5, { vol: 0.1, t: t + 0.7 }); break;
      case 'splash': noise(0.35, { vol: 0.25, freq: 900, q: 0.7 }); break;
      case 'empty': tone(160, 0.06, { type: 'square', vol: 0.08 }); break;
      case 'gust': noise(1.4, { vol: 0.12, freq: 500, q: 0.4 }); break;
      case 'roar': tone(110, 0.6, { type: 'sawtooth', slide: 70, vol: 0.16 }); noise(0.5, { vol: 0.12, freq: 300 }); break;
      case 'thud': tone(90, 0.3, { type: 'sine', slide: 40, vol: 0.4 }); noise(0.2, { vol: 0.2, freq: 200 }); break;
      case 'select': tone(990, 0.07, { type: 'triangle', vol: 0.1 }); break;
    }
  }
  return { init, resume, setEnabled, startMusic, stopMusic, sfx };
})();
