'use strict';
// ================= Bal Krishna Leela - main game =================
const CONFIG = {
  feedbackUrl: '' // paste your Google Form link here to show a "Send Feedback" button
};
const W = 480, H = 272, TS = 16, STEP = 1 / 60, GY = 13 * 16;
const FONT = '"Nirmala UI","Noto Sans Devanagari","Kohinoor Devanagari","Mangal","Segoe UI",system-ui,sans-serif';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- Save ----------
const SAVE_KEY = 'balKrishnaLeela_v1';
let save = { unlocked: 1, lang: 'both', sound: true, best: {} };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
Sound.setEnabled(save.sound);

// ---------- Text helpers ----------
function T(o) { // HTML text in chosen language
  if (typeof o === 'string') o = STR[o];
  if (save.lang === 'en') return o.en;
  if (save.lang === 'hi') return o.hi;
  return `${o.en}<span class="hi">${o.hi}</span>`;
}
function TB(o) { // inline (buttons)
  if (typeof o === 'string') o = STR[o];
  if (save.lang === 'en') return o.en;
  if (save.lang === 'hi') return o.hi;
  return `${o.en} <span class="hi">· ${o.hi}</span>`;
}
function TC(o) { // canvas lines
  if (typeof o === 'string') o = STR[o];
  if (save.lang === 'en') return [o.en];
  if (save.lang === 'hi') return [o.hi];
  return [o.en, o.hi];
}
function TN(o) { // short name on one line
  if (save.lang === 'en') return o.en;
  if (save.lang === 'hi') return o.hi;
  return `${o.en} · ${o.hi}`;
}

// ---------- Canvas & scaling ----------
const wrap = document.getElementById('wrap');
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
let S = 2;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const sc = Math.min(vw / W, vh / H);
  wrap.style.width = Math.floor(W * sc) + 'px';
  wrap.style.height = Math.floor(H * sc) + 'px';
  wrap.style.setProperty('--s', sc.toFixed(3));
  const dpr = window.devicePixelRatio || 1;
  S = clamp(Math.ceil(sc * dpr), 1, 4);
  cvs.width = W * S; cvs.height = H * S;
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// ---------- Input ----------
const Input = { down: {}, hits: new Set() };
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump',
  ArrowDown: 'down', KeyS: 'down', KeyX: 'throw', KeyJ: 'throw', KeyC: 'flute', KeyK: 'flute' };
const isTouch = ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
window.addEventListener('keydown', e => {
  Sound.init(); Sound.resume();
  const k = KEYMAP[e.code];
  if (G.state === 'play') {
    if (k) { e.preventDefault(); if (!Input.down[k]) Input.hits.add(k); Input.down[k] = true; }
    if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); pauseGame(); }
  } else if (k) { Input.down[k] = true; }
  if (G.state === 'title' && (e.code === 'Enter') && !document.activeElement?.classList.contains('menu')) startFromMenu();
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) Input.down[k] = false; });
window.addEventListener('blur', () => { Input.down = {}; });
const touchEl = document.getElementById('touch');
if (isTouch) touchEl.classList.add('on');
touchEl.querySelectorAll('.tb').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); Sound.init(); Sound.resume(); if (!Input.down[k]) Input.hits.add(k); Input.down[k] = true; b.classList.add('active'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
  const off = e => { e.preventDefault(); Input.down[k] = false; b.classList.remove('active'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.addEventListener('click', () => pauseGame());
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pauseGame(); });

// ---------- Game state ----------
const G = { state: 'title', levelIdx: 0, lvl: null, grid: null, cols: 0, camX: 0, shake: 0, flash: 0, t: 0,
  ents: [], shots: [], eshots: [], items: [], parts: [], rings: [], plats: [], boss: null,
  bossStarted: false, bossDone: false, arenaLock: false, endT: 0, pull: 0, banner: null, hinted: {},
  wind: { t: 4, active: false, dir: 1, push: 0 }, lightning: 0, ltT: 3, restT: 0, totalFeathers: 0, bg: null, tiles: null, p: null };
window.__game = G; // handy for debugging

function tile(c, r) { if (c < 0 || c >= G.cols) return '#'; if (r < 0 || r >= ROWS) return '.'; return G.grid[r][c]; }
function solid(c, r) { return tile(c, r) === '#'; }

function hint(key, dur = 3.2, once = true) {
  if (once && G.hinted[key]) return;
  G.hinted[key] = true;
  G.banner = { lines: TC(key), t: dur, max: dur };
}

// ---------- Level loading ----------
function loadLevel(idx) {
  const def = LEVELS[idx]();
  G.levelIdx = idx; G.lvl = def; G.grid = def.grid; G.cols = def.w;
  G.ents = []; G.items = []; G.shots = []; G.eshots = []; G.parts = []; G.rings = []; G.plats = [];
  G.boss = null; G.bossStarted = false; G.bossDone = false; G.arenaLock = false; G.endT = 0; G.pull = 0; G.banner = null;
  G.wind = { t: 5, active: false, dir: 1, push: 0 }; G.lightning = 0; G.ltT = 3; G.totalFeathers = 0; G.hinted = {};
  let start = { x: 3, y: 12 };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < def.w; x++) {
    const ch = G.grid[y][x];
    if (ch === 'P') { start = { x, y }; G.grid[y][x] = '.'; }
    else if ('abr'.includes(ch)) { spawnEnemy(ch, x, y); G.grid[y][x] = '.'; }
    else if ('fMHo'.includes(ch)) { G.items.push({ type: ch, x: x * 16 + 8, y: y * 16 + 8, alive: true, ph: Math.random() * 6 }); if (ch === 'f') G.totalFeathers++; G.grid[y][x] = '.'; }
    else if (ch === 'C') { G.items.push({ type: 'C', x: x * 16 + 8, y: (y + 1) * 16, alive: true, lit: false }); G.grid[y][x] = '.'; }
    else if (ch === 'L' || ch === 'K') { const range = ch === 'L' ? 48 : 80; G.plats.push({ x: x * 16, x0: x * 16, range, y: y * 16 + 10, w: 48, h: 8, dir: 1, speed: 38, dx: 0 }); G.grid[y][x] = '.'; }
  }
  G.tiles = Art.buildTiles(def);
  G.bg = { sky: Art.buildSky(def.theme), far: Art.buildFar(def.theme), mid: Art.buildMid(def.theme) };
  G.p = { x: start.x * 16 + 3, y: (start.y + 1) * 16 - 22, w: 10, h: 22, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0,
    inv: 0, throwT: 0, poseT: 0, fluteT: 0, hearts: 3, maxH: 3, marbles: 15, feathers: 0, flute: 0, animT: 0, heavy: false,
    ride: null, dropT: 0, dead: false, standOneWay: false, isPlayer: true };
  G.checkpoint = { x: G.p.x, y: G.p.y };
  G.camX = clamp(G.p.x - W / 3, 0, G.cols * 16 - W);
}

function spawnEnemy(type, tx, ty) {
  const cfg = G.lvl.cfg;
  const base = { alive: true, stun: 0, flash: 0, vy: 0, anim: Math.random(), face: -1 };
  if (type === 'a') G.ents.push(Object.assign(base, { type: 'walker', w: 12, h: 14, hp: cfg.hpA, x: tx * 16 + 2, y: (ty + 1) * 16 - 14, vx: -28 * cfg.spd }));
  if (type === 'b') G.ents.push(Object.assign(base, { type: 'flyer', w: 14, h: 10, hp: 1, x: tx * 16, y: ty * 16, bx: tx * 16, by: ty * 16, t: Math.random() * 6, mode: 'patrol', mt: 0, cd: 0, vx: 0 }));
  if (type === 'r') G.ents.push(Object.assign(base, { type: 'thrower', w: 12, h: 20, hp: cfg.hpR, x: tx * 16 + 2, y: (ty + 1) * 16 - 20, cd: 1.5 + Math.random(), armT: 0, vx: 0 }));
}

// ---------- Physics ----------
function moveX(e, dx) {
  e.x += dx;
  const top = Math.floor(e.y / TS), bot = Math.floor((e.y + e.h - 0.01) / TS);
  if (dx > 0) { const c = Math.floor((e.x + e.w - 0.01) / TS); for (let r = top; r <= bot; r++) if (solid(c, r)) { e.x = c * TS - e.w; e.vx = 0; return true; } }
  else if (dx < 0) { const c = Math.floor(e.x / TS); for (let r = top; r <= bot; r++) if (solid(c, r)) { e.x = (c + 1) * TS; e.vx = 0; return true; } }
  return false;
}
function moveY(e, dy) {
  const prevBottom = e.y + e.h;
  e.y += dy;
  const l = Math.floor(e.x / TS), r = Math.floor((e.x + e.w - 0.01) / TS);
  if (dy > 0) {
    const row = Math.floor((e.y + e.h - 0.01) / TS);
    for (let c = l; c <= r; c++) {
      const t = tile(c, row);
      if (t === '#' || (t === '=' && prevBottom <= row * TS + 0.5 && !(e.dropT > 0))) {
        e.y = row * TS - e.h; e.vy = 0; e.onGround = true; if (t === '=') e.standOneWay = true; return;
      }
    }
    if (e.isPlayer) for (const p of G.plats) {
      if (prevBottom <= p.y + 0.5 && e.y + e.h >= p.y && e.x + e.w > p.x + 2 && e.x < p.x + p.w - 2) { e.y = p.y - e.h; e.vy = 0; e.onGround = true; e.ride = p; return; }
    }
  } else if (dy < 0) {
    const row = Math.floor(e.y / TS);
    for (let c = l; c <= r; c++) if (tile(c, row) === '#') { e.y = (row + 1) * TS; e.vy = 0; return; }
  }
}
function touchesTile(e, ch, inset = 2) {
  const l = Math.floor((e.x + inset) / TS), r = Math.floor((e.x + e.w - inset) / TS);
  const t = Math.floor((e.y + inset) / TS), b = Math.floor((e.y + e.h - 1) / TS);
  for (let y = t; y <= b; y++) for (let x = l; x <= r; x++) if (tile(x, y) === ch) {
    if (ch === '^' && e.y + e.h < y * TS + 8) continue;
    return true;
  }
  return false;
}

