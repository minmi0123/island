// 한 프레임 갱신: 도끼질 · 배부름 · 모닥불 · 아이템 줍기
'use strict';

function nearestTree() {
  let best = null, bestD = 1e9;
  trees.forEach((t) => {
    if (t.state !== 'tree') return;
    const dx = t.x - player.x, dy = t.y - player.y;
    if (Math.abs(dx) > REACH_X || Math.abs(dy) > REACH_Y) return;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { best = t; bestD = d; }
  });
  return best;
}

function burst(x, y, colors, n, power = 1) {
  for (let k = 0; k < n; k++) parts.push({
    x, y, vx: (rand() * 2 - 1) * power, vy: -0.6 - rand() * 1.2 * power,
    g: 0.08, life: 26 + Math.floor(rand() * 14), age: 0, color: colors[k % colors.length], w: rand() < 0.5 ? 2 : 1,
  });
}

function hitTree(t) {
  if (!t || t.state !== 'tree') return;
  if (Math.abs(t.x - player.x) > REACH_X + 3 || Math.abs(t.y - player.y) > REACH_Y + 3) return;
  t.hp--;
  player.full = Math.max(0, player.full - FULL_PER_HIT);
  t.shake = 10;
  t.hpShow = 90;
  burst(t.x - player.dir * 4, t.y - 8, [PALETTE.l, PALETTE.h, PALETTE.c], 5);
  if (t.hp <= 0) {
    t.state = 'stump';
    note('chop');
    t.regrow = REGROW;
    cam.shake = 5;
    burst(t.x, t.y - 12, [PALETTE.l, PALETTE.h, PALETTE.d, PALETTE.c], 12, 1.4);
    for (let k = 0; k < 2; k++) items.push({ kind: 'log', x: t.x, y: t.y + 3, z: 0, vz: 2.2, vx: (k ? 1 : -1) * (0.2 + rand() * 0.15), vy: 0.05 + rand() * 0.1, age: 0 });
  }
}

let t = 0;
const hints = [
  [30, '화면을 누른 채 끌어서 이동해요 (PC: 방향키)'],
  [300, '나무 옆에 서면 저절로 도끼질해요'],
];

let firstEgg = false;
const said = {};   // 한 번만 띄우는 안내
function sayOnce(key, msg) { if (!said[key]) { said[key] = true; toast(msg, 220); } }

let lastFullDraw = -1;
function updateHunger() {
  player.full = Math.max(0, player.full - FULL_DRAIN);
  if (player.full < 25) note('hungry');
  if (player.full === 0) note('starve');
  const pct = Math.round(player.full);
  if (pct !== lastFullDraw) {
    lastFullDraw = pct;
    document.getElementById('hunger-fill').style.width = pct + '%';
    document.getElementById('hunger').classList.toggle('low', player.full < 25);
  }
  if (player.full < 25 && player.full > 0) sayOnce('hungry', inv.fried + inv.grilled ? '배고파요… 구운 달걀을 먹어요' : '배고파요… 달걀을 구워 먹어야겠다');
  if (player.full === 0) sayOnce('starving', '배가 너무 고파서 힘이 없어요');
}

// 모닥불 옆에 서 있으면 생선 → 달걀 순서로 하나씩 굽는다
function updateFire(f) {
  if (t % 10 === 0) parts.push({ x: f.x + Math.round(rand() * 4 - 2), y: f.y - 8, vx: (rand() - 0.5) * 0.3, vy: -0.4 - rand() * 0.3, g: 0, life: 40, age: 0, color: rand() < 0.5 ? '#ffb000' : '#ff7a3c', w: 1 });
  const near = Math.abs(player.x - f.x) < COOK_REACH && Math.abs(player.y - f.y) < COOK_REACH - 6;
  const raw = inv.fish > 0 ? 'fish' : inv.egg > 0 ? 'egg' : null;
  if (near && raw) sayOnce('cook', '모닥불 옆에 있으면 저절로 구워요');
  if (f.cook == null) {
    if (near && raw) { inv[raw]--; f.kind = raw; f.cook = 0; refreshHud(); }
    return;
  }
  if (++f.cook < COOK[f.kind].time) return;
  f.cook = null;
  note('cooked');
  items.push({ kind: COOK[f.kind].out, x: f.x, y: f.y + 2, z: 0, vz: 1.8, vx: (player.x < f.x ? -1 : 1) * 0.3, vy: 0.1, age: 0 });
  burst(f.x, f.y - 14, ['#ffe066', '#ffffff'], 6, 0.8);
}

