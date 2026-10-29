'use strict';
// Level maps. Grid is 17 rows tall, 16px tiles. Ground top is row 13.
// Legend: # ground  = wooden platform  ^ thorns  ~ water  P start
//         a walker asura  b flying asura  r rock-throwing asura
//         f peacock feather  M makhan pot  H golden pot  o marble pouch  C diya checkpoint
//         L floating log (moves 3 tiles)  K floating log (moves 5 tiles)
const ROWS = 17;
function LB(w) {
  const g = []; for (let y = 0; y < ROWS; y++) g.push(new Array(w).fill('.'));
  const set = (x, y, c) => { if (x >= 0 && x < w && y >= 0 && y < ROWS) g[y][x] = c; };
  return {
    w, g,
    ground(x0, x1, top = 13) { for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) set(x, y, '#'); },
    pit(x0, x1) { for (let x = x0; x <= x1; x++) for (let y = 0; y < ROWS; y++) if (g[y][x] === '#') set(x, y, '.'); },
    water(x0, x1) { this.pit(x0, x1); for (let x = x0; x <= x1; x++) { set(x, 15, '~'); set(x, 16, '~'); } },
    plat(x, y, len) { for (let i = 0; i < len; i++) set(x + i, y, '='); },
    block(x, y, bw, bh) { for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) set(x + i, y + j, '#'); },
    thorns(x0, x1, row = 12) { for (let x = x0; x <= x1; x++) set(x, row, '^'); },
    put(x, y, c) { set(x, y, c); },
    items(x0, x1, y, c) { for (let x = x0; x <= x1; x++) set(x, y, c); }
  };
}

const LEVELS = [
  // ---------- Chapter 1: Gokul village, Putana ----------
  function () {
    const L = LB(150);
    L.ground(0, 149);
    L.put(3, 12, 'P');
    L.items(7, 10, 12, 'f');
    L.put(15, 12, 'a');
    L.plat(19, 10, 4); L.items(20, 21, 9, 'f');
    L.put(25, 12, 'o');
    L.block(29, 11, 3, 2); L.put(30, 10, 'f');
    L.put(35, 12, 'a');
    L.pit(39, 41); L.items(39, 41, 9, 'f');
    L.put(46, 7, 'b');
    L.put(49, 12, 'M');
    L.plat(53, 10, 3); L.plat(57, 8, 3); L.items(58, 59, 7, 'f');
    L.put(55, 12, 'a'); L.put(63, 12, 'a');
    L.put(68, 12, 'C');
    L.thorns(72, 73); L.items(72, 73, 9, 'f');
    L.block(78, 11, 4, 2); L.put(80, 10, 'r');
    L.put(85, 6, 'b');
    L.pit(89, 92); L.plat(90, 11, 2);
    L.put(95, 12, 'o');
    L.plat(98, 9, 3); L.put(99, 8, 'H');
    L.put(103, 12, 'a'); L.put(107, 7, 'b');
    L.put(111, 12, 'M');
    L.put(115, 12, 'C'); L.put(117, 12, 'o');
    L.block(149, 0, 1, 13);
    return { w: 150, grid: L.g, theme: 'gokul', music: 'level', arenaX: 119, boss: 'putana',
      cfg: { hpA: 1, hpR: 2, spd: 1 }, wind: false };
  },
  // ---------- Chapter 2: The whirlwind, Trinavarta ----------
  function () {
    const L = LB(170);
    L.ground(0, 169);
    L.put(3, 12, 'P');
    L.items(6, 8, 12, 'f');
    L.put(14, 12, 'a');
    L.plat(18, 10, 3); L.plat(23, 8, 3); L.put(24, 7, 'f');
    L.put(27, 6, 'b');
    L.pit(30, 33); L.plat(31, 11, 2);
    L.put(37, 12, 'a'); L.put(41, 12, 'a');
    L.put(44, 12, 'o');
    L.block(47, 11, 2, 2); L.block(49, 9, 2, 4); L.put(50, 8, 'r');
    L.put(55, 6, 'b'); L.put(60, 8, 'b');
    L.put(57, 12, 'M');
    L.thorns(62, 64); L.items(62, 64, 9, 'f');
    L.put(68, 12, 'C');
    L.pit(72, 74); L.put(73, 7, 'b');
    L.thorns(77, 88);
    L.plat(77, 10, 3); L.plat(81, 8, 3); L.plat(85, 10, 3);
    L.put(78, 9, 'f'); L.put(82, 7, 'f'); L.put(86, 9, 'f');
    L.put(91, 12, 'a');
    L.block(95, 11, 3, 2); L.put(96, 10, 'r');
    L.put(99, 12, 'o');
    L.plat(103, 8, 3); L.put(104, 7, 'H');
    L.put(108, 12, 'a'); L.put(112, 6, 'b'); L.put(116, 12, 'a');
    L.pit(119, 121);
    L.put(124, 12, 'M');
    L.put(127, 7, 'b'); L.put(130, 12, 'a');
    L.put(134, 12, 'C'); L.put(136, 12, 'o');
    L.block(168, 0, 2, 13);
    return { w: 170, grid: L.g, theme: 'storm', music: 'storm', arenaX: 138, boss: 'trina',
      cfg: { hpA: 1, hpR: 2, spd: 1.15 }, wind: true };
  },
  // ---------- Chapter 3: Yamuna riverbank, Bakasura ----------
  function () {
    const L = LB(190);
    L.ground(0, 189);
    L.put(3, 12, 'P');
    L.items(6, 9, 12, 'f');
    L.put(13, 12, 'a');
    L.water(17, 22); L.put(17, 11, 'L'); L.items(18, 21, 8, 'f');
    L.put(25, 7, 'b');
    L.block(28, 11, 3, 2); L.put(29, 10, 'r');
    L.put(34, 12, 'a');
    L.put(37, 12, 'M');
    L.plat(40, 10, 3); L.plat(44, 8, 3); L.plat(48, 6, 3); L.put(45, 7, 'f'); L.put(49, 5, 'f'); L.put(46, 12, 'a');
    L.thorns(52, 54);
    L.put(57, 12, 'C');
    L.water(61, 68); L.put(61, 11, 'K'); L.items(63, 66, 8, 'f');
    L.put(66, 6, 'b'); L.put(70, 8, 'b');
    L.put(73, 12, 'a'); L.put(77, 12, 'a');
    L.put(80, 12, 'o');
    L.block(83, 10, 2, 3);
    L.block(87, 11, 3, 2); L.put(88, 10, 'r');
    L.pit(92, 94);
    L.put(97, 12, 'M');
    L.plat(100, 9, 4); L.put(101, 8, 'H');
    L.water(105, 110); L.put(105, 11, 'L'); L.put(108, 6, 'b');
    L.put(114, 12, 'a'); L.put(118, 12, 'a');
    L.block(122, 11, 3, 2); L.put(123, 10, 'r');
    L.put(127, 12, 'C');
    L.thorns(131, 132); L.items(131, 132, 9, 'f');
    L.water(136, 139); L.put(136, 11, 'L');
    L.put(142, 7, 'b'); L.put(145, 12, 'a'); L.put(148, 12, 'o'); L.put(150, 12, 'M');
    L.put(153, 12, 'C');
    L.block(186, 0, 4, 13);
    return { w: 190, grid: L.g, theme: 'yamuna', music: 'level', arenaX: 156, boss: 'baka',
      cfg: { hpA: 2, hpR: 3, spd: 1.3 }, wind: false };
  }
];
