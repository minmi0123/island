// 그리기
'use strict';

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function disc(cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
    if (dx * dx + dy * dy <= r * r) ctx.fillRect(cx + dx, cy + dy, 1, 1);
}

function drawAxe(x, feet, dir, pose) {
  // dx 는 오른쪽을 볼 때 기준. 왼쪽이면 뒤집는다
  const p = (dx, dy, w, h, color) => rect(dir > 0 ? x + dx : x - dx - w + 1, feet + dy, w, h, color);
  if (pose === 'up') {           // 머리 뒤로 치켜듦
    p(-1, -17, 3, 10, PALETTE.o); p(0, -16, 1, 8, C.handle);
    p(-4, -18, 4, 5, PALETTE.o); p(-3, -17, 2, 3, C.steel);
  } else if (pose === 'strike') { // 앞으로 내리침
    p(4, -6, 10, 3, PALETTE.o); p(5, -5, 8, 1, C.handle);
    p(11, -7, 4, 7, PALETTE.o); p(12, -6, 2, 5, C.steel); p(12, -2, 2, 1, '#ffffff');
  } else {                       // 들고 있기
    p(3, -11, 3, 9, PALETTE.o); p(4, -10, 1, 7, C.handle);
    p(5, -12, 4, 5, PALETTE.o); p(5, -11, 3, 3, C.steel); p(7, -11, 1, 3, '#ffffff');
  }
}

function drawPlayer() {
  const x = Math.round(player.x), feet = Math.round(player.y);
  const bob = player.moving && Math.floor(player.step / 8) % 2 ? -1 : 0;
  const pose = player.swing === 0 ? 'idle' : player.swing < HIT_AT ? 'up' : 'strike';
  ctx.globalAlpha = 0.2;
  rect(x - 4, feet, 9, 1, PALETTE.o);
  ctx.globalAlpha = 1;
  if (player.fish) { drawFishing(x, feet); return; }
  if (pose === 'up') drawAxe(x, feet + bob, player.dir, pose);
  ctx.drawImage(SPR.hero[player.dir > 0 ? 'right' : 'left'], x - 5, feet - 10 + bob);
  if (pose !== 'up') drawAxe(x, feet + bob, player.dir, pose);
}

function line(x0, y0, x1, y1, color) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = color;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function drawFishing(x, feet) {
  const f = player.fish;
  const d = f.bx > x + 2 ? 1 : f.bx < x - 2 ? -1 : player.dir;   // 낚싯대는 찌 쪽으로
  ctx.drawImage(SPR.hero[d > 0 ? 'right' : 'left'], x - 5, feet - 10);
  const hx = x + d * 4, hy = feet - 4;              // 손
  const tx = x + d * 13, ty = feet - 17;            // 낚싯대 끝
  line(hx, hy, tx, ty, PALETTE.T);
  line(hx - d, hy, tx - d, ty, C.handle);
  let bx = f.bx, by = f.by;
  if (f.state === 'cast') {                          // 날아가는 중: 끝에서 찌 자리까지 포물선
    const k = 1 - f.timer / 20;
    bx = tx + (f.bx - tx) * k;
    by = ty + (f.by - ty) * k - Math.sin(k * Math.PI) * 12;
  } else if (f.state === 'bite') {
    by += 2;                                         // 찌가 쏙
    if (Math.floor(f.timer / 4) % 2) rect(bx - 4, f.by + 1, 9, 1, C.foam);
  } else if (f.state !== 'got') {
    by += Math.floor(t / 30) % 2;                    // 둥실둥실
  }
  if (f.state !== 'got') {
    line(tx, ty, bx, by - 3, '#f4f4f4');
    rect(bx - 1, by - 3, 3, 2, '#e8434a');
    rect(bx - 1, by - 1, 3, 1, '#ffffff');
    if (f.state !== 'cast') rect(bx - 2, by, 5, 1, C.foam);
  }
  if (f.state === 'bite') {                          // 머리 위 느낌표
    rect(x - 1, feet - 25, 4, 8, PALETTE.o);
    rect(x, feet - 24, 2, 4, '#e8434a');
    rect(x, feet - 19, 2, 1, '#e8434a');
  }
}

function drawTree(tr) {
  const x = Math.round(tr.x), y = Math.round(tr.y);
  if (tr.state === 'stump') { ctx.drawImage(SPR.stump, x - 5, y - 5); return; }
  const sx = tr.shake > 0 ? (Math.floor(tr.shake / 2) % 2 ? 1 : -1) : 0;
  ctx.globalAlpha = 0.2;
  rect(x - 6, y, 13, 1, PALETTE.o);
  ctx.globalAlpha = 1;
  ctx.drawImage(SPR.tree, x - 8 + sx, y - 21);
}