// ---------- Particles ----------
function burst(x, y, n, col, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(o.min || 20, o.max || 90);
    G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), life: rand(.3, o.life || .7), max: 1, size: o.size || 2, col: Array.isArray(col) ? col[i % col.length] : col, g: o.g ?? 200, kind: o.kind || 'sq' });
    G.parts[G.parts.length - 1].max = G.parts[G.parts.length - 1].life;
  }
}
function moksha(x, y, big) {
  const n = big ? 60 : 14;
  for (let i = 0; i < n; i++) G.parts.push({ x: x + rand(-10, 10) * (big ? 3 : 1), y: y + rand(-8, 8) * (big ? 3 : 1), vx: rand(-15, 15), vy: rand(-90, -30) * (big ? 1.4 : 1), life: rand(.8, 1.6) * (big ? 1.6 : 1), max: 1.6, size: rand(1, 3), col: ['#fff6c8', '#ffd45e', '#ffe9a8', '#ffffff'][i % 4], g: -10, kind: 'glow' });
  if (big) G.parts.push({ x, y, vx: 0, vy: -45, life: 3.5, max: 3.5, size: 10, col: '#fff3c0', g: 0, kind: 'orb' });
}

// ---------- Player ----------
function hurtPlayer(srcX) {
  const P = G.p;
  if (P.inv > 0 || P.dead) return;
  P.hearts--; P.inv = 1.4; P.vy = -220; P.vx = (P.x + P.w / 2 < srcX ? -1 : 1) * 150; P.onGround = false; P.ride = null;
  Sound.sfx('hurt'); G.shake = 0.25;
  burst(P.x + 5, P.y + 10, 10, ['#ffd45e', '#ffffff']);
  if (P.hearts <= 0) playerRest();
}
function fallHurt(water) {
  const P = G.p;
  if (water) { Sound.sfx('splash'); burst(P.x + 5, 15 * 16, 18, ['#9fd3f2', '#ffffff', '#5aa6dc'], { up: 80, g: 300 }); }
  P.hearts--; Sound.sfx('hurt');
  if (P.hearts <= 0) { playerRest(); return; }
  P.x = G.checkpoint.x; P.y = G.checkpoint.y; P.vx = P.vy = 0; P.inv = 1.5; P.ride = null;
}
function playerRest() {
  const P = G.p; P.dead = true; P.hearts = 0; G.restT = 1.3; G.pull = 0;
  Sound.stopMusic();
}
function respawnAfterRest() {
  const P = G.p;
  P.dead = false; P.hearts = P.maxH; P.marbles = Math.max(P.marbles, 10); P.inv = 1.5;
  P.x = G.checkpoint.x; P.y = G.checkpoint.y; P.vx = P.vy = 0; P.ride = null;
  if (G.bossStarted && !G.bossDone) { G.boss = null; G.bossStarted = false; G.arenaLock = false; }
  G.eshots = []; G.pull = 0;
  G.state = 'play'; UI.hide(); pauseBtn.classList.add('on');
  Sound.startMusic(G.lvl.music);
}

function updatePlayer(dt) {
  const P = G.p;
  if (P.dead) return;
  P.inv = Math.max(0, P.inv - dt); P.throwT -= dt; P.poseT -= dt; P.fluteT -= dt; P.coyote -= dt; P.jumpBuf -= dt; P.dropT -= dt;
  if (Input.hits.has('jump')) P.jumpBuf = 0.12;
  if (P.ride) P.x += P.ride.dx;
  const downK = !!Input.down.down;
  P.heavy = downK && P.onGround;
  let dir = (Input.down.right ? 1 : 0) - (Input.down.left ? 1 : 0);
  if (dir) P.face = dir;
  if (P.heavy || P.fluteT > 0) dir = 0;
  const target = dir * 112, acc = P.onGround ? 1000 : 650;
  if (P.vx < target) P.vx = Math.min(target, P.vx + acc * dt); else if (P.vx > target) P.vx = Math.max(target, P.vx - acc * dt);
  let ext = 0;
  if (!P.heavy) ext += G.wind.push + G.pull;
  if (P.jumpBuf > 0 && P.onGround && downK && P.standOneWay) { P.dropT = 0.25; P.y += 2; P.onGround = false; P.jumpBuf = 0; }
  else if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0) && P.fluteT <= 0) {
    P.vy = -335; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; P.ride = null; Sound.sfx('jump');
  }
  if (!Input.down.jump && P.vy < -130 && !P.bounce) P.vy = -130;
  if (P.vy >= 0) P.bounce = false;
  P.vy = Math.min(P.vy + 980 * dt, 430);
  moveX(P, (P.vx + ext) * dt);
  const was = P.onGround;
  P.onGround = false; P.ride = null; P.standOneWay = false;
  moveY(P, P.vy * dt);
  if (was && !P.onGround && P.vy >= 0) P.coyote = 0.1;
  if (G.arenaLock) { const ax = G.lvl.arenaX * TS; P.x = clamp(P.x, ax + 2, ax + W - P.w - 2); }
  P.x = clamp(P.x, 0, G.cols * TS - P.w);
  if (Input.hits.has('throw')) tryThrow();
  if (Input.hits.has('flute')) tryFlute();
  if (touchesTile(P, '^')) { hurtPlayer(P.x + P.w / 2 + P.face * 4); if (!P.dead) P.vy = -280; }
  if (P.y > ROWS * TS + 8) fallHurt(false);
  else if (touchesTile(P, '~', 3) && P.y + P.h > 15 * TS + 4) fallHurt(true);
  P.animT += dt;
  if (P.heavy && Math.random() < 0.3) G.parts.push({ x: P.x + rand(-2, 12), y: P.y + rand(0, 22), vx: 0, vy: -20, life: .4, max: .4, size: 1, col: '#ffd45e', g: 0, kind: 'glow' });
}
function tryThrow() {
  const P = G.p;
  if (P.throwT > 0 || P.fluteT > 0) return;
  if (P.marbles <= 0) { Sound.sfx('empty'); hint('hintEmpty', 2.5); P.throwT = 0.25; return; }
  P.marbles--; P.throwT = 0.26; P.poseT = 0.16;
  const cols = ['#e94b4b', '#4bb3e9', '#f2d24b', '#6be36b', '#ffffff', '#c78bff'];
  const sx = P.x + P.w / 2 + P.face * 7, sy = P.y + 10;
  let vx = P.face * 245 + P.vx * 0.25, vy = -85, g = 420;
  const b = G.boss;
  if (b && !b.dying && b.state !== 'hunt' && b.intro <= 0) { // gentle auto-aim at the boss
    const rs = bossHitRects(b)[0], tx = rs.x + rs.w / 2, ty = rs.y + rs.h / 2;
    if (Math.sign(tx - sx) === P.face || Math.abs(tx - sx) < 24) { const d = Math.hypot(tx - sx, ty - sy) || 1; vx = (tx - sx) / d * 280; vy = (ty - sy) / d * 280; g = 60; }
  }
  G.shots.push({ x: sx, y: sy, vx, vy, g, r: 2.5, col: cols[Math.floor(Math.random() * cols.length)], life: 1.6, dead: false, deflect: false });
  Sound.sfx('throw');
}
function tryFlute() {
  const P = G.p;
  if (P.flute < 100 || P.fluteT > 0) return;
  P.flute = 0; P.fluteT = 0.9;
  Sound.sfx('flute');
  const cx = P.x + P.w / 2, cy = P.y + 8;
  for (let i = 0; i < 3; i++) G.rings.push({ x: cx, y: cy, r: 4, life: 1 + i * 0.25, max: 1 + i * 0.25, delay: i * 0.15 });
  for (let i = 0; i < 12; i++) G.parts.push({ x: cx, y: cy, vx: rand(-90, 90), vy: rand(-80, -20), life: 1.4, max: 1.4, size: 1, col: ['#ffd45e', '#9fe0ff', '#ffb3d9'][i % 3], g: -5, kind: 'note' });
  for (const e of G.ents) if (e.alive && e.x > G.camX - 20 && e.x < G.camX + W + 20) e.stun = 4;
  if (G.boss && !G.boss.dying) { G.boss.stun = 2.6; if (G.boss.kind === 'trina') { G.boss.state = 'dizzy'; G.boss.t = 0; G.pull = 0; } }
  G.eshots.forEach(s => { s.dead = true; burst(s.x, s.y, 4, '#ffd45e', { g: 0 }); });
}

