// 기본: 화면 크기 · 캔버스 · 확인 모드 · 시드 난수
'use strict';

const W = 144, H = 256, TILE = 16;          // 내부 해상도 9 x 16 칸 (세로 화면)
const MAP_W = 18, MAP_H = 24;               // 섬 지도 칸 수
const CHECK = new URLSearchParams(location.search).has('check');   // index.html?check = dev/check.js 확인 모드
const wrap = document.getElementById('wrap');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function rng(seed) {
  return function () {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = rng(20261017);   // 섬 모양을 매번 같게