function drawHpBar(tr) {
  if (tr.state !== 'tree' || tr.hpShow <= 0) return;
  const x = Math.round(tr.x) - 7, y = Math.round(tr.y) - 26;
  rect(x, y, 14, 4, PALETTE.o);
  rect(x + 1, y + 1, 12, 2, '#5a4a6a');
  rect(x + 1, y + 1, Math.round(12 * tr.hp / tr.maxHp), 2, '#e8434a');
}

function drawItem(it) {
  const x = Math.round(it.x), y = Math.round(it.y);
  const float = it.z === 0 ? (Math.floor((t + it.age) / 20) % 2) : 0;
  ctx.globalAlpha = 0.2;
  rect(x - 3, y + 1, 7, 1, PALETTE.o);
  ctx.globalAlpha = 1;
  if (it.kind === 'egg') ctx.drawImage(SPR.egg, x - 3, y - 5 - Math.round(it.z) - float);
  else if (it.kind === 'fried') ctx.drawImage(SPR.fried, x - 3, y - 5 - Math.round(it.z) - float);
  else if (it.kind === 'log') ctx.drawImage(SPR.log, x - 4, y - 4 - Math.round(it.z) - float);
  else ctx.drawImage(SPR[it.kind], x - 5, y - 5 - Math.round(it.z) - float);   // 물고기 · 닭고기
}

function drawChicken(ch) {
  const x = Math.round(ch.x), y = Math.round(ch.y);
  const baby = ch.baby > 0;
  const set = (baby ? SPR.chick : SPR.chicken)[ch.dir > 0 ? 'right' : 'left'];
  const moving = ch.state === 'walk' || ch.state === 'flee';
  let img = set.stand;
  if (moving) img = Math.floor(ch.step / (ch.state === 'flee' ? 4 : 8)) % 2 ? set.walk : set.stand;
  else if (ch.state === 'peck') img = Math.floor(ch.timer / 8) % 2 ? (set.peck || set.walk) : set.stand;
  const hop = ch.state === 'flee' && Math.floor(ch.step / 4) % 2 ? -2 : 0;
  ctx.globalAlpha = 0.2;
  rect(x - (baby ? 2 : 4), y, baby ? 5 : 9, 1, PALETTE.o);
  ctx.globalAlpha = 1;
  if (baby) ctx.drawImage(img, x - 3, y - 6 + hop);
  else ctx.drawImage(img, x - 5, y - 9 + hop);
  if (ch.laid > 0 && Math.floor(ch.laid / 6) % 2) {   // 알 낳고 반짝
    rect(x, y - 14, 1, 3, '#ffb000');
    rect(x - 1, y - 13, 3, 1, '#ffb000');
  }
}

function flameLayer(cx, baseY, maxW, h, color, phase) {
  for (let i = 0; i < h; i++) {
    const w = Math.max(1, Math.round(maxW * Math.pow(1 - i / h, 0.7)));
    const off = Math.round(Math.sin(t * 0.25 + i * 0.8 + phase) * (i / h) * 1.5);
    rect(cx - Math.floor(w / 2) + off, baseY - i, w, 1, color);
  }
}

function drawFire(f) {
  const x = Math.round(f.x), y = Math.round(f.y);
  ctx.globalAlpha = 0.12 + (Math.floor(t / 8) % 2) * 0.03;
  disc(x, y - 4, 16, '#ffd36a');
  ctx.globalAlpha = 1;
  ctx.drawImage(SPR.fireBase, x - 6, y - 4);
  const h = 10 + (Math.floor(t / 7) % 2);
  flameLayer(x, y - 3, 7, h, '#e8503a', 0);
  flameLayer(x, y - 3, 5, h - 3, '#ff9a3c', 1.5);
  flameLayer(x, y - 3, 3, h - 6, '#ffe066', 3);
  if (f.cook != null) {   // 불 위의 달걀 + 진행 막대
    const shake = Math.floor(t / 6) % 2;
    rect(x - 5, y - 13, 11, 1, PALETTE.o);   // 석쇠
    const ck = COOK[f.kind];
    const img = SPR[f.cook > ck.time * 0.6 ? ck.out : f.kind];
    ctx.drawImage(img, x - (img.width >> 1) + shake, y - 13 - img.height);
    rect(x - 7, y - 25, 14, 4, PALETTE.o);
    rect(x - 6, y - 24, 12, 2, '#5a4a6a');
    rect(x - 6, y - 24, Math.round(12 * f.cook / ck.time), 2, '#f5b93a');
  }
}

