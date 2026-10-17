// 집 · 잠 · 밤사이 일
'use strict';

// 집 문 앞에 서 있나
function atDoor() {
  return !!house && Math.abs(player.x - house.x) < 9 && player.y > house.y && player.y < house.y + 14;
}

// 밤이 지나는 동안 일어나는 일. 그날 일기를 돌려준다
function passNight() {
  const entry = writeDiary();   // 하루가 넘어가기 전에 오늘 일로 쓴다
  day++;
  trees.forEach((tr) => { if (tr.state === 'stump') { tr.state = 'tree'; tr.hp = tr.maxHp; } });
  chickens.forEach((ch) => {
    if (ch.baby > 0) { ch.baby = 0; return; }   // 병아리는 하룻밤 자고 나면 닭
    if (items.filter((it) => it.kind === 'egg').length < NIGHT_EGG_LIMIT) {
      items.push({ kind: 'egg', x: ch.x - ch.dir * 4, y: ch.y + 1, z: 0, vz: 0, vx: 0, vy: 0, age: 30 });
    }
    ch.egg = nextEgg();
  });
  coops.forEach((c) => {
    if (chickens.length < CHICKEN_COUNT + coops.length * COOP_ROOM) spawnChick(c);
    c.timer = COOP_SPAWN;
  });
  player.full = Math.max(0, player.full - SLEEP_HUNGER);
  player.x = house.x;
  player.y = house.y + 8;
  player.fish = null;
  player.still = 0;
  sleepCool = SLEEP_COOL;
  refreshDay();
  refreshHud();
  saveGame();
  return entry;
}

let sleeping = false;
function goToSleep() {
  if (sleeping || !atDoor()) return;
  if (sleepCool > 0) { toast('아직 졸리지 않아요. 조금 더 놀다 자요'); return; }
  sleeping = true;
  toastTimer = 0;
  document.getElementById('toast').classList.remove('show');   // 낮의 안내가 일기 위에 남지 않게
  document.getElementById('sleep').style.display = 'none';
  document.getElementById('night').classList.add('on');
  setTimeout(() => {
    const entry = passNight();
    cam.x = Math.max(0, Math.min(MAP_W * TILE - W, player.x - W / 2));
    cam.y = Math.max(0, Math.min(MAP_H * TILE - H, player.y - H / 2));
    showPage(entry, () => {   // 일기를 다 읽고 "아침으로"
      setTimeout(() => {
        document.getElementById('night').classList.remove('on');
        toast(day + '일째 아침이 밝았어요');
        setTimeout(() => { sleeping = false; }, 800);
      }, 500);
    });
  }, 900);
}

function refreshDay() {
  document.getElementById('day').textContent = day + '일째';
}
