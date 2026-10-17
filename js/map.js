// 섬 만들기 · 지도 굽기 · 시작 자리
'use strict';

// 0 = 물, 1 = 풀, 2 = 흙
const tiles = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0));

function makeNoise(gw, gh) {
  const g = Array.from({ length: gh + 1 }, () => Array.from({ length: gw + 1 }, rand));
  const s = (v) => v * v * (3 - 2 * v);
  return (u, v) => {   // u, v = 0~1
    const x = u * gw, y = v * gh;
    const i = Math.min(gw - 1, Math.floor(x)), j = Math.min(gh - 1, Math.floor(y));
    const fx = s(x - i), fy = s(y - j);
    const a = g[j][i] + (g[j][i + 1] - g[j][i]) * fx;
    const b = g[j + 1][i] + (g[j + 1][i + 1] - g[j + 1][i]) * fx;
    return a + (b - a) * fy;
  };
}

function buildIsland() {
  const shape = makeNoise(5, 6), soil = makeNoise(4, 5);
  for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
    if (i < 2 || j < 2 || i >= MAP_W - 2 || j >= MAP_H - 3) continue;
    const nx = (i + 0.5) / MAP_W * 2 - 1, ny = (j + 0.5) / MAP_H * 2 - 1;
    const d = Math.sqrt(nx * nx + ny * ny) + (shape(i / MAP_W, j / MAP_H) - 0.5) * 0.55;
    if (d < 0.74) tiles[j][i] = soil(i / MAP_W, j / MAP_H) > 0.66 ? 2 : 1;
  }
  // 외톨이 땅·구멍 정리
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 1; j < MAP_H - 1; j++) for (let i = 1; i < MAP_W - 1; i++) {
      const n = [tiles[j - 1][i], tiles[j + 1][i], tiles[j][i - 1], tiles[j][i + 1]].filter((v) => v > 0).length;
      if (tiles[j][i] > 0 && n < 2) tiles[j][i] = 0;
      else if (tiles[j][i] === 0 && n >= 3) tiles[j][i] = 1;
    }
  }
}
buildIsland();

const isLand = (i, j) => i >= 0 && j >= 0 && i < MAP_W && j < MAP_H && tiles[j][i] > 0;
const landAt = (x, y) => isLand(Math.floor(x / TILE), Math.floor(y / TILE));

// 지도는 시작할 때 한 번만 굽는다
const mapCanvas = document.createElement('canvas');
mapCanvas.width = MAP_W * TILE;
mapCanvas.height = MAP_H * TILE;
const waves = [];