// 집 38x34: 통나무 벽 + 문 + 창 두 개 + 파란 지붕 + 굴뚝
function drawHouse(h) {
  const x = Math.round(h.x), y = Math.round(h.y);
  ctx.globalAlpha = 0.2;
  rect(x - 17, y, 35, 2, PALETTE.o);
  ctx.globalAlpha = 1;
  rect(x + 7, y - 34, 6, 12, PALETTE.o);                    // 굴뚝 (지붕 뒤)
  rect(x + 8, y - 33, 4, 11, '#9a9aa8');
  rect(x + 8, y - 33, 4, 1, '#c4c4d0');
  rect(x - 15, y - 18, 30, 19, PALETTE.o);                  // 벽
  rect(x - 14, y - 17, 28, 17, '#d9a066');
  for (let k = 0; k < 4; k++) rect(x - 14, y - 14 + k * 4, 28, 1, '#b07a48');
  [x - 12, x + 6].forEach((wx) => {                         // 창
    rect(wx, y - 14, 7, 6, PALETTE.o);
    rect(wx + 1, y - 13, 5, 4, '#9fd3f0');
    rect(wx + 1, y - 13, 2, 1, '#ffffff');
    rect(wx + 3, y - 13, 1, 4, PALETTE.o);
  });
  rect(x - 4, y - 11, 9, 12, PALETTE.o);                    // 문
  rect(x - 3, y - 10, 7, 11, '#7a4a2e');
  rect(x - 3, y - 10, 7, 1, '#9a6248');
  rect(x + 2, y - 5, 1, 1, '#ffe066');
  for (let i = 0; i <= 13; i++) rect(x - 19 + i, y - 19 - i, 38 - i * 2, 1, PALETTE.o);   // 지붕
  for (let i = 0; i < 13; i++) rect(x - 18 + i, y - 19 - i, 36 - i * 2, 1, i % 3 === 2 ? '#4a669a' : '#5f7fb8');
  rect(x - 18, y - 19, 36, 1, '#3d4f78');
}

// 닭장 26x26: 판자 벽 + 문 + 빨간 지붕
function drawCoop(c) {
  const x = Math.round(c.x), y = Math.round(c.y);
  ctx.globalAlpha = 0.2;
  rect(x - 13, y, 27, 2, PALETTE.o);
  ctx.globalAlpha = 1;
  rect(x - 12, y - 14, 24, 15, PALETTE.o);                  // 벽
  rect(x - 11, y - 13, 22, 13, '#c98a5a');
  for (let k = 0; k < 4; k++) rect(x - 11, y - 11 + k * 3, 22, 1, '#a86e45');
  rect(x - 4, y - 9, 8, 10, PALETTE.o);                     // 문
  rect(x - 3, y - 8, 6, 9, '#5a3a4a');
  rect(x - 3, y - 2, 6, 3, '#e8c25a');                      // 짚
  rect(x - 2, y - 3, 1, 1, '#e8c25a'); rect(x + 1, y - 3, 1, 1, '#e8c25a');
  for (let i = 0; i <= 10; i++) rect(x - 15 + i, y - 15 - i, 30 - i * 2, 1, PALETTE.o);   // 지붕
  for (let i = 0; i < 10; i++) rect(x - 14 + i, y - 15 - i, 28 - i * 2, 1, i % 3 === 2 ? '#9c3c3c' : '#c4524e');
  ctx.drawImage(SPR.egg, x - 3, y - 22);                    // 간판
}

