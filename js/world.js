// 게임 상태 · 충돌 · 나무와 닭 처음 배치
'use strict';

const player = { x: spawn.i * TILE + 8, y: spawn.j * TILE + 12, dir: 1, step: 0, moving: false, swing: 0, cool: 0, target: null, full: FULL_START, still: 0, fish: null };
const inv = { log: 0, egg: 0, fried: 0, fish: 0, grilled: 0, meat: 0, roast: 0 };
const trees = [];
const items = [];
const parts = [];
const fires = [];
const coops = [];
let house = null;   // 집은 하나
let day = 1;
let sleepCool = 0;
const chickens = [];
const cam = { x: 0, y: 0, shake: 0 };

function obstacles() {
  const list = [];
  trees.forEach((t) => list.push({ x: t.x, y: t.y, hw: 4 }));   // 그루터기도 막는다
  fires.forEach((f) => list.push({ x: f.x, y: f.y, hw: 5 }));
  coops.forEach((c) => list.push({ x: c.x, y: c.y, hw: 12, top: 10, bottom: 2 }));
  if (house) list.push({ x: house.x, y: house.y, hw: 16, top: 13, bottom: 2 });
  return list;
}
function blocked(x, y) {
  if (!landAt(x - 3, y - 2) || !landAt(x + 3, y - 2) || !landAt(x - 3, y) || !landAt(x + 3, y)) return true;
  return obstacles().some((o) => Math.abs(x - o.x) < o.hw + 3 && y > o.y - (o.top ?? 3) && y < o.y + (o.bottom ?? 3));
}
function tryMove(dx, dy) {
  if (!blocked(player.x + dx, player.y)) player.x += dx;
  if (!blocked(player.x, player.y + dy)) player.y += dy;
}
// 닭은 물가에서 한 칸 더 안쪽까지만 다닌다 (절벽에 붙지 않게)
function chickenBlocked(x, y) {
  if (!landAt(x - 5, y - 4) || !landAt(x + 5, y - 4) || !landAt(x - 5, y + 2) || !landAt(x + 5, y + 2)) return true;
  return obstacles().some((o) => Math.abs(x - o.x) < o.hw + 4 && y > o.y - (o.top ?? 3) - 1 && y < o.y + (o.bottom ?? 3) + 1);
}

// 발밑 기준 (x, y) 에서 좌우 hw, 위 top, 아래 bottom 만큼이 땅이고 다른 것과 안 겹치나
function areaFree(x, y, hw, top, bottom) {
  if (![[-hw, -top], [hw, -top], [-hw, bottom], [hw, bottom]].every(([dx, dy]) => landAt(x + dx, y + dy))) return false;
  return obstacles().every((o) => Math.abs(x - o.x) >= hw + o.hw + 2
    || y + bottom <= o.y - (o.top ?? 3) || y - top >= o.y + (o.bottom ?? 3));
}

function placeTrees() {
  for (let j = 1; j < MAP_H - 1; j++) for (let i = 1; i < MAP_W - 1; i++) {
    if (tiles[j][i] !== 1) continue;
    let ok = true;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (!isLand(i + di, j + dj)) ok = false;
    if (!ok || Math.hypot(i - spawn.i, j - spawn.j) < 2.5) continue;
    if (trees.some((t) => t.i === i - 1 && t.j === j || t.i === i && t.j === j - 1)) continue;
    if (rand() < 0.2) trees.push({ i, j, x: i * TILE + 8 + Math.round(rand() * 4 - 2), y: j * TILE + 13, hp: 3, maxHp: 3, shake: 0, hpShow: 0, state: 'tree', regrow: 0 });
  }
}
placeTrees();

function placeChickens() {
  for (let tries = 0; chickens.length < CHICKEN_COUNT && tries < 400; tries++) {
    const x = player.x + Math.round((rand() * 2 - 1) * 70), y = player.y + Math.round((rand() * 2 - 1) * 70);
    if (chickenBlocked(x, y) || Math.hypot(x - player.x, y - player.y) < 20) continue;
    chickens.push({ x, y, dir: rand() < 0.5 ? 1 : -1, state: 'idle', timer: Math.floor(rand() * 90), tx: x, ty: y, step: 0, egg: nextEgg() });
  }
}
placeChickens();
