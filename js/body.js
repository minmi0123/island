// 몸: 체력 · 배고픔 · 기절 (기획.md "체력 · 배고픔")
// 체력은 일(도끼질 · 낚시)을 하면 줄고, 일을 안 하면 천천히 찬다. 배가 비면 체력이 서서히 줄고 걸음이 느려진다
// 체력이 0 이면 기절 → 화면이 검게 바뀌고 집 앞(집이 없으면 처음 바닷가)에서 깨어난다. 체력은 다 찬다
'use strict';

let fainting = false;
const working = () => player.swing > 0 || !!player.fish;
function tire(n) { player.hp = Math.max(0, player.hp - n); }

let lastBars = '';
function updateBody() {
  if (player.hp <= 0) { faint(); return; }   // 쉬어서 차기 전에 본다
  player.full = Math.max(0, player.full - FULL_DRAIN);
  if (player.full < 25) note('hungry');
  if (player.full === 0) { note('starve'); tire(HP_STARVE); }
  else if (!working()) player.hp = Math.min(HP_MAX, player.hp + HP_REST);

  const bars = Math.round(player.full) + '/' + Math.round(player.hp);
  if (bars !== lastBars) {
    lastBars = bars;
    document.getElementById('hunger-fill').style.width = Math.round(player.full) + '%';
    document.getElementById('hp-fill').style.width = Math.round(player.hp / HP_MAX * 100) + '%';
    document.getElementById('bar-full').classList.toggle('low', player.full < 25);
    document.getElementById('bar-hp').classList.toggle('low', player.hp < HP_MAX * 0.25);
  }
  if (player.full < 25 && player.full > 0) sayOnce('hungry', inv.fried + inv.grilled + inv.roast ? '배고파요… 구운 걸 먹어요' : '배고파요… 달걀을 구워 먹어야겠다');
  if (player.full === 0) sayOnce('starving', '배가 너무 고파서 체력이 줄어요');
  if (player.hp < HP_MAX * 0.25 && player.full > 0) sayOnce('tired', '힘들어요… 일을 쉬면 체력이 돌아와요');
  if (player.hp <= 0) faint();
}

// 깨어날 자리: 집 문 앞, 집이 없으면 처음 바닷가. 무언가 지어져 막혀 있으면 둘레의 빈 땅
function homeSpot() {
  const want = house ? { x: house.x, y: house.y + 8 } : { x: spawn.i * TILE + 8, y: spawn.j * TILE + 12 };
  if (!blocked(want.x, want.y)) return want;
  for (let r = 4; r <= 64; r += 4) for (let a = 0; a < 16; a++) {
    const x = Math.round(want.x + Math.cos(a * Math.PI / 8) * r), y = Math.round(want.y + Math.sin(a * Math.PI / 8) * r);
    if (!blocked(x, y)) return { x, y };
  }
  return want;
}

function faint() {
  if (fainting) return;
  fainting = true;
  note('faint');
  player.fish = null;
  player.swing = 0;
  player.still = 0;
  player.moving = false;
  joy = null;
  toastTimer = 0;
  document.getElementById('toast').classList.remove('show');
  document.getElementById('night').classList.add('on');
  setTimeout(() => {
    const p = homeSpot();
    player.x = p.x;
    player.y = p.y;
    player.hp = HP_MAX;
    cam.x = Math.max(0, Math.min(MAP_W * TILE - W, player.x - W / 2));
    cam.y = Math.max(0, Math.min(MAP_H * TILE - H, player.y - H / 2));
    refreshHud();
    saveGame();
    setTimeout(() => {
      document.getElementById('night').classList.remove('on');
      toast(house ? '기절했다… 집 앞에서 깨어났어요' : '기절했다… 처음 그 바닷가에서 깨어났어요');
      setTimeout(() => { fainting = false; }, 600);
    }, 700);
  }, 900);
}