// 뗏목 24x12 (+돛): 엮은 통나무만큼 세로 통나무가 늘어난다. 터만 잡았을 땐 물 위에 점선
function drawRaft(rf) {
  const x = Math.round(rf.x), y = Math.round(rf.y) + (Math.floor(t / 30) % 2);   // 둥실
  const n = Math.ceil(6 * rf.logs / RAFT_LOGS);
  if (n === 0) {
    for (let k = 0; k < 26; k += 4) { rect(x - 13 + k, y - 6, 2, 1, C.foam); rect(x - 13 + k, y + 5, 2, 1, C.foam); }
    for (let k = 0; k < 12; k += 4) { rect(x - 13, y - 6 + k, 1, 2, C.foam); rect(x + 12, y - 6 + k, 1, 2, C.foam); }
  }
  rect(x - 14, y + 6, 28, 1, C.foam);                         // 물결
  for (let k = 0; k < n; k++) {
    const lx = x - 12 + k * 4;                                // 6개 = 24px
    rect(lx, y - 6, 4, 12, PALETTE.o);
    rect(lx + 1, y - 5, 2, 10, PALETTE.t);
    rect(lx + 2, y - 5, 1, 10, PALETTE.T);
    rect(lx + 1, y - 5, 2, 1, PALETTE.c);                      // 자른 면
  }
  if (n >= 3) { rect(x - 12, y - 3, n * 4, 1, '#e8d3a0'); rect(x - 12, y + 2, n * 4, 1, '#e8d3a0'); }   // 밧줄
  if (rf.logs >= RAFT_LOGS) {                                  // 돛대 + 돛
    rect(x + 4, y - 26, 3, 22, PALETTE.o);
    rect(x + 5, y - 25, 1, 21, C.handle);
    const flap = Math.floor(t / 20) % 2;
    rect(x - 7, y - 24, 12 + flap, 13, PALETTE.o);
    rect(x - 6, y - 23, 10 + flap, 11, '#fbfaf5');
    rect(x - 6, y - 19, 10 + flap, 2, '#e8434a');
  } else if (nearRaft()) {                                     // 엮은 만큼 막대
    rect(x - 11, y - 13, 22, 4, PALETTE.o);
    rect(x - 10, y - 12, 20, 2, '#5a4a6a');
    rect(x - 10, y - 12, Math.round(20 * rf.logs / RAFT_LOGS), 2, '#f5b93a');
  }
}

function draw() {
  const sx = cam.shake ? Math.round(rand() * 2 - 1) : 0;
  const cx = Math.round(cam.x) + sx, cy = Math.round(cam.y);
  ctx.save();
  rect(0, 0, W, H, C.water);   // 지도 밖도 바다
  ctx.drawImage(mapCanvas, cx, cy, W, H, 0, 0, W, H);
  ctx.translate(-cx, -cy);

  waves.forEach((wv) => {
    if (wv.x < cx - 8 || wv.x > cx + W + 8 || wv.y < cy - 8 || wv.y > cy + H + 8) return;
    const ph = Math.floor((t + wv.p) / 30) % 2;
    rect(wv.x + ph, wv.y, 3, 1, C.foam);
    rect(wv.x + 4 - ph, wv.y + 2, 2, 1, C.foam);
  });

  // y 가 큰(아래쪽) 것을 나중에 그려 앞에 보이게
  const list = [];
  trees.forEach((tr) => list.push({ y: tr.y, f: () => drawTree(tr) }));
  fires.forEach((f) => list.push({ y: f.y, f: () => drawFire(f) }));
  coops.forEach((c) => list.push({ y: c.y, f: () => drawCoop(c) }));
  if (house) list.push({ y: house.y, f: () => drawHouse(house) });
  if (raft) list.push({ y: raft.y - 10, f: () => drawRaft(raft) });   // 위에 선 주인공보다 먼저
  items.forEach((it) => list.push({ y: it.y, f: () => drawItem(it) }));
  chickens.forEach((ch) => list.push({ y: ch.y, f: () => drawChicken(ch) }));
  list.push({ y: player.y + 0.5, f: drawPlayer });
  list.sort((a, b) => a.y - b.y).forEach((e) => e.f());

  parts.forEach((p) => {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    rect(p.x, p.y, p.w, 1, p.color);
  });
  ctx.globalAlpha = 1;
  trees.forEach(drawHpBar);
  ctx.restore();

  if (joy) {   // 가상 조이스틱
    const r = canvas.getBoundingClientRect();
    const bx = Math.round((joy.sx - r.left) / scale), by = Math.round((joy.sy - r.top) / scale);
    let dx = (joy.x - joy.sx) / scale, dy = (joy.y - joy.sy) / scale;
    const l = Math.hypot(dx, dy), max = JOY_R / scale;
    if (l > max) { dx = dx / l * max; dy = dy / l * max; }
    ctx.globalAlpha = 0.3;
    disc(bx, by, 12, '#ffffff');
    ctx.globalAlpha = 0.7;
    disc(Math.round(bx + dx), Math.round(by + dy), 5, '#ffffff');
    ctx.globalAlpha = 1;
  }
}
