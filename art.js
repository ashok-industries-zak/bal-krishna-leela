'use strict';
// All visuals are generated as pixel art at runtime (no image files needed).
const Art = (() => {
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function sprite(w, h, fn) { const c = mk(w, h); const g = c.getContext('2d'); const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }; fn(R, g); return c; }
  function white(src) { const c = mk(src.width, src.height); const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); return c; }

  // ---------- Krishna ----------
  const K = { SK:'#3f72dc', SKD:'#2b51a8', SKL:'#6d98f2', HAIR:'#1b1424', GOLD:'#f6c744', GOLDD:'#c48a1c', FG:'#1f9e5a', FB:'#2563d6', FE:'#0b2560',
    DH:'#ffd02e', DHD:'#e39b12', BORD:'#d8452a', RED:'#d8322f', WH:'#fff6e0', ORG:'#f28c28', FLUTE:'#8a5a2b' };
  function kBase(R) {
    R(4,0,1,1,K.FG); R(3,1,3,1,K.FG); R(4,1,1,1,K.FB); R(3,2,1,1,K.FG); R(4,2,1,1,K.FE); R(5,2,1,1,K.FG); R(4,3,1,1,K.FG); // mor pankh
    R(5,3,7,1,K.GOLD); R(7,2,3,1,K.GOLD); R(8,1,1,1,K.GOLD); R(8,3,1,1,K.RED); R(4,4,8,1,K.GOLDD); // mukut
    R(4,5,3,1,K.HAIR); R(4,6,2,4,K.HAIR); R(3,6,1,4,K.HAIR); R(4,10,1,1,K.HAIR);
    R(7,5,5,1,K.SK); R(6,6,6,4,K.SK); R(12,7,1,2,K.SK); R(7,10,4,1,K.SKD);
    R(9,5,1,1,K.RED); R(9,6,2,1,K.HAIR); R(9,7,1,1,K.WH); R(10,7,1,1,'#120c18'); R(10,9,2,1,'#b02a34'); R(6,9,1,2,K.GOLD);
    R(7,11,3,1,K.SKD); R(5,12,6,4,K.SK); R(5,12,1,4,K.SKD); R(10,13,1,2,K.SKL);
    R(5,12,1,1,K.RED); R(10,12,1,1,K.RED); R(6,13,1,1,K.WH); R(9,13,1,1,K.WH); R(7,14,1,1,K.ORG); R(8,14,1,1,K.RED); R(7,15,2,1,K.GOLD);
    R(5,16,6,1,K.GOLD); R(4,17,8,3,K.DH); R(7,17,2,3,K.DHD); R(4,20,8,1,K.BORD);
  }
  const legs = {
    idle: R => { R(5,21,2,2,K.SK); R(9,21,2,2,K.SK); R(5,22,2,1,K.GOLD); R(9,22,2,1,K.GOLD); R(5,23,3,1,K.SKD); R(9,23,3,1,K.SKD); },
    runA: R => { R(4,21,2,1,K.SK); R(3,22,2,1,K.GOLD); R(1,23,3,1,K.SKD); R(10,21,2,1,K.SK); R(11,22,2,1,K.GOLD); R(12,23,3,1,K.SKD); },
    runB: R => { R(6,21,2,2,K.SK); R(6,22,2,1,K.GOLD); R(6,23,3,1,K.SKD); R(9,21,2,1,K.SK); R(9,22,2,1,K.GOLD); },
    jump: R => { R(4,21,2,1,K.SK); R(3,22,2,1,K.GOLD); R(9,21,3,1,K.SK); R(11,22,1,1,K.GOLD); R(11,23,2,1,K.SKD); },
    crouch: R => { R(4,21,3,1,K.SK); R(9,21,3,1,K.SK); R(4,22,3,1,K.GOLD); R(9,22,3,1,K.GOLD); R(3,23,4,1,K.SKD); R(9,23,4,1,K.SKD); }
  };
  const arms = {
    idle: R => { R(4,12,1,4,K.SKD); R(4,15,1,1,K.GOLD); R(11,12,1,4,K.SK); R(11,15,1,1,K.GOLD); },
    swingA: R => { R(4,12,1,2,K.SKD); R(3,14,1,2,K.SKD); R(3,15,1,1,K.GOLD); R(11,12,1,2,K.SK); R(12,13,1,2,K.SK); R(12,14,1,1,K.GOLD); },
    swingB: R => { R(4,12,1,2,K.SKD); R(5,14,1,2,K.SKD); R(5,15,1,1,K.GOLD); R(11,12,1,3,K.SK); R(10,15,1,1,K.GOLD); },
    up: R => { R(4,10,1,3,K.SKD); R(4,10,1,1,K.GOLD); R(11,10,1,3,K.SK); R(12,9,1,2,K.SK); R(12,9,1,1,K.GOLD); },
    throw: R => { R(4,12,1,4,K.SKD); R(4,15,1,1,K.GOLD); R(11,12,4,1,K.SK); R(14,12,1,1,K.GOLD); R(12,11,1,1,K.SK); },
    flute: R => { R(4,12,1,3,K.SKD); R(8,9,8,1,K.FLUTE); R(10,9,1,1,K.GOLD); R(14,9,1,1,K.GOLD); R(15,9,1,1,K.RED);
      R(9,10,2,1,K.SK); R(12,10,2,1,K.SK); R(11,11,2,1,K.SK); R(10,12,1,1,K.SK); R(5,11,3,1,K.SKD); }
  };
  const POSES = {
    idle: ['idle','idle'], run1: ['swingA','runA'], run2: ['idle','runB'], run3: ['swingB','runA'],
    jump: ['up','jump'], throw: ['throw','idle'], flute: ['flute','idle'], heavy: ['idle','crouch']
  };
  const krishna = {};
  for (const p in POSES) krishna[p] = sprite(16, 24, R => { kBase(R); arms[POSES[p][0]](R); legs[POSES[p][1]](R); });

  // ---------- Small asuras ----------
  function walkerFrame(f) {
    return sprite(16, 16, R => {
      const SK = '#a8323a', DK = '#6e1f26', HN = '#f1e3c0';
      R(4,0,1,2,HN); R(11,0,1,2,HN); R(5,2,1,1,HN); R(10,2,1,1,HN);
      R(4,3,8,6,SK); R(4,8,8,1,DK); R(3,4,1,3,SK); R(12,4,1,3,SK);
      R(6,4,2,1,'#3a0d10'); R(9,4,2,1,'#3a0d10');
      R(6,5,2,2,'#fff'); R(9,5,2,2,'#fff'); R(7,6,1,1,'#000'); R(10,6,1,1,'#000');
      R(6,8,4,1,'#3a0d10'); R(7,8,1,1,'#fff'); R(9,8,1,1,'#fff');
      R(5,9,6,4,SK); R(6,10,4,2,'#c24a50');
      R(5,12,6,1,'#e2b13c'); R(5,13,6,1,'#3b2a1a');
      R(3,10,2,2,SK); R(11,10,2,2,SK); R(13,7,1,6,'#7a4a24'); R(12,6,3,2,'#7a4a24'); // club
      if (f === 0) { R(5,14,2,2,DK); R(9,14,2,2,DK); } else { R(4,14,2,2,DK); R(10,14,2,1,DK); R(10,15,2,1,DK); }
    });
  }
  function flyerFrame(f) {
    return sprite(16, 12, R => {
      const B = '#2b1d3d', W = '#4a3268';
      R(4,4,8,5,B); R(10,2,4,5,B); R(12,3,1,1,'#ff3b3b'); R(14,4,2,1,'#e0a030'); R(14,5,1,1,'#b97b1e');
      R(1,5,3,2,B); R(0,6,1,1,B);
      if (f === 0) { R(4,0,6,4,W); R(5,0,2,1,'#6a4a90'); } else { R(4,8,6,3,W); R(5,10,2,1,'#6a4a90'); }
      R(6,9,1,2,'#c88a2a'); R(9,9,1,2,'#c88a2a');
    });
  }
  function throwerFrame(f) {
    return sprite(16, 20, R => {
      const SK = '#4f8a3c', DK = '#2f5a24', HN = '#efe2c0';
      R(3,0,2,3,HN); R(11,0,2,3,HN);
      R(4,2,8,7,SK); R(4,3,8,1,DK);
      R(5,4,2,2,'#ffe14d'); R(9,4,2,2,'#ffe14d'); R(6,5,1,1,'#000'); R(10,5,1,1,'#000');
      R(5,7,6,1,'#1a0d06'); R(5,6,1,2,'#fff'); R(10,6,1,2,'#fff');
      R(3,9,10,6,SK); R(5,10,6,4,'#6aa553'); R(3,14,10,1,'#e2b13c'); R(4,15,8,2,'#5a3a1a');
      R(4,17,3,3,DK); R(9,17,3,3,DK);
      R(1,10,2,4,SK);
      if (f === 0) R(13,10,2,4,SK); else { R(13,3,2,7,SK); R(12,1,4,3,'#8a8a8a'); R(13,1,1,1,'#bdbdbd'); }
    });
  }
  const enemy = { walker: [walkerFrame(0), walkerFrame(1)], flyer: [flyerFrame(0), flyerFrame(1)], thrower: [throwerFrame(0), throwerFrame(1)] };
  const enemyW = {}; for (const k in enemy) enemyW[k] = enemy[k].map(white);

  // ---------- Putana ----------
  function putanaFrame(f) {
    return sprite(44, 52, R => {
      const H = '#1b1b2a', SK = '#a7b98f', SKD = '#7f9168', SARI = '#8e1a3a', SARID = '#5a1028', G = '#f2c13c';
      R(8,2,28,6,H); R(5,6,34,10,H); R(3,14,8,18,H); R(33,14,8,18,H);
      if (f === 0) { R(1,30,6,6,H); R(37,32,5,5,H); R(2,36,3,3,H); } else { R(3,31,5,7,H); R(36,30,6,5,H); R(39,35,3,3,H); }
      R(15,8,14,14,SK); R(14,10,1,10,SK); R(29,10,1,10,SK); R(17,22,10,2,SK); R(15,20,14,2,SKD);
      R(15,8,14,3,H); R(21,11,2,1,H);
      R(21,12,2,1,'#c8102e');
      R(16,13,4,1,H); R(24,13,4,1,H);
      R(17,14,4,2,'#ffef9a'); R(23,14,4,2,'#ffef9a'); R(18,14,2,2,'#e01818'); R(24,14,2,2,'#e01818');
      R(21,16,2,3,SKD); R(23,18,2,2,G);
      R(18,20,8,2,'#3a0b14'); R(19,21,1,2,'#fff'); R(24,21,1,2,'#fff');
      R(13,18,2,4,G); R(29,18,2,4,G);
      R(19,24,6,3,SK); R(16,26,12,2,G); R(19,27,2,1,'#d0213c'); R(23,27,2,1,'#2fa8d8');
      R(13,28,18,7,SARID); R(26,26,5,12,'#b0244a');
      R(5,28,9,4,SK); R(30,28,9,4,SK); R(9,28,1,4,G); R(34,28,1,4,G);
      R(2,27,4,6,SK); R(38,27,4,6,SK);
      R(1,27,1,2,'#2a1a1a'); R(1,30,1,2,'#2a1a1a'); R(42,27,1,2,'#2a1a1a'); R(42,30,1,2,'#2a1a1a');
      R(12,35,20,10,SARI); R(12,35,20,1,G); R(14,45,16,4,SARI); R(12,44,20,1,G);
      if (f === 0) { R(14,49,3,3,SARI); R(19,49,3,2,SARI); R(25,49,3,3,SARI); }
      else { R(16,49,3,2,SARI); R(21,49,3,3,SARI); R(27,49,2,2,SARI); }
    });
  }
  const putana = [putanaFrame(0), putanaFrame(1)];
  const putanaW = putana.map(white);

  // ---------- Items ----------
  const items = {
    feather: sprite(9, 16, R => {
      const G = '#1f8f4e', GL = '#35b86a', GO = '#e8c33a', BL = '#1b5fd0';
      R(3,1,3,1,G); R(2,2,5,7,G); R(1,4,1,3,GL); R(7,4,1,3,GL); R(3,9,3,2,G); R(4,11,1,1,G);
      R(4,6,1,10,'#d9c48a');
      R(3,2,3,1,GO); R(2,3,1,3,GO); R(6,3,1,3,GO); R(3,6,3,1,GO);
      R(3,3,3,3,BL); R(4,4,1,1,'#0a1f4f');
    }),
    makhan: sprite(14, 14, R => {
      R(4,0,6,2,'#fff8dc'); R(3,1,8,1,'#fff3c4'); R(9,2,1,2,'#fff8dc');
      R(3,2,8,1,'#c8742a'); R(4,3,6,2,'#9c5418');
      R(2,5,10,7,'#b5651d'); R(1,6,12,5,'#b5651d'); R(3,12,8,1,'#8a4a14'); R(3,6,1,3,'#d68a3c');
      R(1,8,12,1,'#e6c27a'); R(5,9,1,1,'#fff3c4'); R(8,9,1,1,'#fff3c4');
    }),
    gold: sprite(14, 14, R => {
      R(4,0,6,2,'#fffbe8'); R(3,1,8,1,'#fff3c4');
      R(3,2,8,1,'#ffe07a'); R(4,3,6,2,'#d9a21e');
      R(2,5,10,7,'#f2c13c'); R(1,6,12,5,'#f2c13c'); R(3,12,8,1,'#b5800f'); R(3,6,1,3,'#fff1a8');
      R(1,8,12,1,'#d0213c'); R(6,9,2,2,'#2fa8d8');
    }),
    pouch: sprite(12, 12, R => {
      R(4,0,1,1,'#e94b4b'); R(6,0,1,1,'#4bb3e9'); R(8,1,1,1,'#f2d24b');
      R(4,1,5,2,'#7d4fb0'); R(4,3,5,1,'#e8c33a');
      R(3,4,7,7,'#6a3d9a'); R(2,6,9,4,'#6a3d9a'); R(4,5,1,3,'#9370c8'); R(3,11,7,1,'#4b2a70');
    }),
    heart: sprite(9, 8, R => {
      R(1,0,3,1,'#e8344a'); R(5,0,3,1,'#e8344a'); R(0,1,9,3,'#e8344a'); R(1,4,7,1,'#e8344a'); R(2,5,5,1,'#e8344a'); R(3,6,3,1,'#e8344a'); R(4,7,1,1,'#e8344a');
      R(1,1,2,1,'#ff9aa8'); R(6,4,1,1,'#a81c2e'); R(5,5,1,1,'#a81c2e');
    }),
    heartE: sprite(9, 8, R => {
      const C = '#5a3048';
      R(1,0,3,1,C); R(5,0,3,1,C); R(0,1,9,3,C); R(1,4,7,1,C); R(2,5,5,1,C); R(3,6,3,1,C); R(4,7,1,1,C);
      R(1,1,3,2,'#2a1424'); R(5,1,3,2,'#2a1424');
    }),
    diya: sprite(12, 22, R => {
      R(5,8,2,12,'#9c8f7a'); R(4,8,1,12,'#7d715e'); R(3,19,6,1,'#7d715e'); R(2,20,8,2,'#6b5f50');
      R(2,6,8,2,'#c8742a'); R(3,8,6,1,'#9c5418'); R(1,6,1,1,'#c8742a'); R(10,6,1,1,'#c8742a');
    })
  };

  // ---------- Themes ----------
  const THEMES = {
    gokul: { sky:['#2b1a4f','#6e3a72','#e57d5a','#ffd08a'], sun:{x:360,y:150,r:24,c:'#fff0b0'}, hill1:'#6b4a8a', hill2:'#523873',
      grass:'#62b043', grassD:'#3e8a2c', dirt:'#8b5a33', dirtD:'#6a4224', dirtL:'#a8703f', plank:'#a0682f', plankD:'#6e4520', tint:null },
    storm: { sky:['#120c22','#2a2042','#4f3d62','#7f6a7c'], hill1:'#3a2e4f', hill2:'#2a2140',
      grass:'#4f7d3a', grassD:'#365e28', dirt:'#6b4a3a', dirtD:'#4c3328', dirtL:'#7f5a46', plank:'#7d5a3a', plankD:'#553b25', tint:'rgba(20,10,40,.25)' },
    yamuna: { sky:['#3f8fd0','#7cc3e8','#bfe3ee','#f7e8bf'], sun:{x:90,y:56,r:15,c:'#fffbe0'}, hill1:'#5f9a7a', hill2:'#4a8066',
      grass:'#6cbf4a', grassD:'#4a9a35', dirt:'#c99a5c', dirtD:'#a2773f', dirtL:'#e0b77a', plank:'#8a5a2b', plankD:'#5e3c1c', tint:null }
  };

  function ell(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
  function buildSky(theme) {
    const th = THEMES[theme], c = mk(480, 272), g = c.getContext('2d'), r = rng(11);
    const grd = g.createLinearGradient(0, 0, 0, 220);
    th.sky.forEach((col, i) => grd.addColorStop(i / (th.sky.length - 1), col));
    g.fillStyle = grd; g.fillRect(0, 0, 480, 272);
    if (th.sun) {
      for (let i = 5; i > 0; i--) ell(g, th.sun.x, th.sun.y, th.sun.r + i * 9, th.sun.r + i * 9, `rgba(255,236,170,${0.05})`);
      ell(g, th.sun.x, th.sun.y, th.sun.r, th.sun.r, th.sun.c);
    }
    if (theme === 'gokul') {
      for (let i = 0; i < 9; i++) ell(g, r() * 480, 40 + r() * 100, 30 + r() * 50, 3 + r() * 3, 'rgba(255,190,170,.35)');
      g.fillStyle = '#2b1a3a';
      for (let i = 0; i < 6; i++) { const x = 300 + r() * 120, y = 70 + r() * 40; g.fillRect(x, y, 2, 1); g.fillRect(x + 2, y - 1, 1, 1); g.fillRect(x - 1, y - 1, 1, 1); }
    } else if (theme === 'storm') {
      for (let i = 0; i < 40; i++) ell(g, r() * 480, 20 + r() * 120, 30 + r() * 70, 8 + r() * 14, `rgba(${10 + r() * 30},${8 + r() * 20},${30 + r() * 30},.45)`);
      g.strokeStyle = 'rgba(160,140,190,.25)'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(240, 70, 30 + i * 22, Math.PI * (0.1 + i * 0.3), Math.PI * (0.9 + i * 0.3)); g.stroke(); }
    } else {
      for (let i = 0; i < 7; i++) { const x = r() * 480, y = 30 + r() * 70; for (let k = 0; k < 5; k++) ell(g, x + k * 9 - 18, y - (k % 2) * 5, 10 + r() * 6, 7 + r() * 3, 'rgba(255,255,255,.85)'); }
    }
    return c;
  }
  function hillPoly(g, w, base, amps, col, phase) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 272);
    for (let x = 0; x <= w; x += 2) {
      let y = base; amps.forEach(([a, k], i) => { y -= a * Math.sin((x / w) * Math.PI * 2 * k + phase + i); });
      g.lineTo(x, y);
    }
    g.lineTo(w, 272); g.closePath(); g.fill();
  }
  function buildFar(theme) {
    const th = THEMES[theme], w = 640, c = mk(w, 272), g = c.getContext('2d'), r = rng(23);
    if (theme === 'yamuna') {
      hillPoly(g, w, 160, [[10, 3], [6, 7], [3, 13]], th.hill1, 0.3);
      for (let i = 0; i < 40; i++) ell(g, r() * w, 150 + r() * 12, 8 + r() * 8, 6 + r() * 5, th.hill2);
      const grd = g.createLinearGradient(0, 168, 0, 215); grd.addColorStop(0, '#5aa6dc'); grd.addColorStop(1, '#2a5f9e');
      g.fillStyle = grd; g.fillRect(0, 168, w, 60);
      g.fillStyle = '#9fd3f2'; for (let i = 0; i < 70; i++) g.fillRect(Math.floor(r() * w), Math.floor(172 + r() * 36), 4 + Math.floor(r() * 10), 1);
      for (let i = 0; i < 18; i++) { const x = r() * w, y = 196 + r() * 12; ell(g, x, y, 6, 2, '#3f8a4a'); if (r() < .6) { g.fillStyle = '#ff8fb8'; g.fillRect(Math.floor(x) - 1, Math.floor(y) - 3, 3, 2); g.fillStyle = '#ffd1e2'; g.fillRect(Math.floor(x), Math.floor(y) - 4, 1, 1); } }
    } else {
      hillPoly(g, w, 175, [[22, 1], [10, 3], [4, 7]], th.hill1, 0.8);
      hillPoly(g, w, 196, [[12, 2], [7, 5], [3, 11]], th.hill2, 2.1);
      const tc = theme === 'storm' ? '#241b36' : '#45305f';
      for (let i = 0; i < 26; i++) { const x = r() * w; ell(g, x, 186 + r() * 8, 5 + r() * 4, 6 + r() * 4, tc); g.fillStyle = tc; g.fillRect(Math.floor(x), 190, 2, 10); }
    }
    return c;
  }
  function hut(g, x, base, s, th, dark) {
    const wall = dark ? '#6e4c38' : '#c4844a', wallD = dark ? '#553a2b' : '#9c6233', roof = dark ? '#4e3a28' : '#8a5a2b', roofL = dark ? '#62492f' : '#b07a3e';
    const w = 34 * s, h = 18 * s;
    g.fillStyle = wall; g.fillRect(x, base - h, w, h);
    g.fillStyle = wallD; g.fillRect(x, base - 4, w, 4);
    g.fillStyle = '#3a2516'; g.fillRect(x + w / 2 - 4 * s, base - 12 * s, 8 * s, 12 * s);
    g.fillStyle = dark ? '#8a6a4a' : '#f4e2c0'; for (let i = 0; i < 4; i++) g.fillRect(x + 3 + i * 8 * s, base - h + 5, 2, 2); // rangoli dots
    g.fillStyle = roof; g.beginPath(); g.moveTo(x - 6 * s, base - h + 2); g.lineTo(x + w / 2, base - h - 18 * s); g.lineTo(x + w + 6 * s, base - h + 2); g.closePath(); g.fill();
    g.strokeStyle = roofL; g.lineWidth = 1;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x + w / 2, base - h - 18 * s); g.lineTo(x - 6 * s + i * (w + 12 * s) / 6, base - h + 2); g.stroke(); }
  }
  function kadamba(g, x, base, s, dark, bend) {
    g.fillStyle = dark ? '#3a281c' : '#5a3a22'; g.fillRect(x - 3, base - 40 * s, 6, 40 * s);
    g.fillRect(x - 10 * s + bend * .3, base - 34 * s, 10 * s, 3);
    const cols = dark ? ['#1d3a26', '#264a30'] : ['#2f6b3a', '#3d8048'];
    const pts = [[0, -52], [-14, -44], [14, -44], [-8, -60], [8, -58], [0, -40]];
    pts.forEach((p, i) => ell(g, x + p[0] * s + bend * (0.5 + i * .1), base + p[1] * s, 13 * s, 10 * s, cols[i % 2]));
    if (!dark) { g.fillStyle = '#f2b134'; const rr = rng(Math.floor(x)); for (let i = 0; i < 14; i++) g.fillRect(Math.floor(x + (rr() - .5) * 34 * s + bend * .6), Math.floor(base - 40 * s - rr() * 26 * s), 2, 2); }
  }
  function cow(g, x, base, face) {
    g.save(); g.translate(x, 0); g.scale(face, 1);
    g.fillStyle = '#f2ece0'; g.fillRect(-10, base - 14, 20, 8); g.fillRect(-6, base - 16, 6, 3); // hump
    g.fillStyle = '#b07a4a'; g.fillRect(-6, base - 13, 5, 4); g.fillRect(3, base - 12, 4, 3);
    g.fillStyle = '#e2d8c8'; g.fillRect(-9, base - 6, 2, 6); g.fillRect(-4, base - 6, 2, 6); g.fillRect(3, base - 6, 2, 6); g.fillRect(7, base - 6, 2, 6);
    g.fillStyle = '#f2ece0'; g.fillRect(10, base - 16, 6, 6); g.fillStyle = '#d8c6a8'; g.fillRect(11, base - 18, 1, 2); g.fillRect(15, base - 18, 1, 2);
    g.fillStyle = '#222'; g.fillRect(14, base - 14, 1, 1);
    g.fillStyle = '#d0213c'; g.fillRect(10, base - 11, 3, 1);
    g.fillStyle = '#c9bfae'; g.fillRect(-12, base - 13, 2, 7);
    g.restore();
  }
  function peacock(g, x, y) {
    g.fillStyle = '#1f6f8f'; for (let i = 0; i < 9; i++) g.fillRect(x - 22 + i * 2, y + 2 + Math.abs(4 - i), 2, 3);
    g.fillStyle = '#1a8f4e'; g.fillRect(x - 24, y + 2, 18, 4);
    g.fillStyle = '#e8c33a'; for (let i = 0; i < 5; i++) g.fillRect(x - 22 + i * 4, y + 3, 1, 1);
    g.fillStyle = '#1d4fc8'; g.fillRect(x - 6, y - 2, 8, 6); g.fillRect(x, y - 8, 3, 7); g.fillRect(x + 1, y - 10, 3, 3);
    g.fillStyle = '#e0a030'; g.fillRect(x + 4, y - 9, 2, 1);
    g.fillStyle = '#1d4fc8'; g.fillRect(x + 1, y - 13, 1, 3); g.fillRect(x + 3, y - 13, 1, 3);
  }
  function buildMid(theme) {
    const th = THEMES[theme], w = 768, c = mk(w, 272), g = c.getContext('2d'), r = rng(31), base = 214;
    if (theme === 'gokul') {
      g.strokeStyle = '#6e4520'; g.lineWidth = 1;
      for (let x = 0; x < w; x += 12) { g.fillStyle = '#7a5030'; g.fillRect(x, base - 12, 2, 12); }
      g.fillStyle = '#7a5030'; g.fillRect(0, base - 10, w, 1); g.fillRect(0, base - 5, w, 1);
      [[40, 1], [260, 1.1], [520, 0.95]].forEach(([x, s]) => hut(g, x, base, s, th, false));
      [[150, 1.1], [380, 1.2], [640, 1]].forEach(([x, s]) => kadamba(g, x, base, s, false, 0));
      [[200, 1], [460, -1], [600, 1], [710, -1]].forEach(([x, f]) => cow(g, x, base, f));
    } else if (theme === 'storm') {
      [[60, .9], [330, 1], [600, 1.05]].forEach(([x, s]) => hut(g, x, base, s, th, true));
      [[180, 1.1], [450, 1.2], [700, 1]].forEach(([x, s]) => kadamba(g, x, base, s, true, 16));
      g.fillStyle = '#3b2a20'; for (let i = 0; i < 30; i++) g.fillRect(Math.floor(r() * w), Math.floor(120 + r() * 80), 3, 1);
    } else {
      [[90, 1.15], [330, 1.25], [560, 1.05]].forEach(([x, s]) => kadamba(g, x, base, s, false, 0));
      peacock(g, 342, base - 74);
      [[200, 1], [470, -1], [700, 1]].forEach(([x, f]) => cow(g, x, base, f));
      g.fillStyle = '#4f8a3a'; for (let i = 0; i < 80; i++) { const x = Math.floor(r() * w), hgt = 6 + Math.floor(r() * 12); g.fillRect(x, base - hgt, 1, hgt); }
      g.fillStyle = '#8a6a3a'; for (let i = 0; i < 12; i++) { const x = Math.floor(r() * w); g.fillRect(x, base - 18, 2, 5); }
    }
    return c;
  }

  // ---------- Tiles ----------
  function buildTiles(def) {
    const th = THEMES[def.theme], c = mk(def.w * 16, 272), g = c.getContext('2d'), r = rng(42 + def.w);
    const grid = def.grid, at = (x, y) => (x < 0 || x >= def.w) ? '#' : (y < 0 || y >= 17) ? '.' : grid[y][x];
    const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    for (let x = 0; x < def.w; x++) {
      let hasGround = false; for (let y = 12; y < 17; y++) if (at(x, y) === '#') hasGround = true;
      if (!hasGround) { const grd = g.createLinearGradient(0, 200, 0, 272); grd.addColorStop(0, 'rgba(20,10,8,0)'); grd.addColorStop(1, 'rgba(20,10,8,.85)'); g.fillStyle = grd; g.fillRect(x * 16, 200, 16, 72); }
    }
    for (let y = 0; y < 17; y++) for (let x = 0; x < def.w; x++) {
      const ch = grid[y][x], px = x * 16, py = y * 16;
      if (ch === '#') {
        F(px, py, 16, 16, th.dirt);
        for (let i = 0; i < 4; i++) F(px + Math.floor(r() * 15), py + Math.floor(r() * 15), 2, 1, th.dirtD);
        for (let i = 0; i < 2; i++) F(px + Math.floor(r() * 15), py + Math.floor(r() * 15), 1, 1, th.dirtL);
        if (at(x - 1, y) !== '#') F(px, py, 1, 16, th.dirtD);
        if (at(x + 1, y) !== '#') F(px + 15, py, 1, 16, th.dirtD);
        if (at(x, y + 1) !== '#' && y < 16) F(px, py + 15, 16, 1, th.dirtD);
        if (at(x, y - 1) !== '#') {
          F(px, py, 16, 4, th.grass); F(px, py + 3, 16, 1, th.grassD);
          for (let i = 0; i < 16; i += 2) if (r() < .5) F(px + i, py + 4, 2, 1, th.grass);
          for (let i = 0; i < 5; i++) F(px + Math.floor(r() * 16), py - 1, 1, 1, th.grass);
          if (r() < .14 && at(x, y - 1) === '.') { const fx = px + 2 + Math.floor(r() * 11); F(fx, py - 3, 3, 2, '#f39c1f'); F(fx + 1, py - 3, 1, 1, '#ffd34d'); F(fx + 1, py - 1, 1, 1, th.grassD); }
          else if (r() < .1 && at(x, y - 1) === '.') { const fx = px + 2 + Math.floor(r() * 11); F(fx, py - 2, 1, 1, '#fff'); F(fx + 2, py - 2, 1, 1, '#fff'); }
        }
      } else if (ch === '=') {
        F(px, py, 16, 6, th.plankD); F(px, py, 16, 4, th.plank); F(px, py + 1, 16, 1, th.plankD);
        F(px + 2, py + 2, 1, 1, '#d8c08a'); F(px + 13, py + 2, 1, 1, '#d8c08a');
        if (at(x - 1, y) !== '=') { F(px, py + 6, 2, 5, th.plankD); }
        if (at(x + 1, y) !== '=') { F(px + 14, py + 6, 2, 5, th.plankD); }
      } else if (ch === '^') {
        ell(g, px + 8, py + 13, 8, 4, '#2f5a2a'); ell(g, px + 5, py + 12, 4, 3, '#3c6e33'); ell(g, px + 11, py + 12, 4, 3, '#3c6e33');
        for (let i = 0; i < 6; i++) { const sx = px + 1 + i * 3; F(sx, py + 5 + (i % 2) * 2, 1, 5, '#efe6cc'); F(sx, py + 4 + (i % 2) * 2, 1, 1, '#ffffff'); }
        F(px + 4, py + 10, 1, 1, '#d0213c'); F(px + 11, py + 11, 1, 1, '#d0213c');
      }
    }
    return c;
  }
  return { krishna, enemy, enemyW, putana, putanaW, items, THEMES, buildSky, buildFar, buildMid, buildTiles, rng };
})();
