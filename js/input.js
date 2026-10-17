// 입력: 끌기 조이스틱 · 방향키 · 톡(낚시)
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
  if (e.target.closest('button')) return;
  if (reel()) return;   // 낚시 중이면 톡 = 당기기
  joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY };
});
addEventListener('pointermove', (e) => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
addEventListener('pointerup', (e) => { if (joy && e.pointerId === joy.id) joy = null; });
addEventListener('pointercancel', () => { joy = null; });

const JOY_R = 36;   // 화면 px
function readInput() {
  let vx = 0, vy = 0;
  if (keys.arrowleft || keys.a) vx -= 1;
  if (keys.arrowright || keys.d) vx += 1;
  if (keys.arrowup || keys.w) vy -= 1;
  if (keys.arrowdown || keys.s) vy += 1;
  if (vx || vy) { const l = Math.hypot(vx, vy); return { vx: vx / l, vy: vy / l }; }
  if (joy) {
    const dx = joy.x - joy.sx, dy = joy.y - joy.sy, l = Math.hypot(dx, dy);
    if (l > 6) { const k = Math.min(1, l / JOY_R) / l; return { vx: dx * k, vy: dy * k }; }
  }
  return { vx: 0, vy: 0 };
}
