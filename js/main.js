// 시작: 불러오기 · 루프 · 확인 모드
'use strict';

if (!CHECK && loadGame()) {
  hints.length = 0;   // 이어 하는 사람에게는 조작 안내를 다시 띄우지 않는다
  toast('이어서 할게요', 120);
  if (ended === 'leave') showEnding('leave');   // 이미 떠난 섬: 엔딩 카드부터
}
refreshHud();
refreshDay();

cam.x = Math.max(0, Math.min(MAP_W * TILE - W, player.x - W / 2));
cam.y = Math.max(0, Math.min(MAP_H * TILE - H, player.y - H / 2));

function tick() { update(); t++; }   // 1/60 초 한 번

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= 1000 / 60) { tick(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(frame);
}
// 확인 모드는 루프를 돌리지 않는다. dev/check.js 가 tick() 을 직접 불러 매번 같은 결과가 나오게 한다
if (CHECK) {
  draw();
  const s = document.createElement('script');
  s.src = 'dev/check.js';
  document.body.appendChild(s);
} else requestAnimationFrame(frame);

window.game = { player, trees, items, inv, fires, coops, chickens, tiles, fishingSpot, refreshHud, saveGame, getHouse: () => house, getDay: () => day, setSleepCool: (v) => { sleepCool = v; } };   // 확인용