// ---------- Enemies ----------
function killEnemy(e) {
  e.alive = false;
  moksha(e.x + e.w / 2, e.y + e.h / 2, false);
  Sound.sfx('kill');
  G.p.flute = Math.min(100, G.p.flute + 5);
  checkFluteHint();
  if (e.type === 'walker' && Math.random() < 0.35) G.items.push({ type: 'o', x: e.x + e.w / 2, y: e.y + 4, alive: true, ph: 0 });
}
function damageEnemy(e, n) {
  e.hp -= n; e.flash = 0.12; Sound.sfx('hit');
  if (e.hp <= 0) killEnemy(e);
}
function updateEnemies(dt) {
  const P = G.p, spd = G.lvl.cfg.spd;
  for (const e of G.ents) {
    if (!e.alive) continue;
    if (Math.abs(e.x - (G.camX + W / 2)) > 420) continue;
    e.flash -= dt; e.anim += dt;
    const stunned = e.stun > 0;
    if (stunned) e.stun -= dt;
    if (e.type === 'walker') {
      if (!stunned) {
        if (moveX(e, e.vx * dt)) e.vx = -e.vx * 0 + (e.face > 0 ? -1 : 1) * 28 * spd;
        const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        if (e.onGround && !solid(Math.floor(ahead / TS), Math.floor((e.y + e.h + 2) / TS))) e.vx = -e.vx;
        if (e.vx === 0) e.vx = 28 * spd;
        e.face = e.vx > 0 ? 1 : -1;
      }
      e.vy = Math.min(e.vy + 980 * dt, 400); e.onGround = false; moveY(e, e.vy * dt);
      if (e.y > ROWS * TS) e.alive = false;
    } else if (e.type === 'flyer') {
      if (!stunned) {
        e.t += dt; e.cd -= dt;
        const px = P.x + P.w / 2, py = P.y + P.h / 2;
        if (e.mode === 'patrol') {
          const nx = e.bx + Math.sin(e.t * 0.9) * 40, ny = e.by + Math.sin(e.t * 2.6) * 8;
          e.face = nx > e.x ? 1 : -1; e.x = nx; e.y = ny;
          if (e.cd <= 0 && Math.abs(px - e.x) < 130 && py > e.y - 10 && !P.dead) {
            e.mode = 'swoop'; e.mt = 1.3; const d = Math.hypot(px - e.x, py - e.y) || 1; e.vx = (px - e.x) / d * 100 * spd; e.vyy = (py - e.y) / d * 100 * spd;
          }
        } else if (e.mode === 'swoop') {
          e.x += e.vx * dt; e.y += e.vyy * dt; e.mt -= dt; e.face = e.vx > 0 ? 1 : -1;
          if (e.mt <= 0 || solid(Math.floor((e.x + 7) / TS), Math.floor((e.y + 5) / TS))) { e.mode = 'return'; }
        } else {
          const tx = e.bx + Math.sin(e.t * 0.9) * 40, ty = e.by + Math.sin(e.t * 2.6) * 8;
          const d = Math.hypot(tx - e.x, ty - e.y);
          if (d < 4) { e.mode = 'patrol'; e.cd = 1.5; } else { e.x += (tx - e.x) / d * 70 * dt; e.y += (ty - e.y) / d * 70 * dt; e.face = tx > e.x ? 1 : -1; }
        }
      }
    } else if (e.type === 'thrower') {
      e.armT -= dt;
      if (!stunned) {
        const px = P.x + P.w / 2, py = P.y + P.h / 2, ex = e.x + e.w / 2, ey = e.y + 4;
        e.face = px > ex ? 1 : -1; e.cd -= dt;
        if (e.cd <= 0 && Math.abs(px - ex) < 230 && !P.dead) {
          const Tm = 0.95, g = 600;
          G.eshots.push({ type: 'rock', x: ex, y: ey, vx: clamp((px - ex) / Tm, -210, 210), vy: (py - ey) / Tm - 0.5 * g * Tm, g, r: 3.5, dead: false, life: 3 });
          e.cd = 2.4 / spd; e.armT = 0.3; Sound.sfx('throw');
        }
      }
      e.vy = Math.min(e.vy + 980 * dt, 400); e.onGround = false; moveY(e, e.vy * dt);
    }
    // contact with player
    if (!P.dead && overlap(P, e)) {
      if (P.vy > 40 && P.y + P.h - e.y < 10) {
        damageEnemy(e, e.alive ? (stunned ? 99 : 1) : 0); P.vy = -270; P.bounce = true;
        if (e.alive) e.stun = Math.max(e.stun, 0.4);
      } else if (!stunned) hurtPlayer(e.x + e.w / 2);
    }
  }
}

