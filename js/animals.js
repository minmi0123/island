// 닭 · 병아리 · 닭장
'use strict';

// 닭: 서 있기 → 걷기 / 쪼기. 주인공이 뛰어들면 도망. 가끔 알을 낳는다
function updateChicken(ch) {
  const pdx = ch.x - player.x, pdy = ch.y - player.y, pd = Math.hypot(pdx, pdy);
  if (player.moving && pd < 14 && ch.state !== 'flee') {
    ch.state = 'flee';
    ch.timer = 40;
    ch.tx = ch.x + (pdx / (pd || 1)) * 30;
    ch.ty = ch.y + (pdy / (pd || 1)) * 30;
    burst(ch.x, ch.y - 6, ['#ffffff'], 2, 0.5);   // 깃털
  }

  if (ch.state === 'walk' || ch.state === 'flee') {
    const dx = ch.tx - ch.x, dy = ch.ty - ch.y, d = Math.hypot(dx, dy);
    const sp = ch.state === 'flee' ? CHICKEN_FLEE : CHICKEN_SPEED;
    if (Math.abs(dx) > 0.5) ch.dir = Math.sign(dx);
    let moved = false;
    if (d > 1) {
      const nx = ch.x + dx / d * sp, ny = ch.y + dy / d * sp;
      const stuck = chickenBlocked(ch.x, ch.y);   // 모닥불·다시 자란 나무에 끼었으면 빠져나오게 둔다
      if (stuck || !chickenBlocked(nx, ch.y)) { ch.x = nx; moved = true; }
      if (stuck || !chickenBlocked(ch.x, ny)) { ch.y = ny; moved = true; }
      ch.step++;
    }
    if (d <= 1 || !moved || --ch.timer <= 0) { ch.state = 'idle'; ch.timer = 40 + Math.floor(rand() * 100); }
  } else if (--ch.timer <= 0) {
    const roll = rand();
    if (roll < 0.55) {
      ch.state = 'walk';
      ch.timer = 200;
      ch.tx = ch.x + Math.round((rand() * 2 - 1) * 32);
      ch.ty = ch.y + Math.round((rand() * 2 - 1) * 24);
    } else if (roll < 0.85) {
      ch.state = 'peck';
      ch.timer = 30 + Math.floor(rand() * 30);
    } else {
      ch.state = 'idle';
      ch.timer = 60 + Math.floor(rand() * 60);
    }
  }

  if (ch.baby > 0) {
    if (--ch.baby === 0) {
      burst(ch.x, ch.y - 8, ['#ffffff', '#ffe066', PALETTE.R], 8, 0.8);
      sayOnce('grown', '병아리가 닭이 됐어요!');
    }
  } else if (--ch.egg <= 0) {
    ch.egg = nextEgg();
    if (items.filter((it) => it.kind === 'egg').length < EGG_LIMIT) {
      items.push({ kind: 'egg', x: ch.x - ch.dir * 4, y: ch.y + 1, z: 0, vz: 1.2, vx: -ch.dir * 0.2, vy: 0, age: 0 });
      ch.state = 'idle';
      ch.timer = 50;
      ch.laid = 40;
      if (!firstEgg) { firstEgg = true; toast('닭이 알을 낳았어요! 주워 볼까요'); }
    }
  }
  if (ch.laid > 0) ch.laid--;
}

// 닭장: 자리가 있으면 일정 간격으로 병아리가 나온다
function updateCoop(c) {
  if (chickens.length >= CHICKEN_COUNT + coops.length * COOP_ROOM) { c.timer = COOP_SPAWN; return; }
  if (--c.timer > 0) return;
  c.timer = COOP_SPAWN;
  spawnChick(c);
}

function spawnChick(c) {
  const x = c.x + Math.round(rand() * 6 - 3), y = c.y + 6;
  chickens.push({ x, y, dir: rand() < 0.5 ? 1 : -1, state: 'walk', timer: 60, tx: x + Math.round(rand() * 20 - 10), ty: y + 14, step: 0, egg: nextEgg(), baby: GROW_TIME });
  burst(x, y - 4, ['#ffe066', '#ffffff'], 6, 0.6);
  sayOnce('chick', '닭장에서 병아리가 나왔어요!');
}
