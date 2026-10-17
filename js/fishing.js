// 낚시
'use strict';

// 낚시: 물가에 가만히 서 있으면 던지고, 찌가 들어갔을 때 톡 누르면 잡힌다
const waterAt = (x, y) => !landAt(x, y);
function fishingSpot() {
  // 바라보는 쪽 → 반대쪽 → 아래 → 위. 찌 자리와 그 둘레가 물이어야 한다 (절벽 위에 앉지 않게)
  for (const [dx, dy] of [[player.dir * 22, -2], [-player.dir * 22, -2], [0, 24], [0, -20]]) {
    const bx = Math.round(player.x + dx), by = Math.round(player.y + dy);
    if (waterAt(bx, by) && waterAt(bx - 4, by) && waterAt(bx + 4, by) && waterAt(bx, by - 7) && waterAt(bx, by + 4)) return { bx, by };
  }
  return null;
}

function splash(x, y, n = 4) {
  burst(x, y, [C.foam, '#ffffff'], n, 0.5);
}

function updateFishing() {
  const f = player.fish;
  if (player.moving || player.swing > 0) {
    if (f && f.state === 'bite') { note('miss'); toast('물고기가 도망갔어요', 90); }
    player.fish = null;
    player.still = 0;
    return;
  }
  if (!f) {
    if (++player.still < FISH_STILL || nearestTree() || nearRaft()) return;   // 뗏목 옆에선 엮기만 한다
    const spot = fishingSpot();
    if (!spot) return;
    player.fish = { state: 'cast', timer: 20, ...spot };
    if (spot.bx !== Math.round(player.x)) player.dir = Math.sign(spot.bx - player.x);
    sayOnce('fishing', '물가에 서 있으면 낚시를 해요');
    return;
  }
  if (--f.timer > 0) return;
  if (f.state === 'cast') { f.state = 'wait'; f.timer = fishWait(); splash(f.bx, f.by); }
  else if (f.state === 'wait') { f.state = 'bite'; f.timer = FISH_BITE; splash(f.bx, f.by, 6); sayOnce('bite', '찌가 쏙! 화면을 톡 눌러요 (PC: 스페이스)'); }
  else if (f.state === 'bite') { note('miss'); f.state = 'miss'; f.timer = 50; toast('놓쳤다… 다시 기다려요', 90); }
  else { f.state = 'wait'; f.timer = fishWait(); }   // miss · got 다음엔 다시 기다린다
}

// 톡 눌렀을 때. 낚시 중이라 입력을 썼으면 true
function reel() {
  const f = player.fish;
  if (!f) return false;
  if (f.state === 'bite') {
    items.push({ kind: 'fish', x: f.bx, y: f.by, z: 0, vz: 2.4, vx: (player.x - f.bx) / 32, vy: (player.y - 2 - f.by) / 32, age: 30 });
    splash(f.bx, f.by, 10);
    note('fish');
    f.state = 'got';
    f.timer = 60;
    return true;
  }
  if (f.state === 'wait') {
    f.timer = fishWait();
    note('early');
    toast('아직이에요. 찌가 쏙 들어갈 때 눌러요', 90);
    return true;
  }
  return f.state !== 'cast' ? true : false;
}