// ---------- Bosses ----------
function arena() { const ax = G.lvl.arenaX * TS; return { AX: ax, AR: ax + W }; }
function makeBoss(kind) {
  const { AX, AR } = arena();
  const common = { kind, t: 0, flash: 0, stun: 0, dying: false, dieT: 0, intro: 1.8 };
  if (kind === 'putana') return Object.assign(common, { name: CHAPTERS[0].boss, x: AR - 90, y: -60, w: 36, h: 46, hp: 14, max: 14, state: 'enter', drop: 1 });
  if (kind === 'trina') return Object.assign(common, { name: CHAPTERS[1].boss, x: AR - 100, y: GY - 72, w: 40, h: 72, hp: 16, max: 16, state: 'enter', debrisT: 1.2, dir: -1, spin: 14 });
  return Object.assign(common, { name: CHAPTERS[2].boss, x: AR + 10, y: GY - 60, w: 48, h: 60, hp: 20, max: 20, state: 'enter', face: -1, last: '', shadowX: 0, ext: 0, vy: 0 });
}
function bossVulnerable(b) {
  if (b.dying) return false;
  if (b.stun > 0) return true;
  if (b.kind === 'trina') return b.state === 'dizzy';
  if (b.kind === 'baka') return b.state !== 'hunt';
  return b.state !== 'enter';
}
function bossHitRects(b) {
  if (b.kind === 'putana') return [{ x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 6 }];
  if (b.kind === 'trina') return [{ x: b.x + 4, y: b.y + 6, w: b.w - 8, h: b.h - 6 }];
  const hd = bakaHead(b);
  return [{ x: b.x + 4, y: b.y + 16, w: b.w - 8, h: b.h - 16 }, { x: hd.x - 7, y: hd.y - 7, w: 14, h: 14 }];
}
function bossHurtRects(b) {
  if (b.kind === 'putana') return [{ x: b.x + 6, y: b.y + 6, w: b.w - 12, h: b.h - 10 }];
  if (b.kind === 'trina') return [{ x: b.x + 10, y: b.y + 14, w: b.w - 20, h: b.h - 14 }];
  const hd = bakaHead(b), rects = [{ x: b.x + 6, y: b.y + 18, w: b.w - 12, h: 28 }, { x: hd.x - 6, y: hd.y - 6, w: 12, h: 12 }];
  const tip = hd.x + b.face * 24;
  rects.push({ x: Math.min(hd.x, tip), y: hd.y - 2, w: Math.abs(tip - hd.x), h: 5 });
  if (b.state !== 'hunt' && b.state !== 'rise') rects.push({ x: b.x + 14, y: b.y + 44, w: 20, h: 16 });
  return rects;
}
function bakaHead(b) {
  const cx = b.x + b.w / 2, f = b.face;
  switch (b.state) {
    case 'peckWind': return { x: cx + f * 8, y: b.y - 6 };
    case 'peck': return { x: cx + f * (18 + b.ext * 62), y: b.y + 2 + (GY - 18 - (b.y + 2)) * b.ext };
    case 'stuck': return { x: cx + f * 26, y: GY - 8 };
    case 'feathers': return { x: cx + f * 14, y: b.y - 8 };
    default: return { x: cx + f * 18, y: b.y + 2 + Math.sin(G.t * 4) * 1.5 };
  }
}
function damageBoss(b, n) {
  b.hp -= n; b.flash = 0.1; Sound.sfx('bossHit'); G.shake = Math.max(G.shake, 0.08);
  if (b.hp <= 0 && !b.dying) {
    b.dying = true; b.dieT = 0; G.eshots = []; G.pull = 0; Sound.sfx('bossDown'); Sound.stopMusic();
  }
}
function updateBoss(dt) {
  const b = G.boss; G.pull = 0;
  if (!b) return;
  const P = G.p, { AX, AR } = arena();
  b.flash -= dt;
  if (b.dying) {
    b.dieT += dt; G.shake = 0.15;
    if (Math.random() < 0.5) moksha(b.x + rand(0, b.w), b.y + rand(0, b.h), false);
    if (b.dieT > 2.2) {
      G.flash = 1; moksha(b.x + b.w / 2, b.y + b.h / 2, true); Sound.sfx('moksha');
      G.boss = null; G.bossDone = true; G.endT = 3.2;
    }
    return;
  }
  if (b.stun > 0) { b.stun -= dt; if (b.kind === 'baka' && b.y < GY - b.h) { b.y = Math.min(GY - b.h, b.y + 200 * dt); } return; }
  b.t += dt;
  if (b.intro > 0) b.intro -= dt;
  const px = P.x + P.w / 2;
  const phase2 = b.hp <= b.max / 2, spd = phase2 ? 1.3 : 1;
  if (b.kind === 'putana') {
    if (b.state === 'enter') { b.y += (36 - b.y) * dt * 2; b.x += (AR - 140 - b.x) * dt; if (b.t > 1.8) { b.state = 'hover'; b.t = 0; } }
    else if (b.state === 'hover') {
      const tx = AX + 240 + Math.sin(G.t * 0.9 * spd) * 170 - b.w / 2;
      b.x += (tx - b.x) * dt * 2.2; b.y += (36 + Math.sin(G.t * 2.2) * 8 - b.y) * dt * 3;
      if (phase2) { b.drop -= dt; if (b.drop <= 0) { b.drop = 0.7; G.eshots.push({ type: 'poison', x: b.x + b.w / 2, y: b.y + b.h - 4, vx: rand(-20, 20), vy: 30, g: 380, r: 3, dead: false, life: 3 }); } }
      if (b.t > (phase2 ? 1.5 : 2.3)) { b.state = 'aim'; b.t = 0; b.sx = b.x; b.sy = b.y; b.tx = clamp(px - b.w / 2, AX + 4, AR - b.w - 4); b.ty = GY - b.h - 2; Sound.sfx('roar'); }
    } else if (b.state === 'aim') { if (b.t > 0.55) { b.state = 'swoop'; b.t = 0; b.ex = (b.tx > AX + 220) ? AX + 30 : AR - 30 - b.w; } }
    else if (b.state === 'swoop') {
      const dur = 1.25 / spd, u = Math.min(1, b.t / dur);
      const cxp = 2 * b.tx - 0.5 * (b.sx + b.ex), cyp = 2 * b.ty - 0.5 * (b.sy + 36);
      b.x = (1 - u) * (1 - u) * b.sx + 2 * (1 - u) * u * cxp + u * u * b.ex;
      b.y = (1 - u) * (1 - u) * b.sy + 2 * (1 - u) * u * cyp + u * u * 36;
      if (u >= 1) { b.state = 'hover'; b.t = 0; }
    }
  } else if (b.kind === 'trina') {
    b.spin = b.state === 'dizzy' ? 3 : 14;
    const cx = b.x + b.w / 2;
    if (b.state === 'enter') { if (b.t > 1.8) { b.state = 'roam'; b.t = 0; } }
    else if (b.state === 'roam') {
      const d = px - cx, sp = 70 * spd;
      let mv = 0;
      if (Math.abs(d) < 110) mv = -Math.sign(d) * sp; else if (Math.abs(d) > 190) mv = Math.sign(d) * sp; else mv = Math.sin(G.t * 1.5) * 30;
      b.x = clamp(b.x + mv * dt, AX + 8, AR - b.w - 8);
      if (Math.abs(d) < 60 && (b.x <= AX + 9 || b.x >= AR - b.w - 9)) { b.state = 'rise'; b.t = 0; }
      b.debrisT -= dt;
      if (b.debrisT <= 0) {
        b.debrisT = phase2 ? 0.7 : 1.1;
        const dir = Math.sign(d) || -1, hy = rand(GY - 58, GY - 12);
        G.eshots.push({ type: 'leaf', x: cx + dir * 16, y: hy, vx: dir * 150 * spd, vy: 0, g: 0, r: 3, dead: false, life: 4, ph: Math.random() * 6 });
      }
      if (b.t > 3.2) { b.state = 'pull'; b.t = 0; Sound.sfx('gust'); }
    } else if (b.state === 'pull') {
      G.pull = Math.sign(cx - px) * 72 * Math.min(1, b.t / 0.5) * spd;
      if (Math.random() < 0.6) { const side = Math.sign(px - cx) || 1; G.parts.push({ x: cx + side * rand(60, 200), y: rand(GY - 60, GY - 4), vx: -side * 220, vy: 0, life: .7, max: .7, size: 1, col: 'rgba(230,220,200,.8)', g: 0, kind: 'sq', w: 6 }); }
      if (b.t > 2.6) { b.state = 'dizzy'; b.t = 0; }
    } else if (b.state === 'dizzy') { if (b.t > (phase2 ? 2.2 : 2.8)) { b.state = 'roam'; b.t = 0; } }
    else if (b.state === 'rise') {
      b.y -= 260 * dt;
      if (b.y < -90) { b.x = px < AX + 240 ? AR - b.w - 30 : AX + 30; b.state = 'land'; b.t = 0; }
    } else if (b.state === 'land') { b.y = Math.min(GY - b.h, b.y + 300 * dt); if (b.y >= GY - b.h) { b.state = 'roam'; b.t = 0; G.shake = 0.15; } }
  } else if (b.kind === 'baka') {
    const cx = b.x + b.w / 2;
    if (b.state !== 'hunt' && b.state !== 'dive' && b.state !== 'rise' && b.state !== 'peck' && b.state !== 'stuck') b.face = px > cx ? 1 : -1;
    if (b.state === 'enter') { b.x += (AR - 110 - b.x) * dt * 1.5; if (b.t > 1.8) { b.state = 'strut'; b.t = 0; Sound.sfx('roar'); } }
    else if (b.state === 'strut') {
      const d = px - cx;
      if (Math.abs(d) > 90) b.x += Math.sign(d) * 45 * spd * dt;
      b.x = clamp(b.x, AX + 6, AR - b.w - 6);
      if (b.t > 1.4 / spd) {
        const opts = ['peck', 'fly', 'feathers'].filter(o => o !== b.last);
        let pick = opts[Math.floor(Math.random() * opts.length)];
        if (Math.abs(d) > 150 && pick === 'peck') pick = 'fly';
        b.last = pick; b.t = 0;
        if (pick === 'peck') b.state = 'peckWind';
        else if (pick === 'fly') { b.state = 'rise'; Sound.sfx('gust'); }
        else b.state = 'feathers';
      }
    } else if (b.state === 'peckWind') { if (b.t > 0.5 / spd) { b.state = 'peck'; b.t = 0; b.ext = 0; Sound.sfx('roar'); } }
    else if (b.state === 'peck') {
      b.ext = b.t < 0.18 ? b.t / 0.18 : b.t < 0.55 ? 1 : Math.max(0, 1 - (b.t - 0.55) / 0.25);
      if (b.t < 0.18) b.x = clamp(b.x + b.face * 90 * dt, AX + 6, AR - b.w - 6);
      if (b.t > 0.8) { b.state = 'strut'; b.t = 0; b.ext = 0; }
    } else if (b.state === 'rise') {
      b.y -= 230 * dt;
      if (b.y < -100) { b.state = 'hunt'; b.t = 0; b.shadowX = px; }
    } else if (b.state === 'hunt') {
      if (b.t < 1.1) b.shadowX += (px - b.shadowX) * Math.min(1, dt * 4);
      if (b.t > 1.35 / Math.sqrt(spd)) { b.state = 'dive'; b.t = 0; b.x = clamp(b.shadowX - b.w / 2, AX + 6, AR - b.w - 6); b.vy = 0; }
    } else if (b.state === 'dive') {
      b.vy += 1400 * dt; b.y += b.vy * dt;
      if (b.y >= GY - b.h) { b.y = GY - b.h; b.state = 'stuck'; b.t = 0; G.shake = 0.35; Sound.sfx('thud'); burst(b.x + b.w / 2, GY, 20, ['#c9a26a', '#e0c89a', '#8a6a3a'], { up: 60, g: 300 }); }
    } else if (b.state === 'stuck') { if (b.t > 1.4 / spd) { b.state = 'strut'; b.t = 0; } }
    else if (b.state === 'feathers') {
      if (b.t > 0.45 && !b.fired) {
        b.fired = true; const hd = bakaHead(b), n = phase2 ? 5 : 3;
        const ang = Math.atan2((P.y + 10) - hd.y, px - hd.x);
        for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.22; G.eshots.push({ type: 'feather', x: hd.x, y: hd.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, g: 0, r: 3, dead: false, life: 3 }); }
        Sound.sfx('throw');
      }
      if (b.t > 0.9) { b.state = 'strut'; b.t = 0; b.fired = false; }
    }
  }
  // contact damage
  if (!P.dead && b.intro <= 0) for (const r of bossHurtRects(b)) if (overlap(P, r)) { hurtPlayer(r.x + r.w / 2); break; }
}
function startBoss() {
  G.bossStarted = true; G.arenaLock = true;
  G.boss = makeBoss(G.lvl.boss);
  Sound.startMusic('boss'); Sound.sfx('roar');
  const k = G.lvl.boss === 'putana' ? 'hintPutana' : G.lvl.boss === 'trina' ? (isTouch ? 'hintTrinaTouch' : 'hintTrina') : 'hintBaka';
  G.banner = { lines: TC(k), t: 4, max: 4, title: TN(G.boss.name) };
}

