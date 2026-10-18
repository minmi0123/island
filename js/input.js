// 입력: 끌기 조이스틱 · 방향키 · 톡(낚시)
// 낚시 중 터치: 찌가 들어가 있으면 바로 당긴다. 아니면 조이스틱으로 시작해서, 안 끌고 떼면 톡, 끌면 걸어 나간다
'use strict';

const keys = {};
addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); reel(); }
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

let joy = null;
let scale = 1;
wrap.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, #book, #bag, #choice, #ending')) return;
  if (player.fish && player.fish.state === 'bite') { reel(); return; }   // 늦으면 놓치니까 누르는 순간 당긴다
  joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, fishing: !!player.fish };
});
addEventListener('pointermove', (e) => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
addEventListener('pointerup', (e) => {
  if (!joy || e.pointerId !== joy.id) return;
  if (joy.fishing && Math.hypot(joy.x - joy.sx, joy.y - joy.sy) <= JOY_DEAD) reel();   // 끌지 않고 뗐으면 톡
  joy = null;
});
addEventListener('pointercancel', () => { joy = null; });

const JOY_R = 36;   // 화면 px
const JOY_DEAD = 6;   // 이만큼 안 끌면 걷지 않는다 (톡으로 본다)
function readInput() {
  let vx = 0, vy = 0;
  if (keys.arrowleft || keys.a) vx -= 1;
  if (keys.arrowright || keys.d) vx += 1;
  if (keys.arrowup || keys.w) vy -= 1;
  if (keys.arrowdown || keys.s) vy += 1;
  if (vx || vy) { const l = Math.hypot(vx, vy); return { vx: vx / l, vy: vy / l }; }
  if (joy) {
    const dx = joy.x - joy.sx, dy = joy.y - joy.sy, l = Math.hypot(dx, dy);
    if (l > JOY_DEAD) { const k = Math.min(1, l / JOY_R) / l; return { vx: dx * k, vy: dy * k }; }
  }
  return { vx: 0, vy: 0 };
}