function bakeMap() {
  const m = mapCanvas.getContext('2d');
  const r = (x, y, w, h, color) => { m.fillStyle = color; m.fillRect(x, y, w, h); };
  r(0, 0, mapCanvas.width, mapCanvas.height, C.water);

  for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
    const px = i * TILE, py = j * TILE, v = tiles[j][i];
    if (v === 0) {
      for (let k = 0; k < 3; k++) r(px + Math.floor(rand() * 14), py + Math.floor(rand() * 15), 2, 1, C.waterDeep);
      const nearLand = isLand(i - 1, j) || isLand(i + 1, j) || isLand(i, j - 1) || isLand(i, j + 1);
      if (!nearLand && rand() < 0.08) waves.push({ x: px + 3 + Math.floor(rand() * 8), y: py + 4 + Math.floor(rand() * 8), p: Math.floor(rand() * 60) });
      continue;
    }
    r(px, py, TILE, TILE, v === 2 ? C.dirt : C.grass);
    for (let k = 0; k < 6; k++) r(px + Math.floor(rand() * 15), py + Math.floor(rand() * 16), rand() < 0.5 ? 1 : 2, 1, v === 2 ? C.dirtDark : C.grassDark);
    if (v === 1) for (let k = 0; k < 2; k++) r(px + Math.floor(rand() * 15), py + Math.floor(rand() * 16), 1, 1, C.grassLight);
    if (v === 1 && rand() < 0.15) {   // 풀 포기
      const gx = px + 3 + Math.floor(rand() * 9), gy = py + 4 + Math.floor(rand() * 9);
      r(gx, gy, 1, 2, C.grassDark); r(gx + 1, gy + 1, 1, 1, C.grassDark); r(gx + 2, gy, 1, 2, C.grassDark);
    }
  }

  // 흙과 풀 경계를 톱니로
  for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
    if (tiles[j][i] !== 2) continue;
    const px = i * TILE, py = j * TILE;
    for (let k = 0; k < TILE; k += 3) {
      if (tiles[j - 1]?.[i] === 1) r(px + k, py, 2, 1 + (k % 2), C.grass);
      if (tiles[j + 1]?.[i] === 1) r(px + k, py + 15 - (k % 2), 2, 1 + (k % 2), C.grass);
      if (tiles[j][i - 1] === 1) r(px, py + k, 1 + (k % 2), 2, C.grass);
      if (tiles[j][i + 1] === 1) r(px + 15 - (k % 2), py + k, 1 + (k % 2), 2, C.grass);
    }
  }

  // 물가: 위·옆은 외곽선, 아래는 흙 절벽
  for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
    if (!isLand(i, j)) continue;
    const px = i * TILE, py = j * TILE;
    if (!isLand(i, j - 1)) { r(px, py - 1, TILE, 1, PALETTE.o); r(px, py, TILE, 1, C.grassLight); }
    if (!isLand(i - 1, j)) r(px - 1, py - 1, 1, TILE + 1, PALETTE.o);
    if (!isLand(i + 1, j)) r(px + TILE, py - 1, 1, TILE + 1, PALETTE.o);
    if (!isLand(i, j + 1)) {
      r(px, py + 15, TILE, 1, C.grassDark);
      r(px, py + 16, TILE, 5, C.cliff);
      for (let k = 1; k < TILE; k += 3) r(px + k, py + 17, 1, 3, C.cliffDark);
      r(px - (isLand(i - 1, j + 1) ? 0 : 1), py + 21, TILE + (isLand(i + 1, j + 1) ? 0 : 1) + (isLand(i - 1, j + 1) ? 0 : 1), 1, PALETTE.o);
      r(px, py + 22, TILE, 1, C.foam);
      if (!isLand(i - 1, j)) r(px - 1, py + 16, 1, 5, PALETTE.o);
      if (!isLand(i + 1, j)) r(px + TILE, py + 16, 1, 5, PALETTE.o);
    }
  }

  // 물풀 · 바위
  for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
    if (isLand(i, j) || isLand(i, j - 1)) continue;
    const px = i * TILE, py = j * TILE, roll = rand();
    if (roll < 0.05) {
      for (let k = 0; k < 3; k++) {
        const h = 3 + ((k + i) % 2) * 2;
        r(px + 5 + k * 3, py + 11 - h, 1, h, C.reed);
        r(px + 5 + k * 3, py + 11, 1, 1, C.foam);
      }
    } else if (roll < 0.075) {
      r(px + 4, py + 7, 8, 5, PALETTE.o);
      r(px + 5, py + 8, 6, 3, C.stone);
      r(px + 5, py + 8, 3, 1, '#c4c4d0');
      r(px + 3, py + 12, 10, 1, C.foam);
    }
  }
}
bakeMap();

function findSpawn() {
  const ci = MAP_W >> 1, cj = MAP_H >> 1;
  for (let rr = 0; rr < 10; rr++)
    for (let j = cj - rr; j <= cj + rr; j++) for (let i = ci - rr; i <= ci + rr; i++)
      if (tiles[j]?.[i] > 0 && isLand(i + 1, j) && isLand(i - 1, j) && isLand(i, j + 1)) return { i, j };
  return { i: ci, j: cj };
}
const spawn = findSpawn();
