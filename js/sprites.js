// 팔레트 · 도트 그림 (dev-guide 도트.md 방식)
'use strict';

const PALETTE = {
  o: '#3d2c3a', // 외곽선
  w: '#fbfaf5', // 주인공 몸
  g: '#c9c6d6', // 주인공 그늘
  e: '#3d2c3a', // 눈
  t: '#a8693f', // 나무 껍질
  T: '#7a4a2e', // 나무 껍질 어두운 쪽
  c: '#ecc98f', // 자른 면
  r: '#c4905a', // 나이테
  l: '#4f9a7a', // 잎
  h: '#7cc27e', // 잎 밝은 쪽
  d: '#2f6b5e', // 잎 어두운 쪽
  R: '#e8434a', // 닭 볏
  Y: '#f5b93a', // 닭 부리 · 발
  E: '#fff3d6', // 달걀
  k: '#dcb77e', // 달걀 그늘
  B: '#ffe27a', // 병아리
  b: '#f0c24a', // 병아리 날개
  F: '#ff9a5a', // 물고기
  f: '#e86a3a', // 물고기 어두운 쪽
};
const C = {
  water: '#7ba4e0', waterDeep: '#6e97d8', foam: '#b4d0f2',
  grass: '#8fc95a', grassDark: '#78b24c', grassLight: '#a6d86a',
  dirt: '#b07a5c', dirtDark: '#98654b',
  cliff: '#9a6248', cliffDark: '#7a4a38',
  reed: '#5f8f4a', stone: '#9a9aa8',
  handle: '#8a5a3a', steel: '#c8ccd8',
};

function makeSprite(rows, colors = {}, flip = false) {
  const pal = { ...PALETTE, ...colors };
  const w = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== w) console.warn('도트 줄 길이 다름', i, r); });
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = rows.length;
  const c = cv.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    c.fillStyle = pal[ch];
    c.fillRect(flip ? w - 1 - x : x, y, 1, 1);
  }));
  return cv;
}

// 주인공 11x11 — 오른쪽을 본다
const HERO = [
  '...ooooo...',
  '..owwwwwo..',
  '.owwwwwwwo.',
  'owwwwwwwwwo',
  'owwwwewwewo',
  'owwwwewwewo',
  'owwwwwwwwwo',
  'owwwwwwwwgo',
  '.owwwwwwgo.',
  '.owgo.owgo.',
  '..oo...oo..',
];

// 통나무 9x5
const LOG = [
  '.ooooooo.',
  'ottttttco',
  'otTtttTro',
  'oTTTTTTco',
  '.ooooooo.',
];

// 그루터기 10x6
const STUMP = [
  '..oooooo..',
  '.occrrcco.',
  '.oTccccTo.',
  '.otttttTo.',
  'ooTtttTToo',
  '.oooooooo.',
];

// 닭 11x10 — 오른쪽을 본다. 마지막 줄(발)만 바꿔서 걷기
const CHICKEN_TOP = [
  '......ooo..',
  '.....oRRRo.',
  '.....owwwo.',
  '.o...owewYo',
  'owo..owwRo.',
  'owwooowwo..',
  'owwwwwwwwo.',
  'owgwwwwwgo.',
  '.oggwwwggo.',
];
const CHICKEN_PECK = [   // 고개 숙여 쪼기
  '...........',
  '...........',
  '.o.........',
  'owo..ooo...',
  'owwoowwwooo',
  'owwwwwwwRRo',
  'owwwwwwwweo',
  'owgwwwwwwYo',
  '.oggwwwggo.',
  '....Y..Y...',
];
const CHICKEN_FEET = ['....Y..Y...', '...Y...Y...'];

// 병아리 7x7
const CHICK_TOP = [
  '..ooo..',
  '.oBBBo.',
  'oBBBBeo',
  'oBbBBBY',
  'oBbbBBo',
  '.oBBBo.',
];
const CHICK_FEET = ['..Y.Y..', '.Y...Y.'];

// 달걀 6x6
const EGG = [
  '..oo..',
  '.oEEo.',
  'oEEEEo',
  'oEEEko',
  'oEEkko',
  '.oooo.',
];

// 물고기 11x6 — 주황 바탕에 흰 줄
const FISH = [
  '..ooooo....',
  '.oFFwFFo.oo',
  'oFeFwFFFoFo',
  'oFFFwFFFFFo',
  '.ofFwffo.oo',
  '..ooooo....',
];

// 구운 달걀 7x6
const FRIED = [
  '.ooooo.',
  'oEEEEEo',
  'oEYYEEo',
  'oEYYEEo',
  'oEEEEko',
  '.ooooo.',
];

// 모닥불 장작 12x5
const FIRE_BASE = [
  '.oo......oo.',
  'oTToo..ooTTo',
  '.oTTToooTTo.',
  '..ooTTTTo...',
  '....oooo....',
];

// 소나무 17x22 — 3단 삼각형을 쌓고 가장자리를 외곽선으로 바꾼다
function pineRows() {
  const w = 17, h = 22, cx = 8;
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  [[0, 7, 4], [5, 7, 6], [10, 8, 7]].forEach(([top, th, maxHalf]) => {
    for (let i = 0; i < th; i++) {
      const half = Math.max(1, Math.round(maxHalf * (i + 1) / th));
      for (let x = cx - half; x <= cx + half; x++) {
        let ch = 'l';
        if (i === th - 1) ch = 'd';
        else if (x <= cx - half + 1) ch = 'h';
        else if (x >= cx + half - 1) ch = 'd';
        g[top + i][x] = ch;
      }
    }
  });
  for (let y = 18; y < h; y++) for (let x = cx - 2; x <= cx + 2; x++) g[y][x] = x === cx + 1 ? 'T' : 't';
  const filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && g[y][x] !== '.';
  return g.map((row, y) => row.map((ch, x) =>
    ch !== '.' && (!filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1)) ? 'o' : ch
  ).join(''));
}

const SPR = {
  hero: { right: makeSprite(HERO), left: makeSprite(HERO, {}, true) },
  tree: makeSprite(pineRows()),
  log: makeSprite(LOG),
  stump: makeSprite(STUMP),
  fireBase: makeSprite(FIRE_BASE),
  egg: makeSprite(EGG),
  fried: makeSprite(FRIED),
  fish: makeSprite(FISH),
  grilled: makeSprite(FISH, { F: '#d08850', f: '#8a4a2a', w: '#5a3a2a' }),   // 석쇠 자국
  chicken: {},
  chick: {},
};
['right', 'left'].forEach((side) => {
  const flip = side === 'left';
  SPR.chicken[side] = {
    stand: makeSprite([...CHICKEN_TOP, CHICKEN_FEET[0]], {}, flip),
    walk: makeSprite([...CHICKEN_TOP, CHICKEN_FEET[1]], {}, flip),
    peck: makeSprite(CHICKEN_PECK, {}, flip),
  };
  SPR.chick[side] = {
    stand: makeSprite([...CHICK_TOP, CHICK_FEET[0]], {}, flip),
    walk: makeSprite([...CHICK_TOP, CHICK_FEET[1]], {}, flip),
  };
});