// ---------- Shots, items, effects ----------
function updateShots(dt) {
  const P = G.p;
  for (const s of G.shots) {
    s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.life <= 0) s.dead = true;
    if (solid(Math.floor(s.x / TS), Math.floor(s.y / TS))) { s.dead = true; burst(s.x, s.y, 5, s.col, { max: 60 }); continue; }
    if (s.deflect) continue;
    for (const e of G.ents) if (e.alive && s.x > e.x - 2 && s.x < e.x + e.w + 2 && s.y > e.y - 2 && s.y < e.y + e.h + 2) { damageEnemy(e, 1); s.dead = true; burst(s.x, s.y, 6, s.col); break; }
    if (!s.dead && G.boss) for (const r of bossHitRects(G.boss)) if (s.x > r.x && s.x < r.x + r.w && s.y > r.y && s.y < r.y + r.h) {
      if (bossVulnerable(G.boss)) { damageBoss(G.boss, 1); s.dead = true; burst(s.x, s.y, 8, ['#ffd45e', s.col]); }
      else { s.deflect = true; s.vx = -s.vx * 0.4; s.vy = -120; Sound.sfx('ting'); burst(s.x, s.y, 4, '#ffffff', { g: 0 }); }
      break;
    }
  }
  G.shots = G.shots.filter(s => !s.dead);
  for (const s of G.eshots) {
    s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.type === 'leaf') s.y += Math.sin(G.t * 10 + s.ph) * 0.6;
    if (s.life <= 0) s.dead = true;
    if (s.type !== 'leaf' && s.type !== 'feather' && solid(Math.floor(s.x / TS), Math.floor(s.y / TS))) { s.dead = true; burst(s.x, s.y, 6, s.type === 'poison' ? '#7be05a' : '#9a9a9a'); continue; }
    if (s.x < G.camX - 60 || s.x > G.camX + W + 60) s.dead = true;
    if (!P.dead && s.x > P.x - s.r && s.x < P.x + P.w + s.r && s.y > P.y - s.r && s.y < P.y + P.h + s.r) { s.dead = true; hurtPlayer(s.x); }
  }
  G.eshots = G.eshots.filter(s => !s.dead);
}
function checkFluteHint() { if (G.p.flute >= 100) hint(isTouch ? 'hintFluteTouch' : 'hintFlute', 3.5); }
function updateItems(dt) {
  const P = G.p;
  for (const it of G.items) {
    if (!it.alive) continue;
    if (it.type === 'C') {
      if (!it.lit && Math.abs(P.x + P.w / 2 - it.x) < 10 && P.y + P.h > it.y - 30) {
        it.lit = true; G.checkpoint = { x: it.x - 5, y: it.y - 22 }; Sound.sfx('bell'); hint('hintCheck', 2.2, false);
        burst(it.x, it.y - 18, 12, ['#ffd45e', '#ff9a3c'], { g: -40 });
      }
      continue;
    }
    const box = { x: it.x - 6, y: it.y - 7, w: 12, h: 14 };
    if (P.dead || !overlap(P, box)) continue;
    if (it.type === 'f') { it.alive = false; P.feathers++; P.flute = Math.min(100, P.flute + 10); Sound.sfx('feather'); burst(it.x, it.y, 6, ['#1f8f4e', '#2563d6', '#e8c33a'], { g: 0, max: 50 }); checkFluteHint(); }
    else if (it.type === 'o') { it.alive = false; P.marbles = Math.min(99, P.marbles + 8); Sound.sfx('marbles'); }
    else if (it.type === 'M') { if (P.hearts < P.maxH) { it.alive = false; P.hearts++; Sound.sfx('heal'); hint('hintMakhan', 2.2); burst(it.x, it.y, 10, ['#fff8dc', '#ffffff'], { g: -30 }); } }
    else if (it.type === 'H') { it.alive = false; P.maxH = Math.min(5, P.maxH + 1); P.hearts = P.maxH; Sound.sfx('gold'); hint('hintGold', 2.8, false); moksha(it.x, it.y, false); }
  }
}
function updateParts(dt) {
  for (const p of G.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 500) G.parts.splice(0, G.parts.length - 500);
  for (const r of G.rings) { if (r.delay > 0) { r.delay -= dt; continue; } r.r += 260 * dt; r.life -= dt; }
  G.rings = G.rings.filter(r => r.life > 0);
}
function updateWind(dt) {
  const w = G.wind;
  if (!G.lvl.wind || G.arenaLock) { w.push += (0 - w.push) * Math.min(1, dt * 3); return; }
  w.t -= dt;
  if (w.t <= 0) {
    w.active = !w.active;
    if (w.active) { w.dir = Math.random() < 0.6 ? -1 : 1; w.t = 2.2; Sound.sfx('gust'); hint(isTouch ? 'hintWindTouch' : 'hintWind', 3.5); }
    else w.t = rand(4, 7);
  }
  w.push += ((w.active ? w.dir * 70 : 0) - w.push) * Math.min(1, dt * 3);
  if (w.active && Math.random() < 0.8) G.parts.push({ x: G.camX + (w.dir > 0 ? -5 : W + 5), y: rand(20, H - 40), vx: w.dir * rand(220, 320), vy: rand(-10, 10), life: 2, max: 2, size: 1, col: Math.random() < .3 ? '#6aa553' : 'rgba(220,200,170,.7)', g: 0, kind: 'sq', w: Math.random() < .3 ? 2 : 5 });
}
function updateCamera(dt) {
  const P = G.p;
  let target;
  if (G.arenaLock) target = G.lvl.arenaX * TS;
  else target = P.x + P.w / 2 - W / 2 + P.face * 36;
  G.camX += (target - G.camX) * Math.min(1, dt * (G.arenaLock ? 3 : 5));
  G.camX = clamp(G.camX, 0, G.cols * TS - W);
}