let lastSleepSpot = null;
function update() {
  if (sleeping || bookOpen || bagOpen || choiceOpen || endingOpen) return;
  hints.forEach(([at, msg]) => { if (t === at) toast(msg, 220); });
  if (toastTimer > 0 && --toastTimer === 0) document.getElementById('toast').classList.remove('show');
  if (sail) { updateSail(); followCam(); return; }   // 떠나는 중에는 뗏목만 움직인다

  const { vx, vy } = readInput();
  player.moving = !!(vx || vy);
  if (player.moving) {
    if (Math.abs(vx) > 0.2) player.dir = Math.sign(vx);
    const sp = player.full > 0 ? SPEED : SPEED * 0.5;
    const x0 = player.x, y0 = player.y;
    tryMove(vx * sp, vy * sp);
    note('walk', Math.hypot(player.x - x0, player.y - y0));
    player.step++;
  }

  // 자동 도끼질
  if (player.swing > 0) {
    player.swing++;
    if (player.target && Math.abs(player.target.x - player.x) > 2) player.dir = Math.sign(player.target.x - player.x);
    if (player.swing === HIT_AT) hitTree(player.target);
    if (player.swing >= SWING_LEN) { player.swing = 0; player.cool = player.full > 0 ? 6 : 40; }
  } else if (player.cool > 0) {
    player.cool--;
  } else {
    const tr = nearestTree();
    if (tr) { player.target = tr; player.swing = 1; }
  }

  updateFishing();

  trees.forEach((tr) => {
    if (tr.shake > 0) tr.shake--;
    if (tr.hpShow > 0) tr.hpShow--;
    if (tr.state === 'stump' && --tr.regrow <= 0) {
      if (Math.abs(player.x - tr.x) < 12 && Math.abs(player.y - tr.y) < 8) { tr.regrow = 60; return; }
      tr.state = 'tree';
      tr.hp = tr.maxHp;
      burst(tr.x, tr.y - 10, [PALETTE.h, PALETTE.l], 8);
    }
  });

  chickens.forEach(updateChicken);

  // 통나무 · 달걀: 튀어 올랐다 떨어지고, 가까우면 빨려 온다
  for (let k = items.length - 1; k >= 0; k--) {
    const it = items[k];
    it.age++;
    if (it.z > 0 || it.vz > 0) {
      it.x += it.vx; it.y += it.vy;
      it.z += it.vz; it.vz -= 0.15;
      if (it.z <= 0) { it.z = 0; it.vz = Math.abs(it.vz) > 0.8 ? -it.vz * 0.4 : 0; it.vx *= 0.5; it.vy *= 0.5; }
      continue;
    }
    if (it.age < 30) continue;
    const dx = player.x - it.x, dy = player.y - 2 - it.y, d = Math.hypot(dx, dy);
    if (d < 4) {
      items.splice(k, 1);
      inv[it.kind]++;
      if (it.kind === 'log' || it.kind === 'egg') note(it.kind);
      refreshHud();
      bumpHud(it.kind);
      burst(player.x, player.y - 12, ['#ffe066', '#ffffff'], 4, 0.6);
      if (it.kind === 'log' && inv.log === FIRE_COST && !fires.length) toast('통나무 3개! 모닥불을 만들 수 있어요');
      if (it.kind === 'log' && inv.log === COOP_COST && !coops.length) sayOnce('coopReady', '통나무 5개! 닭장을 지을 수 있어요');
      if (it.kind === 'fried') sayOnce('fried', '구운 달걀! 아래 버튼으로 먹을 수 있어요');
      if (it.kind === 'fish') sayOnce('gotfish', '물고기를 낚았다! 모닥불에 구우면 든든해요');
    } else if (d < 28) {
      const sp = Math.min(d, 1.2 + (28 - d) * 0.08);
      it.x += dx / d * sp; it.y += dy / d * sp;
    }
  }

  fires.forEach(updateFire);
  coops.forEach(updateCoop);
  if (sleepCool > 0) sleepCool--;
  const spot = sleepSpot();
  if (spot !== lastSleepSpot) {
    lastSleepSpot = spot;
    document.getElementById('sleep').style.display = spot ? 'flex' : 'none';
    document.getElementById('sleep-where').textContent = spot === 'fire' ? '모닥불 옆에서' : '밤 넘기기';
    if (spot === 'house') sayOnce('door', '집 앞에서 자면 밤이 지나가요');
    if (spot === 'fire') sayOnce('fireSleep', '모닥불 옆에서도 잘 수 있어요. 집보다 배가 더 고파요');
  }
  updateRaft();
  if (house && t % 25 === 0) parts.push({ x: house.x + 9 + Math.round(rand() * 2), y: house.y - 35, vx: 0.1 + rand() * 0.15, vy: -0.25, g: 0, life: 70, age: 0, color: '#d8d8e4', w: 2 });   // 굴뚝 연기
  updateHunger();

  parts.forEach((p) => { p.age++; p.x += p.vx; p.y += p.vy; p.vy += p.g; });
  for (let k = parts.length - 1; k >= 0; k--) if (parts[k].age >= parts[k].life) parts.splice(k, 1);

  followCam();
  if (t > 0 && t % SAVE_EVERY === 0) saveGame();
}

// 카메라는 주인공을 천천히 따라간다
function followCam() {
  const clamp = (v, max) => (sail ? v : Math.max(0, Math.min(max, v)));   // 떠날 때는 지도 밖 바다까지 따라간다
  const tx = clamp(player.x - W / 2, MAP_W * TILE - W);
  const ty = clamp(player.y - H / 2, MAP_H * TILE - H);
  cam.x += (tx - cam.x) * 0.15;
  cam.y += (ty - cam.y) * 0.15;
  if (cam.shake > 0) cam.shake--;
}
