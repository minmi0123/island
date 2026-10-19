// 한 판 해 보기 봇: 숫자(js/data.js)를 바꾼 뒤 처음부터 엔딩까지 걸리는 시간을 잰다
// 입력은 방향키 · 스페이스 · 버튼 클릭만. 게임 상태는 읽기만 한다 (순간이동 · 통나무 넣기 없음)
// 안내가 시키는 대로: 모닥불 → 닭장 → 집 → 뗏목 → 생선 낚기 → 떠나기. 쉬지 않고 일만 한다 (기절은 play.log 에 남는다)
// 쓰는 법: 보통 모드(index.html, 저장본 지우고)에서 이 파일을 <script> 로 붙인다. 실제 속도로 돈다 (4분쯤)
//   window.play.done 이 참이 되면 끝. play.total = 걸린 초, play.log = 시간별 기록, play.spent = 한 일별 프레임
//   봇은 길을 아는 사람이라 사람보다 빠르다. 처음 하는 사람은 두세 배로 본다
'use strict';
(() => {
  const t0 = performance.now();
  const log = [];
  const sec = () => +((performance.now() - t0) / 1000).toFixed(1);
  const L = (msg) => { log.push({ s: sec(), t, hp: Math.round(player.hp), msg }); };
  const spent = {};   // 하는 일별 프레임
  window.play = { log, spent, done: false };

  // ── 입력 ──
  const held = {};
  function press(k, on) {
    if (!!held[k] === on) return;
    held[k] = on;
    dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: k }));
  }
  function steer(vx, vy) {
    press('ArrowLeft', vx < -0.38); press('ArrowRight', vx > 0.38);
    press('ArrowUp', vy < -0.38); press('ArrowDown', vy > 0.38);
  }
  const stop = () => steer(0, 0);
  const tap = () => { dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); dispatchEvent(new KeyboardEvent('keyup', { key: ' ' })); };
  const shown = (id) => { const el = document.getElementById(id); return el && getComputedStyle(el).display !== 'none'; };
  function click(id) { if (!shown(id)) return false; document.getElementById(id).click(); return true; }
  let lastToast = '';
  new MutationObserver(() => {
    const m = document.getElementById('toast').textContent;
    if (m !== lastToast) { lastToast = m; L('안내: ' + m); }
  }).observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true });

  // ── 길 찾기 (4px 칸 BFS) ──
  const G = 4, GW = MAP_W * TILE / G, GH = MAP_H * TILE / G;
  const cellOf = (x, y) => [Math.floor(x / G), Math.floor(y / G)];
  const walk = (cx, cy, loose) => cx >= 0 && cy >= 0 && cx < GW && cy < GH
    && (loose ? [[0, 0]] : [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]).every(([dx, dy]) => !blocked(cx * G + 2 + dx, cy * G + 2 + dy));   // 경계에 딱 붙은 칸은 뺀다
  // goal(x, y) 를 만족하는 가장 가까운 칸까지 길
  function findPath(goal) {
    const [sx, sy] = cellOf(player.x, player.y);
    const prev = new Int32Array(GW * GH).fill(-2);
    const q = [sx + sy * GW];
    prev[q[0]] = -1;
    for (let h = 0; h < q.length; h++) {
      const c = q[h], cx = c % GW, cy = (c / GW) | 0;
      const loose = Math.abs(cx - sx) + Math.abs(cy - sy) <= 2;   // 출발점 둘레는 붙어 있어도 빠져나가게
      if (goal(cx * G + 2, cy * G + 2)) {
        const path = [];
        for (let k = c; k !== -1; k = prev[k]) path.push([(k % GW) * G + 2, ((k / GW) | 0) * G + 2]);
        return path.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy, n = nx + ny * GW;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || prev[n] !== -2 || !walk(nx, ny, loose)) continue;
        if (dx && dy && (!walk(cx + dx, cy, loose) || !walk(cx, cy + dy, loose))) continue;   // 모서리 끼임 방지
        prev[n] = c;
        q.push(n);
      }
    }
    return null;
  }

  let path = null, pathKey = '', pathAge = 0, noPath = 0;
  // goal 쪽으로 한 걸음. 도착했으면 true
  function goTo(key, goal) {
    if (goal(player.x, player.y)) { stop(); path = null; return true; }
    if (!path || pathKey !== key || ++pathAge > 30) { path = findPath(goal); pathKey = key; pathAge = 0; }
    if (!path || !path.length) {   // 길이 없다: 좁은 틈에 끼었으면 아무 쪽으로 조금 움직여 본다
      stop();
      if (++noPath > 20) { noPath = 0; nudge = 10; nudgeDir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]; pathAge = 99; }
      return false;
    }
    noPath = 0;
    while (path.length && Math.hypot(path[0][0] - player.x, path[0][1] - player.y) < (path.length > 1 ? 1.5 : 0.7)) path.shift();   // 마지막 칸은 가운데까지
    if (!path.length) {
      stop(); path = null;
      if (goal(player.x, player.y)) return true;
      if (++noPath > 20) { noPath = 0; nudge = 10; nudgeDir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]; }
      return false;
    }
    const [wx, wy] = path[0];
    const dx = wx - player.x, dy = wy - player.y;
    steer(Math.abs(dx) > 0.45 ? Math.sign(dx) : 0, Math.abs(dy) > 0.45 ? Math.sign(dy) : 0);   // 칸 가운데로 맞춰 가며 간다
    return false;
  }

  // ── 자리 판정 (게임 규칙을 그대로 옮김) ──
  const fishOk = (x, y) => [[22, -2], [-22, -2], [0, 24], [0, -20]].some(([dx, dy]) => {
    const bx = Math.round(x + dx), by = Math.round(y + dy);
    return waterAt(bx, by) && waterAt(bx - 4, by) && waterAt(bx + 4, by) && waterAt(bx, by - 7) && waterAt(bx, by + 4);
  });
  const treeNear = (x, y) => trees.some((tr) => tr.state === 'tree' && Math.abs(tr.x - x) <= REACH_X && Math.abs(tr.y - y) <= REACH_Y);
  const raftOkAt = (x, y, dx, dy) => [[0, 0], [-13, -8], [13, -8], [-13, 6], [13, 6]].every(([ox, oy]) => waterAt(Math.round(x + dx) + ox, Math.round(y + dy) + oy));
  const fireFree = (x, y) => landAt(x - 6, y - 2) && landAt(x + 6, y - 2) && landAt(x - 6, y) && landAt(x + 6, y)
    && trees.every((tr) => Math.abs(tr.x - x) > 10 || Math.abs(tr.y - y) > 6)
    && fires.every((f) => Math.abs(f.x - x) > 12 || Math.abs(f.y - y) > 6)
    && coops.every((c) => Math.abs(c.x - x) > 19 || y < c.y - 12 || y > c.y + 5)
    && (!house || Math.abs(house.x - x) > 23 || y < house.y - 15 || y > house.y + 5);
  const nearFire = (x, y) => fires.some((f) => Math.abs(x - f.x) < COOK_REACH - 2 && Math.abs(y - f.y) < COOK_REACH - 8);
  const builds = {
    build: { off: 14, ok: (x, y) => fireFree(Math.round(x), Math.round(y)) },
    coop: { off: 24, ok: (x, y) => areaFree(Math.round(x), Math.round(y + 4), 13, 12, 8) },
    house: { off: 28, ok: (x, y) => areaFree(Math.round(x), Math.round(y + 4), 17, 15, 12) },
  };

  // 지을 자리: 서 있을 칸 + 바라볼 방향. 집에서 너무 멀지 않게 (시작점 근처)
  let buildFace = 0, faceT = 0;
  function doBuild(id) {
    const b = builds[id];
    const okHere = (x, y) => [1, -1].find((d) => b.ok(x + d * b.off, y));
    if (!goTo('build-' + id, (x, y) => okHere(x, y) !== undefined)) return;
    const d = okHere(player.x, player.y);
    if (player.dir !== d) { press(d > 0 ? 'ArrowRight' : 'ArrowLeft', true); return; }   // 한 프레임 눌러 돌아선다
    stop();
    if (b.ok(player.x + d * b.off, player.y)) { click(id); L('지음: ' + id); }
  }

  // ── 상태 ──
  let mode = '', biteSeen = 0, choiceSeen = false, wasFaint = false;
  const food = () => inv.fried + inv.grilled;
  const raw = () => inv.egg + inv.fish;
  const groundItems = () => items.filter((it) => it.z === 0 && it.vz === 0 && landAt(it.x, it.y + 2));
  function setMode(m) { if (m !== mode) { mode = m; L('할 일: ' + m); } }
  function nearestBy(list, f) { let b = null, bd = 1e9; list.forEach((o) => { const d = f(o); if (d < bd) { bd = d; b = o; } }); return b; }

  function goChop() {
    const st = trees.filter((tr) => tr.state === 'tree');
    const tr = nearestBy(st, (o) => Math.hypot(o.x - player.x, o.y - player.y));
    if (!tr) return goFish();
    if (player.swing > 0 || nearestTree()) { stop(); spent.chop = (spent.chop || 0) + 1; return; }
    goTo('tree' + tr.x + ',' + tr.y, (x, y) => Math.abs(tr.x - x) <= REACH_X - 3 && Math.abs(tr.y - y) <= REACH_Y - 3);
    spent.walk = (spent.walk || 0) + 1;
  }
  function goFish() {
    const f = player.fish;
    if (f) {
      stop();
      if (f.state === 'bite') { if (++biteSeen === 18) tap(); } else biteSeen = 0;   // 사람 반응 0.3초
      spent.fish = (spent.fish || 0) + 1;
      return;
    }
    if (goTo('fish', (x, y) => fishOk(x, y) && !treeNear(x, y) && !(raft && Math.hypot(x - raft.x, y - raft.y) < 34))) { spent.fish = (spent.fish || 0) + 1; return; }
    spent.walk = (spent.walk || 0) + 1;
  }
  const noReach = new WeakSet();
  function goPick() {
    const its = groundItems().filter((o) => !noReach.has(o));
    const it = nearestBy(its, (o) => Math.hypot(o.x - player.x, o.y - player.y));
    if (!it || Math.hypot(it.x - player.x, it.y - player.y) > 90) return false;
    const there = goTo('item' + Math.round(it.x) + ',' + Math.round(it.y), (x, y) => Math.hypot(x - it.x, y - 2 - it.y) < 14);   // 28px 안이면 저절로 끌려온다
    if (!there && !path) { noReach.add(it); L('못 감: ' + it.kind + ' @' + Math.round(it.x) + ',' + Math.round(it.y)); }
    spent.pick = (spent.pick || 0) + 1;
    return true;
  }

  let nudge = 0, nudgeDir = [0, 0];
  function step() {
    if (window.play.done) return;
    if (nudge > 0) { nudge--; steer(nudgeDir[0], nudgeDir[1]); if (!nudge) path = null; return; }   // 끼었을 때 아무 쪽으로 조금
    if (endingOpen) {
      stop();
      if (!window.play.done) { L('엔딩 카드'); window.play.done = true; window.play.total = sec(); }
      return;
    }
    if (fainting) {
      stop();
      if (!wasFaint) { wasFaint = true; L('== 기절 (' + (house ? '집' : '바닷가') + '에서 깨어남) =='); }
      spent.faint = (spent.faint || 0) + 1;
      return;
    }
    wasFaint = false;
    if (choiceOpen) {
      stop();
      const go = document.getElementById('go');
      if (!go.disabled) { L('떠나기 누름'); go.click(); }
      else { L('쪽지: ' + document.getElementById('go-need').textContent); click('later'); }
      return;
    }
    if (sail) { spent.sail = (spent.sail || 0) + 1; return; }

    // 배고프면 먹는다 (뗏목 다 됐으면 떠날 음식은 남긴다)
    const saving = raft && inv.fried === 0 && inv.grilled <= RAFT_FISH;   // 떠날 생선은 남긴다
    if (player.full < 30 && food() > 0 && !saving) { click('eat'); L('먹음 (배 ' + Math.round(player.full) + ')'); }

    // 날것이 있고 모닥불이 있으면 굽기
    if (fires.length && raw() > 0) {
      setMode('굽기');
      if (goTo('fire', nearFire)) spent.cook = (spent.cook || 0) + 1; else spent.walk = (spent.walk || 0) + 1;
      return;
    }
    // 가까운 통나무 · 알 · 구운 것 줍기
    if (goPick()) { setMode('줍기'); return; }

    // 짓기: 모닥불 → 닭장 → 집 (안내 순서)
    if (!fires.length) { if (inv.log >= FIRE_COST) { setMode('모닥불 짓기'); doBuild('build'); } else { setMode('나무 (모닥불)'); goChop(); } return; }
    if (!coops.length) { if (inv.log >= COOP_COST) { setMode('닭장 짓기'); doBuild('coop'); } else { setMode('나무 (닭장)'); goChop(); } return; }
    if (!house) { if (inv.log >= HOUSE_COST) { setMode('집 짓기'); doBuild('house'); } else { setMode('나무 (집)'); goChop(); } return; }

    // 뗏목 (집이 있으면)
    {
      if (!raft) {
        setMode('뗏목 터');
        const dirs = [[24, 0], [-24, 0], [0, 26], [0, -22]];
        if (goTo('raft', (x, y) => dirs.some(([dx, dy]) => raftOkAt(x, y, dx, dy)))) {
          const want = raftOkAt(player.x, player.y, 24 * player.dir, 0) || raftOkAt(player.x, player.y, -24 * player.dir, 0) || raftOkAt(player.x, player.y, 0, 26) || raftOkAt(player.x, player.y, 0, -22);
          if (want && click('raft')) L('뗏목 터 잡음');
        }
        return;
      }
      if (!raftDone()) {
        const need = RAFT_LOGS - raft.logs;
        if (inv.log >= need || (inv.log >= 6 && trees.every((tr) => tr.state !== 'tree' || Math.hypot(tr.x - raft.x, tr.y - raft.y) > 80))) {
          setMode('뗏목 엮기');
          if (goTo('toRaft', (x, y) => Math.hypot(x - raft.x, y - raft.y) < 28)) spent.raft = (spent.raft || 0) + 1; else spent.walk = (spent.walk || 0) + 1;
        } else { setMode('나무 (뗏목)'); goChop(); }
        return;
      }
      if (!choiceSeen || fishCount() >= RAFT_FISH) {
        setMode('떠나러 감');
        if (shown('leave') || goTo('toRaft', (x, y) => Math.hypot(x - raft.x, y - raft.y) < 28)) { stop(); if (click('leave')) choiceSeen = true; }
        return;
      }
      // 음식 모으기: 알 줍기는 위에서 했다. 남은 건 낚시
      setMode('떠날 생선 (낚시)');
      goFish();
      return;
    }

  }

  let stuckAt = null, stuckN = 0;
  function loop() {
    try {
      step();
      // 같은 자리에서 오래 걷는 척만 하면 기록
      if (!fainting && player.moving && stuckAt && Math.hypot(stuckAt[0] - player.x, stuckAt[1] - player.y) < 0.5) { if (++stuckN === 60) { L('막힘? ' + mode + ' @' + Math.round(player.x) + ',' + Math.round(player.y)); nudge = 12; nudgeDir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]; stuckN = 0; } }
      else { stuckN = 0; stuckAt = [player.x, player.y]; }
    } catch (e) { L('봇 오류: ' + e.message); window.play.done = true; }
    if (!window.play.done) requestAnimationFrame(loop);
  }
  L('시작');
  requestAnimationFrame(loop);
})();