// ---------- Main update ----------
function update(dt) {
  if (G.state !== 'play') { Input.hits.clear(); return; }
  G.t += dt;
  G.shake = Math.max(0, G.shake - dt); G.flash = Math.max(0, G.flash - dt * 1.5);
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  for (const p of G.plats) { const px = p.x; p.x += p.dir * p.speed * dt; if (p.x > p.x0 + p.range) { p.x = p.x0 + p.range; p.dir = -1; } if (p.x < p.x0) { p.x = p.x0; p.dir = 1; } p.dx = p.x - px; }
  updateWind(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updateShots(dt);
  updateItems(dt);
  updateParts(dt);
  updateCamera(dt);
  if (G.lvl.theme === 'storm') { G.ltT -= dt; if (G.ltT <= 0) { G.lightning = 0.25; G.ltT = rand(4, 9); } G.lightning = Math.max(0, G.lightning - dt); }
  if (!G.bossStarted && !G.p.dead && G.p.x > G.lvl.arenaX * TS + 56) startBoss();
  if (G.p.dead) { G.restT -= dt; if (G.restT <= 0 && G.state === 'play') showRest(); }
  if (G.bossDone && G.endT > 0) { G.endT -= dt; if (G.endT <= 0) levelComplete(); }
  if (G.levelIdx === 0 && G.t > 0.6 && G.t < 1) hint(isTouch ? 'hintMoveTouch' : 'hintMove', 5);
  Input.hits.clear();
}

// ---------- Rendering ----------
function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function text(s, x, y, size, col, align = 'center', bold = true) {
  ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillText(s, x + 0.6, y + 0.8);
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function drawImgFlip(img, x, y, face) {
  x = Math.round(x); y = Math.round(y);
  if (face >= 0) ctx.drawImage(img, x, y);
  else { ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
}
function drawParallax(img, f, camX, y = 0) {
  const w = img.width; let off = -Math.floor((camX * f) % w);
  for (let x = off; x < W; x += w) ctx.drawImage(img, x, y);
}
function render() {
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (!G.lvl) { renderTitleBg(); return; }
  let sx = 0, sy = 0;
  if (G.shake > 0) { sx = rand(-2, 2); sy = rand(-2, 2); }
  const cam = Math.round(G.camX);
  ctx.drawImage(G.bg.sky, 0, 0);
  if (G.lightning > 0 && Math.floor(G.lightning * 20) % 2 === 0) { ctx.fillStyle = 'rgba(220,210,255,.35)'; ctx.fillRect(0, 0, W, H); }
  drawParallax(G.bg.far, 0.15, cam);
  drawParallax(G.bg.mid, 0.45, cam, 0);
  ctx.save(); ctx.translate(Math.round(sx), Math.round(sy));
  ctx.drawImage(G.tiles, cam, 0, W, H, 0, 0, W, H);
  drawWater(cam);
  for (const p of G.plats) drawLog(p.x - cam, p.y);
  drawItems(cam);
  for (const e of G.ents) if (e.alive && e.x > cam - 40 && e.x < cam + W + 40) drawEnemy(e, cam);
  if (G.boss) drawBoss(G.boss, cam);
  drawPlayer(cam);
  for (const s of G.shots) { R(s.x - cam - 2, s.y - 2, 4, 4, s.col); R(s.x - cam - 1, s.y - 2, 1, 1, '#ffffff'); }
  for (const s of G.eshots) drawEShot(s, cam);
  drawParts(cam);
  ctx.restore();
  if (Art.THEMES[G.lvl.theme].tint) { ctx.fillStyle = Art.THEMES[G.lvl.theme].tint; ctx.fillRect(0, 0, W, H); }
  drawHUD();
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,250,225,${Math.min(1, G.flash)})`; ctx.fillRect(0, 0, W, H); }
}
function drawWater(cam) {
  const c0 = Math.floor(cam / TS), c1 = c0 + Math.ceil(W / TS) + 1;
  for (let x = c0; x <= c1; x++) {
    if (tile(x, 15) !== '~') continue;
    const px = x * TS - cam;
    R(px, 15 * TS + 2, 16, 30, '#2c6fb5'); R(px, 15 * TS + 10, 16, 22, '#245c98');
    for (let i = 0; i < 16; i += 2) { const yy = 15 * TS + 1 + Math.round(Math.sin(G.t * 3 + (x * 16 + i) * 0.25) * 1.5); R(px + i, yy, 2, 2, '#7ec4f0'); }
    if ((x * 7) % 5 === 0) { R(px + 6, 15 * TS + 6 + Math.round(Math.sin(G.t * 2 + x)), 5, 2, '#3f8a4a'); R(px + 7, 15 * TS + 4 + Math.round(Math.sin(G.t * 2 + x)), 2, 2, '#ff8fb8'); }
  }
}
function drawLog(x, y) {
  x = Math.round(x);
  R(x, y, 48, 8, '#7a4a24'); R(x, y, 48, 2, '#a0682f'); R(x + 2, y + 6, 44, 2, '#5a3518');
  R(x, y + 1, 3, 6, '#c9a26a'); R(x + 45, y + 1, 3, 6, '#c9a26a'); R(x + 1, y + 3, 1, 2, '#7a4a24'); R(x + 46, y + 3, 1, 2, '#7a4a24');
  R(x + 14, y + 3, 6, 1, '#5a3518'); R(x + 30, y + 4, 8, 1, '#5a3518');
  R(x - 2 + Math.round(Math.sin(G.t * 3) * 2), y + 9, 52, 1, 'rgba(200,235,255,.6)');
}
function drawItems(cam) {
  for (const it of G.items) {
    if (!it.alive || it.x < cam - 20 || it.x > cam + W + 20) continue;
    const bob = Math.round(Math.sin(G.t * 3 + (it.ph || 0)) * 2), x = it.x - cam;
    if (it.type === 'f') ctx.drawImage(Art.items.feather, Math.round(x - 4), Math.round(it.y - 8 + bob));
    else if (it.type === 'M') ctx.drawImage(Art.items.makhan, Math.round(x - 7), Math.round(it.y - 6));
    else if (it.type === 'H') { ctx.drawImage(Art.items.gold, Math.round(x - 7), Math.round(it.y - 6 + bob)); if (Math.floor(G.t * 4) % 2) R(x + 5, it.y - 8 + bob, 1, 3, '#fff'), R(x + 4, it.y - 7 + bob, 3, 1, '#fff'); }
    else if (it.type === 'o') ctx.drawImage(Art.items.pouch, Math.round(x - 6), Math.round(it.y - 5 + bob));
    else if (it.type === 'C') {
      ctx.drawImage(Art.items.diya, Math.round(x - 6), Math.round(it.y - 22));
      if (it.lit) {
        const fl = Math.floor(G.t * 10) % 3;
        ctx.fillStyle = 'rgba(255,200,90,.18)'; ctx.beginPath(); ctx.arc(x, it.y - 19, 12 + fl, 0, Math.PI * 2); ctx.fill();
        R(x - 1, it.y - 21 - fl, 2, 3 + fl, '#ffd45e'); R(x - 1, it.y - 19, 2, 2, '#ff8a2a'); R(x, it.y - 22 - fl, 1, 1, '#fff6c8');
      }
    }
  }
}
function drawEnemy(e, cam) {
  const fr = Math.floor(e.anim * (e.type === 'flyer' ? 8 : 6)) % 2;
  const set = e.flash > 0 ? Art.enemyW : Art.enemy;
  let img, x = e.x - cam, y = e.y;
  if (e.type === 'walker') { img = set.walker[e.stun > 0 ? 0 : fr]; x -= 2; y -= 2; }
  else if (e.type === 'flyer') { img = set.flyer[e.stun > 0 ? 0 : fr]; x -= 1; y -= 1; }
  else { img = set.thrower[e.armT > 0 ? 1 : 0]; x -= 2; }
  drawImgFlip(img, x, y, e.face);
  if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = G.t * 4 + i * 2.1; drawNote(x + 8 + Math.cos(a) * 8, y - 5 + Math.sin(a) * 2, '#ffd45e'); }
}
function drawNote(x, y, col) { x = Math.round(x); y = Math.round(y); R(x + 2, y - 4, 1, 5, col); R(x, y, 3, 2, col); R(x + 3, y - 4, 2, 1, col); }
function drawPlayer(cam) {
  const P = G.p;
  if (P.dead) {
    const a = Math.max(0, G.restT / 1.3);
    ctx.globalAlpha = a; drawImgFlip(Art.krishna.heavy, P.x - 3 - cam, P.y - 2, P.face); ctx.globalAlpha = 1;
    return;
  }
  if (P.inv > 0 && Math.floor(P.inv * 14) % 2 === 0) return;
  let pose = 'idle';
  if (P.fluteT > 0) pose = 'flute';
  else if (P.poseT > 0) pose = 'throw';
  else if (P.heavy) pose = 'heavy';
  else if (!P.onGround) pose = 'jump';
  else if (Math.abs(P.vx) > 12) pose = ['run1', 'run2', 'run3', 'run2'][Math.floor(P.animT * 11) % 4];
  const x = P.x - 3 - cam, y = P.y - 2;
  if (P.heavy) { ctx.fillStyle = `rgba(255,212,94,${0.25 + Math.sin(G.t * 10) * 0.1})`; ctx.beginPath(); ctx.ellipse(Math.round(x + 8), Math.round(y + 14), 13, 14, 0, 0, Math.PI * 2); ctx.fill(); }
  if (G.p.flute >= 100) { ctx.fillStyle = `rgba(120,200,255,${0.12 + Math.sin(G.t * 6) * 0.06})`; ctx.beginPath(); ctx.arc(Math.round(x + 8), Math.round(y + 12), 14, 0, Math.PI * 2); ctx.fill(); }
  drawImgFlip(Art.krishna[pose], x, y, P.face);
}
function drawEShot(s, cam) {
  const x = Math.round(s.x - cam), y = Math.round(s.y);
  if (s.type === 'rock') { R(x - 3, y - 3, 6, 6, '#7d7d7d'); R(x - 2, y - 3, 3, 2, '#b0b0b0'); R(x + 1, y + 1, 2, 2, '#555'); }
  else if (s.type === 'poison') { R(x - 2, y - 2, 4, 5, '#6fe04a'); R(x - 1, y - 4, 2, 2, '#6fe04a'); R(x - 1, y - 1, 1, 1, '#d8ffc8'); }
  else if (s.type === 'leaf') { R(x - 3, y - 1, 6, 3, '#4f8a3c'); R(x - 1, y - 2, 3, 1, '#6aa553'); R(x + 3, y, 2, 1, '#7a5030'); }
  else if (s.type === 'feather') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(s.vy, s.vx));
    ctx.fillStyle = '#e8ecf2'; ctx.fillRect(-6, -2, 10, 4); ctx.fillStyle = '#9aa4b5'; ctx.fillRect(-6, -1, 10, 1); ctx.fillStyle = '#d8343a'; ctx.fillRect(4, -1, 3, 2);
    ctx.restore();
  }
}
function drawParts(cam) {
  for (const p of G.parts) {
    const a = clamp(p.life / p.max, 0, 1), x = p.x - cam, y = p.y;
    ctx.globalAlpha = a;
    if (p.kind === 'glow') { R(x - p.size, y - p.size, p.size * 2, p.size * 2, p.col); ctx.globalAlpha = a * 0.3; R(x - p.size * 2, y - p.size * 2, p.size * 4, p.size * 4, p.col); }
    else if (p.kind === 'note') drawNote(x, y, p.col);
    else if (p.kind === 'orb') {
      for (let i = 4; i > 0; i--) { ctx.globalAlpha = a * 0.15; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(x, y, p.size + i * 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = a; ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    else R(x, y, p.w || p.size, p.size, p.col);
  }
  ctx.globalAlpha = 1;
  for (const r of G.rings) { if (r.delay > 0) continue; ctx.globalAlpha = clamp(r.life / r.max, 0, 1) * 0.8; ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x - cam, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

// ---------- Boss drawing ----------
function drawBoss(b, cam) {
  if (b.kind === 'putana') {
    const fr = Math.floor(G.t * 5) % 2;
    let x = b.x - cam - 4, y = b.y - 3;
    if (b.state === 'aim') x += rand(-1.5, 1.5);
    const img = (b.flash > 0 ? Art.putanaW : Art.putana)[fr];
    if (b.dying) ctx.globalAlpha = Math.max(0.2, 1 - b.dieT / 2.4);
    ctx.fillStyle = 'rgba(30,0,20,.25)'; ctx.beginPath(); ctx.ellipse(Math.round(b.x - cam + b.w / 2), GY + 2, 18, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, Math.round(x), Math.round(y));
    if (b.state === 'aim') { R(x + 21, y + 14, 2, 2, '#ffffff'); R(x + 25, y + 14, 2, 2, '#ffffff'); }
    ctx.globalAlpha = 1;
  } else if (b.kind === 'trina') drawTrina(b, cam);
  else drawBaka(b, cam);
  if (b.stun > 0) for (let i = 0; i < 4; i++) { const a = G.t * 3 + i * 1.6; drawNote(b.x - cam + b.w / 2 + Math.cos(a) * 18, b.y - 6 + Math.sin(a) * 3, '#ffd45e'); }
}
function drawTrina(b, cam) {
  const cx = b.x - cam + b.w / 2, base = b.y + b.h, dizzy = b.state === 'dizzy' || b.stun > 0;
  const sp = dizzy ? 3 : 14, fl = b.flash > 0;
  const cols = fl ? ['#ffffff', '#f0f0f0', '#e0e0e0'] : ['rgba(170,155,130,.9)', 'rgba(130,118,98,.9)', 'rgba(196,184,160,.9)'];
  if (b.dying) ctx.globalAlpha = Math.max(0.15, 1 - b.dieT / 2.4);
  ctx.fillStyle = 'rgba(30,20,10,.3)'; ctx.beginPath(); ctx.ellipse(Math.round(cx), GY + 1, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 11; i++) {
    const f = i / 10, yy = base - f * b.h, rx = 5 + f * f * 26, ry = 3 + f * 3;
    const off = Math.sin(G.t * sp * 0.5 + i * 0.8) * (2 + f * 5) + (dizzy ? Math.sin(G.t * 4) * 6 * f : 0);
    ctx.fillStyle = cols[(i + Math.floor(G.t * sp)) % 3];
    ctx.beginPath(); ctx.ellipse(Math.round(cx + off), Math.round(yy), rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    const sx = Math.cos(G.t * sp + i) * rx; ctx.fillRect(Math.round(cx + off + sx - 3), Math.round(yy - 1), 6, 1);
  }
  const fy = base - b.h * 0.68, fx = cx + Math.sin(G.t * sp * 0.5 + 7 * 0.8) * 5;
  if (dizzy) {
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1;
    [-7, 7].forEach(d => { ctx.beginPath(); for (let a = 0; a < 10; a += 0.5) { const rr = a * 0.45; ctx.lineTo(fx + d + Math.cos(a + G.t * 6) * rr, fy + Math.sin(a + G.t * 6) * rr); } ctx.stroke(); });
    R(fx - 4, fy + 8, 8, 2, '#3a2a1a');
  } else {
    R(fx - 11, fy - 3, 3, 1, '#2a1a0a'); R(fx - 8, fy - 2, 3, 1, '#2a1a0a'); R(fx + 5, fy - 2, 3, 1, '#2a1a0a'); R(fx + 8, fy - 3, 3, 1, '#2a1a0a');
    R(fx - 10, fy, 5, 3, '#ffd23a'); R(fx + 5, fy, 5, 3, '#ffd23a'); R(fx - 8, fy + 1, 2, 2, '#c81818'); R(fx + 6, fy + 1, 2, 2, '#c81818');
    R(fx - 6, fy + 7, 12, 3, '#3a1a0a'); R(fx - 4, fy + 7, 1, 2, '#fff'); R(fx + 3, fy + 7, 1, 2, '#fff');
  }
  for (let k = 0; k < 7; k++) {
    const a = G.t * sp * 0.35 + k * 0.9, f = 0.25 + (k % 4) * 0.2, rx = 8 + f * f * 26 + 6;
    const x = cx + Math.cos(a) * rx, y = base - f * b.h + Math.sin(a) * 3;
    R(x, y, k % 3 === 0 ? 4 : 3, 2, ['#4f8a3c', '#7a5030', '#8a8a8a', '#c9a26a'][k % 4]);
  }
  ctx.globalAlpha = 1;
}
function drawBaka(b, cam) {
  const fl = b.flash > 0, C = c => fl ? '#ffffff' : c;
  const cx = b.x - cam + b.w / 2, f = b.face, by = b.y;
  if (b.state === 'hunt' || b.state === 'rise' || b.state === 'dive') {
    const sx = (b.state === 'hunt' ? b.shadowX : b.x + b.w / 2) - cam, k = b.state === 'hunt' ? 0.5 + Math.sin(G.t * 12) * 0.2 : 0.6;
    ctx.fillStyle = `rgba(0,0,0,${k * 0.5})`; ctx.beginPath(); ctx.ellipse(Math.round(sx), GY + 1, 26, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (b.state === 'hunt') return;
  } else { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(Math.round(cx), GY + 1, 24, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  if (b.dying) ctx.globalAlpha = Math.max(0.15, 1 - b.dieT / 2.4);
  ctx.save(); ctx.translate(Math.round(cx), 0); ctx.scale(f, 1);
  const flying = b.state === 'rise' || b.state === 'dive';
  const legC = C('#e3833a');
  if (!flying) {
    const step = b.state === 'strut' ? Math.sin(G.t * 8) * 3 : 0;
    ctx.strokeStyle = legC; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5, by + 42); ctx.lineTo(-7 + step, by + 51); ctx.lineTo(-5 + step, GY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, by + 42); ctx.lineTo(7 - step, by + 51); ctx.lineTo(5 - step, GY); ctx.stroke();
    ctx.fillStyle = legC; ctx.fillRect(-9 + step, GY - 1, 8, 1); ctx.fillRect(1 - step, GY - 1, 8, 1);
  } else {
    ctx.strokeStyle = legC; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, by + 42); ctx.lineTo(-18, by + 56); ctx.moveTo(4, by + 42); ctx.lineTo(-12, by + 58); ctx.stroke();
  }
  ctx.fillStyle = C('#d8dde6'); ctx.beginPath(); ctx.moveTo(-18, by + 26); ctx.lineTo(-34, by + 38); ctx.lineTo(-16, by + 36); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C('#f2f4f7'); ctx.beginPath(); ctx.ellipse(0, by + 30, 22, 14, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C('#c9d0db'); ctx.beginPath(); ctx.ellipse(-2, by + 36, 18, 6, -0.1, 0, Math.PI * 2); ctx.fill();
  if (flying) {
    const flap = Math.sin(G.t * 16) * 22;
    ctx.fillStyle = C('#9aa4b5'); ctx.beginPath(); ctx.moveTo(-10, by + 24); ctx.lineTo(-40, by + 20 - flap); ctx.lineTo(-20, by + 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C('#5c6577'); ctx.beginPath(); ctx.moveTo(-30, by + 22 - flap * 0.8); ctx.lineTo(-44, by + 18 - flap); ctx.lineTo(-34, by + 28 - flap * 0.6); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = C('#9aa4b5'); ctx.beginPath(); ctx.ellipse(-6, by + 28, 15, 8, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C('#5c6577'); ctx.beginPath(); ctx.moveTo(-14, by + 24); ctx.lineTo(-30, by + 34); ctx.lineTo(-14, by + 32); ctx.closePath(); ctx.fill();
  }
  const hd = bakaHead(b), hx = (hd.x - cam - cx) * f, hy = hd.y;
  ctx.strokeStyle = C('#f2f4f7'); ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(12, by + 22); ctx.quadraticCurveTo(hx * 0.4 + 8, (by + 22 + hy) / 2 - 10 * (1 - (b.ext || 0)), hx, hy); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = C('#f2f4f7'); ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C('#d8343a'); ctx.fillRect(Math.round(hx - 6), Math.round(hy - 9), 7, 3); ctx.fillRect(Math.round(hx - 9), Math.round(hy - 8), 4, 2);
  ctx.fillStyle = C('#f0a020'); ctx.beginPath(); ctx.moveTo(hx + 5, hy - 2); ctx.lineTo(hx + 29, hy + 1); ctx.lineTo(hx + 5, hy + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C('#b86e10'); ctx.fillRect(Math.round(hx + 5), Math.round(hy + 1), 20, 1);
  ctx.fillStyle = C('#ff3b3b'); ctx.fillRect(Math.round(hx), Math.round(hy - 3), 3, 3);
  ctx.fillStyle = C('#ffef5a'); ctx.fillRect(Math.round(hx + 1), Math.round(hy - 2), 1, 1);
  if (b.state === 'peckWind' && Math.floor(G.t * 16) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(hx - 1), Math.round(hy - 4), 5, 5); }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------- HUD ----------
function drawHUD() {
  const P = G.p;
  for (let i = 0; i < P.maxH; i++) ctx.drawImage(i < P.hearts ? Art.items.heart : Art.items.heartE, 6 + i * 12, 6);
  ctx.drawImage(Art.items.pouch, 5, 18); text(`${P.marbles}`, 20, 24, 9, '#fff4d6', 'left');
  ctx.drawImage(Art.items.feather, 44, 16); text(`${P.feathers}/${G.totalFeathers}`, 55, 24, 9, '#fff4d6', 'left');
  // flute meter
  const fx = 6, fy = 35;
  R(fx, fy + 2, 10, 2, '#8a5a2b'); R(fx + 3, fy + 2, 1, 2, '#f6c744'); R(fx + 8, fy + 2, 1, 2, '#f6c744');
  R(fx + 13, fy, 52, 6, '#2a1424'); R(fx + 14, fy + 1, Math.round(50 * P.flute / 100), 4, P.flute >= 100 ? (Math.floor(G.t * 6) % 2 ? '#9fe0ff' : '#ffd45e') : '#4bb3e9');
  if (P.flute >= 100) text(isTouch ? '♫' : 'C', fx + 72, fy + 3, 8, '#ffd45e');
  // boss bar
  if (G.boss && G.bossStarted) {
    const b = G.boss, bw = 170, bx = W / 2 - bw / 2, byy = 12;
    text(TN(b.name), W / 2, byy - 4 + 2, 8, '#ffb3b3');
    R(bx - 1, byy + 3, bw + 2, 7, '#1a0a12'); R(bx, byy + 4, Math.round(bw * Math.max(0, b.hp) / b.max), 5, '#d8343a'); R(bx, byy + 4, Math.round(bw * Math.max(0, b.hp) / b.max), 1, '#ff8a8a');
    if (bossVulnerable(b) && b.kind === 'trina') text('★', bx + bw + 8, byy + 6, 8, '#ffd45e');
  }
  // banner
  if (G.banner) {
    const bn = G.banner, a = clamp(Math.min(bn.t, bn.max - bn.t) * 3, 0, 1);
    const lines = bn.title ? [bn.title, ...bn.lines] : bn.lines;
    const hgt = 8 + lines.length * 13, y0 = 58;
    ctx.globalAlpha = a * 0.75; R(40, y0, W - 80, hgt, '#140a24'); ctx.globalAlpha = a; R(40, y0, W - 80, 1, '#ffd45e'); R(40, y0 + hgt - 1, W - 80, 1, '#ffd45e');
    lines.forEach((l, i) => text(l, W / 2, y0 + 10 + i * 13, bn.title && i === 0 ? 11 : 9, bn.title && i === 0 ? '#ffb3b3' : (i === lines.length - 1 && lines.length > 1 && save.lang === 'both' ? '#ffe2a6' : '#fff4d6')));
    ctx.globalAlpha = 1;
  }
}
function renderTitleBg() {
  if (!G.titleBg) G.titleBg = { sky: Art.buildSky('gokul'), far: Art.buildFar('gokul'), mid: Art.buildMid('yamuna') };
  const t = performance.now() / 1000;
  ctx.drawImage(G.titleBg.sky, 0, 0);
  drawParallax(G.titleBg.far, 1, t * 4);
  drawParallax(G.titleBg.mid, 1, t * 10);
  R(0, 212, W, 60, '#3e8a2c'); R(0, 212, W, 3, '#62b043');
  drawImgFlip(Art.krishna.flute, 232, 188, 1);
  for (let i = 0; i < 3; i++) { const a = t * 1.3 + i * 2; drawNote(248 + Math.sin(a) * 10 + i * 8, 180 - ((t * 15 + i * 12) % 40), '#ffd45e'); }
}

// ---------- UI screens ----------
const UI = {
  el: document.getElementById('overlay'),
  show(html) { this.el.innerHTML = `<div class="panel">${html}</div>`; this.el.classList.remove('hidden'); const b = this.el.querySelector('button:not(:disabled)'); if (b && !isTouch) b.focus(); },
  hide() { this.el.classList.add('hidden'); this.el.innerHTML = ''; }
};
UI.el.addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  Sound.init(); Sound.resume(); Sound.sfx('select');
  const a = btn.dataset.act, v = btn.dataset.v;
  if (a === 'play') startFromMenu();
  else if (a === 'levels') showLevels();
  else if (a === 'howto') showHowTo();
  else if (a === 'title') showTitle();
  else if (a === 'lang') { save.lang = save.lang === 'both' ? 'en' : save.lang === 'en' ? 'hi' : 'both'; store(); showTitle(); }
  else if (a === 'sound') { save.sound = !save.sound; Sound.setEnabled(save.sound); store(); showTitle(); }
  else if (a === 'full') { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); try { screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }
  else if (a === 'story') showStory(+v);
  else if (a === 'begin') beginLevel(+v);
  else if (a === 'resume') resumeGame();
  else if (a === 'restart') { beginLevel(G.levelIdx); }
  else if (a === 'retry') respawnAfterRest();
  else if (a === 'next') showStory(G.levelIdx + 1);
  else if (a === 'feedback') window.open(CONFIG.feedbackUrl, '_blank');
});
function langLabel() { return save.lang === 'both' ? STR.langBoth.en : save.lang === 'en' ? STR.langEn.en : STR.langHi.en; }
function showTitle() {
  G.state = 'title'; G.lvl = null; pauseBtn.classList.remove('on');
  Sound.startMusic('title');
  const canFull = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  UI.show(`<h1>${STR.title.en}<span class="hi">${STR.title.hi}</span></h1>
    <div class="sub">${T('subtitle')}</div>
    <div class="btns">
      <button class="menu" data-act="play">${TB('play')}</button>
      <button class="menu" data-act="levels">${TB('levels')}</button>
      <button class="menu alt" data-act="howto">${TB('howto')}</button>
      <button class="menu alt" data-act="lang">${TB('lang')}: ${langLabel()}</button>
      <button class="menu alt" data-act="sound">${TB('sound')}: ${save.sound ? TB('on') : TB('off')}</button>
      ${canFull && isTouch ? `<button class="menu alt" data-act="full">${TB('full')}</button>` : ''}
    </div>
    <div class="small">Demo v0.1 · Jai Shri Krishna 🙏</div>`);
}
function startFromMenu() { showStory(Math.min(save.unlocked, LEVELS.length) - 1); }
function showLevels() {
  const cards = CHAPTERS.map((c, i) => {
    const locked = i + 1 > save.unlocked, best = save.best[i];
    return `<button class="menu chap ${locked ? 'alt' : ''}" data-act="story" data-v="${i}" ${locked ? 'disabled' : ''}>
      <b>${TB('chapter')} ${i + 1}</b>${TN(c.boss)}<br><small>${locked ? TB('locked') : (best != null ? '🪶 ' + best : '')}</small></button>`;
  }).join('');
  UI.show(`<h2>${TB('levels')}</h2><div class="chapters">${cards}</div><div class="btns"><button class="menu alt" data-act="title">${TB('back')}</button></div>`);
}
function showHowTo() {
  const k = isTouch
    ? [['◀ ▶', 'hMove'], ['▲', 'hJump'], ['●', 'hThrow'], ['♫', 'hFlute'], ['▼', 'hHeavy'], ['II', 'hPause']]
    : [['← →  /  A D', 'hMove'], ['Space / ↑ / W', 'hJump'], ['X / J', 'hThrow'], ['C / K', 'hFlute'], ['↓ / S', 'hHeavy'], ['P / Esc', 'hPause']];
  UI.show(`<h2>${TB('howto')}</h2><div class="keys">${k.map(([a, b]) => `<span>${a}</span><span>${TB(b)}</span>`).join('')}</div>
    <div class="story" style="font-size:calc(var(--s)*7.4px)">${T('hItems')}</div>
    <div class="btns"><button class="menu" data-act="title">${TB('back')}</button></div>`);
}
function showStory(i) {
  if (i >= LEVELS.length) { showDemoEnd(); return; }
  G.state = 'story'; pauseBtn.classList.remove('on');
  const c = CHAPTERS[i];
  UI.show(`<h2>${TB('chapter')} ${i + 1}: ${TN(c.boss)}</h2>
    <div class="sub">${TN(c.place)}</div>
    <div class="story">${T(c.story)}</div>
    <div class="btns"><button class="menu" data-act="begin" data-v="${i}">${TB('start')}</button><button class="menu alt" data-act="title">${TB('menu')}</button></div>`);
}
function beginLevel(i) {
  loadLevel(i);
  UI.hide(); G.state = 'play'; G.t = 0; pauseBtn.classList.add('on');
  Input.down = {}; Input.hits.clear();
  Sound.startMusic(G.lvl.music);
}
function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'paused'; Sound.stopMusic(); Input.down = {};
  UI.show(`<h2>${TB('paused')}</h2><div class="btns" style="flex-direction:column;align-items:center">
    <button class="menu" data-act="resume">${TB('resume')}</button>
    <button class="menu alt" data-act="restart">${TB('restart')}</button>
    <button class="menu alt" data-act="title">${TB('menu')}</button></div>`);
}
function resumeGame() { UI.hide(); G.state = 'play'; Sound.startMusic(G.bossStarted && !G.bossDone ? 'boss' : G.lvl.music); }
function showRest() {
  G.state = 'rest'; pauseBtn.classList.remove('on');
  UI.show(`<h2>🙏</h2><div class="story">${T('rest')}</div>
    <div class="btns"><button class="menu" data-act="retry">${TB('tryAgain')}</button><button class="menu alt" data-act="title">${TB('menu')}</button></div>`);
}
function levelComplete() {
  const i = G.levelIdx;
  G.state = 'complete'; pauseBtn.classList.remove('on');
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, i + 2));
  if (i === LEVELS.length - 1) save.finished = true;
  save.best[i] = Math.max(save.best[i] || 0, G.p.feathers); store();
  Sound.startMusic('title');
  const last = i === LEVELS.length - 1;
  UI.show(`<h2>✨ ${TN(CHAPTERS[i].boss)} ✨</h2>
    <div class="story">${T(CHAPTERS[i].moksha)}</div>
    <div class="stat">🪶 ${G.p.feathers} / ${G.totalFeathers} · ${TB('feathers')}</div>
    <div class="btns"><button class="menu" data-act="next">${last ? TB('demoTitle') : TB('next')}</button><button class="menu alt" data-act="title">${TB('menu')}</button></div>`);
}
function showDemoEnd() {
  G.state = 'end'; pauseBtn.classList.remove('on'); G.lvl = null;
  UI.show(`<h1>${STR.demoTitle.en}<span class="hi">${STR.demoTitle.hi}</span></h1>
    <div class="story" style="margin-top:calc(var(--s)*8px)">${T('demoEnd')}</div>
    <div class="btns">${CONFIG.feedbackUrl ? `<button class="menu" data-act="feedback">${TB('feedback')}</button>` : ''}<button class="menu alt" data-act="title">${TB('menu')}</button></div>`);
}

// ---------- Loop ----------
let last = performance.now(), acc = 0;
function frame(now) {
  let d = (now - last) / 1000; last = now;
  if (d > 0.1) d = 0.1;
  acc += d;
  while (acc >= STEP) { update(STEP); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}
showTitle();
requestAnimationFrame(frame);
