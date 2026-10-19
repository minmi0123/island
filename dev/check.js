// 확인 시나리오 — index.html?check 로 열면 저절로 돌고 결과를 화면에 띄운다 (window.checkResult 에도 남김)
// 순서: 나무 베기 → 모닥불 → 닭 알 → 굽기·먹기 → 닭장 → 낚시 → 생선 굽기·먹기 → 집 → 체력·배고픔·기절 → 가방 → 닭 사냥 → 뗏목 → 떠나기 엔딩 → 저장·불러오기
// 루프 없이 tick() 을 직접 부르고 섬·난수가 시드로 고정이라, 동작이 같으면 마지막 "지문" 도 같다.
//   리팩토링(동작을 안 바꾸는 정리) 전후: 지문이 EXPECT 와 같아야 한다.
//   기능을 바꾼 뒤: 지문이 달라지는 게 맞다. 항목이 전부 통과하면 새 지문을 EXPECT 에 적는다.
// 확인 모드는 저장 키를 따로 쓴다 (island-save-check). 진짜 저장본은 건드리지 않는다.
// 위치를 옮길 때는 걷지 않고 바로 세운다(standAt). 길 찾기가 아니라 섬의 규칙을 확인하는 스크립트라서.
'use strict';
(async () => {
  const EXPECT = '96a509f3';   // 마지막으로 통과한 지문 (2026-10-19, 1단계: 잠 · 일기 빼기, 체력 · 기절, 가방 50칸)

  const out = [];
  const toasts = [];
  const errors = [];
  addEventListener('error', (e) => errors.push(e.message));
  const realToast = toast;
  toast = (msg, frames) => { toasts.push(msg); realToast(msg, frames); };   // 띄운 안내도 지문에 넣는다

  const check = (name, cond, detail = '') => out.push({ name, ok: !!cond, detail: String(detail) });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let frames = 0;
  // n 프레임까지 돌리다 until 이 참이 되면 멈춘다. 참이 됐는지 돌려준다
  function run(n, until) {
    for (let i = 0; i < n; i++) {
      tick();
      if (++frames % 60 === 0) draw();
      if (until && until()) return true;
    }
    return !until;
  }
  function standAt(x, y) {
    if (blocked(x, y)) return false;
    player.x = x; player.y = y;
    player.still = 0; player.fish = null;
    return true;
  }
  const standNear = (x, y, offsets) => offsets.some(([dx, dy]) => standAt(x + dx, y + dy));
  const eggsOnGround = () => items.filter((it) => it.kind === 'egg').length;
  const stumps = () => trees.filter((tr) => tr.state === 'stump').length;

  // 시작 자리에서 가까운 땅부터 차례로 서 보며 버튼을 누른다. 지어졌으면 true
  function build(id) {
    const cx = spawn.i * TILE + 8, cy = spawn.j * TILE + 12;
    const spots = [];
    for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++)
      if (tiles[j][i] > 0) spots.push([i * TILE + 8, j * TILE + 12]);
    spots.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
    const count = () => ({ build: fires.length, coop: coops.length, house: house ? 1 : 0 })[id];
    const before = count();
    for (const [x, y] of spots) for (const dir of [1, -1]) {
      if (!standAt(x, y)) continue;
      player.dir = dir;
      document.getElementById(id).click();
      if (count() > before) return true;
    }
    return false;
  }

  function chopOne() {
    const tr = trees.filter((t) => t.state === 'tree')
      .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
    if (!tr || !standNear(tr.x, tr.y, [[-10, 0], [10, 0], [-10, 2], [10, 2]])) return false;
    const log0 = inv.log;
    return run(600, () => tr.state === 'stump') && run(300, () => inv.log >= log0 + 2);
  }

  // 낚을 수 있는 물가를 찾아 선다
  function goFishing() {
    for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
      if (tiles[j][i] === 0) continue;
      for (let y = j * TILE + 4; y < j * TILE + TILE; y += 4) for (let x = i * TILE + 2; x < i * TILE + TILE; x += 4) {
        if (!standAt(x, y)) continue;
        player.dir = 1;
        if (!nearestTree() && fishingSpot()) return true;
      }
    }
    return false;
  }

  const atFire = () => standNear(fires[0].x, fires[0].y, [[12, 0], [-12, 0], [12, 4], [-12, 4], [0, 10], [0, -8]]);

  function eat() {
    const food = eatWhat();
    const full0 = player.full;
    document.getElementById('eat').click();
    const want = Math.min(FULL_MAX, full0 + FOOD[food].full);
    return Math.abs(player.full - want) < 1e-9;
  }

  function summary() {
    return {
      player: [Math.round(player.x), Math.round(player.y), player.dir, Math.round(player.full * 10) / 10, Math.round(player.hp * 10) / 10],
      inv: { ...inv },
      trees: trees.map((tr) => [tr.state, tr.hp, tr.regrow]),
      fires: fires.map((f) => [f.x, f.y, f.kind ?? null, f.cook ?? null]),
      coops: coops.map((c) => [c.x, c.y, c.timer]),
      house: house && [house.x, house.y],
      chickens: chickens.map((c) => [Math.round(c.x), Math.round(c.y), c.dir, c.egg, c.baby || 0]),
      items: items.map((it) => [it.kind, Math.round(it.x), Math.round(it.y)]),
      stats: Object.values(stats).map(Math.round),
      raft: raft && [Math.round(raft.x), Math.round(raft.y), raft.logs],
      ended,
    };
  }
  function fnv(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  try {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 저장소를 못 쓰면 저장 항목에서 걸린다 */ }

    // 0. 처음 상태
    check('처음 상태', Object.values(inv).every((v) => v === 0) && player.hp === HP_MAX && chickens.length === CHICKEN_COUNT && trees.length > 0,
      `나무 ${trees.length} · 닭 ${chickens.length}`);

    // 1. 나무 베기: 두 그루 → 통나무 4. 도끼질하면 체력이 준다
    const hp0 = player.hp;
    const chopped = chopOne() && chopOne();
    check('나무 베기', chopped && inv.log === 4, `통나무 ${inv.log} · 그루터기 ${stumps()} · 배 ${player.full.toFixed(1)}`);
    check('도끼질하면 체력이 준다', hp0 - player.hp > 4, `체력 ${hp0} → ${player.hp.toFixed(1)}`);

    // 2. 모닥불: 통나무 3
    check('모닥불', build('build') && fires.length === 1 && inv.log === 1, `모닥불 ${fires.length} · 통나무 ${inv.log}`);

    // 3. 닭 알: 기다렸다가 주우러 간다
    const laid = run(EGG_MAX + 60, () => eggsOnGround() > 0);
    const egg = items.find((it) => it.kind === 'egg');
    const stood = laid && standNear(egg.x, egg.y, [[0, 2], [6, 2], [-6, 2], [0, -4], [8, 0], [-8, 0]]);
    const gotEgg = stood && run(200, () => stats.egg >= 1);   // 모닥불 옆이면 줍자마자 구우러 들어가서 inv 로는 못 본다
    check('닭 알 줍기', gotEgg, `주운 알 ${stats.egg} · ${frames} 프레임째`);

    // 4. 굽기 · 먹기
    const fried = atFire() && run(600, () => inv.fried >= 1);
    check('달걀 굽기', fried, `구운 달걀 ${inv.fried}`);
    check('구운 달걀 먹기', fried && eat(), `배 ${player.full.toFixed(1)}`);

    // 5. 닭장: 통나무는 넣어 준다. 곧 병아리가 나온다
    inv.log += COOP_COST;
    refreshHud();
    const log0 = inv.log - COOP_COST;
    check('닭장 짓기', build('coop') && coops.length === 1 && inv.log === log0, `닭장 ${coops.length} · 통나무 ${inv.log}`);
    const n0 = chickens.length;
    const hatched = run(60 * 6, () => chickens.length > n0);
    check('병아리', hatched && chickens[chickens.length - 1].baby > 0, `닭 ${n0} → ${chickens.length}`);

    // 6. 낚시: 낚을 수 있는 물가를 찾아 선다. 던지면 체력이 준다
    const castHp = player.hp;
    const cast = goFishing() && run(FISH_STILL + 5, () => player.fish);
    check('낚싯대 던지기', cast && player.hp < castHp, `자리 ${Math.round(player.x)},${Math.round(player.y)} · 체력 ${castHp.toFixed(1)} → ${player.hp.toFixed(1)}`);
    const waiting = cast && run(40, () => player.fish?.state === 'wait');
    check('일찍 누르면 안내', waiting && reel() === true && toasts[toasts.length - 1].startsWith('아직'), toasts[toasts.length - 1]);
    const bite = waiting && run(60 * 6, () => player.fish?.state === 'bite');
    const caught = bite && reel() === true && run(200, () => inv.fish >= 1);
    check('물고기 낚기', caught, `생선 ${inv.fish}`);

    // 7. 생선 굽기 · 먹기
    const grilled = caught && atFire() && run(600, () => inv.grilled >= 1);
    check('생선 굽기', grilled, `구운 생선 ${inv.grilled}`);
    check('구운 생선 먹기', grilled && eat(), `배 ${player.full.toFixed(1)}`);

    // 8. 집. 잠 · 일기 · 날짜는 없다 (기획.md "시간")
    chopOne();
    inv.log += HOUSE_COST;
    refreshHud();
    check('집 짓기', build('house') && !!house, house ? `집 ${house.x},${house.y}` : '못 지음');
    check('잠 · 일기 · 날짜 없음', !document.getElementById('sleep') && !document.getElementById('book-open') && !document.getElementById('day')
      && typeof goToSleep === 'undefined' && typeof diary === 'undefined');

    // 9. 체력 · 배고픔 · 기절
    standAt(house.x, house.y + 8);
    player.hp = 50;
    run(20);   // 낚싯대를 던지기 전(FISH_STILL)에 잰다
    check('쉬면 체력이 찬다', player.hp > 50 && !working(), `체력 50 → ${player.hp.toFixed(2)}`);
    const full1 = player.full;
    player.full = 0;
    player.hp = 50;
    run(20);
    check('배가 비면 체력이 준다', player.hp < 50, `체력 50 → ${player.hp.toFixed(2)}`);
    const start = { x: player.x, y: player.y };
    const go = (key, n) => { standAt(start.x, start.y); keys[key] = true; run(n); keys[key] = false; return Math.hypot(player.x - start.x, player.y - start.y); };
    player.full = FULL_MAX;
    const fast = ['arrowdown', 'arrowup', 'arrowleft', 'arrowright'].map((k) => [k, go(k, 10)]).sort((x, y) => y[1] - x[1])[0];
    player.full = 0;
    const slow = go(fast[0], 10);
    check('배가 비면 느려진다', fast[1] > 8 && Math.abs(slow - fast[1] / 2) < 1, `10 프레임 ${fast[1].toFixed(1)}px → ${slow.toFixed(1)}px`);
    player.full = full1;

    const faint0 = stats.faint;
    atFire();
    player.hp = 0;
    run(1);
    check('체력 0 → 기절', fainting && document.getElementById('night').classList.contains('on') && stats.faint === faint0 + 1);
    const frozen = { x: player.x, y: player.y, full: player.full };
    run(30);
    check('기절한 동안 멈춤', player.full === frozen.full && player.x === frozen.x);
    await wait(2400);   // 0.9초 검게 → 옮기고 0.7초 → 밝아지고 0.6초 뒤 다시 움직인다
    check('집 앞에서 깨어남', !fainting && player.hp === HP_MAX && Math.hypot(player.x - house.x, player.y - (house.y + 8)) < 16
      && !document.getElementById('night').classList.contains('on'), `${Math.round(player.x)},${Math.round(player.y)} · ${toasts[toasts.length - 1]}`);
    const keepHouse = house;
    house = null;
    player.hp = 0;
    run(1);
    await wait(2400);
    const sx = spawn.i * TILE + 8, sy = spawn.j * TILE + 12;
    check('집이 없으면 처음 바닷가', !fainting && player.hp === HP_MAX && Math.hypot(player.x - sx, player.y - sy) < 16, `${Math.round(player.x)},${Math.round(player.y)}`);
    house = keepHouse;

    // 10. 가방: 50칸 · 한 칸 99개 · 먹기 · 버리기 · 꽉 차면 못 줍는다
    inv.fried = 2; inv.grilled = 1;
    refreshHud();
    document.getElementById('bag-open').click();
    const bagFull0 = player.full;
    run(30);
    const cellEls = () => document.querySelectorAll('#bag-grid .cell');
    check('가방 열기 · 멈춤', bagOpen && player.full === bagFull0 && cellEls().length === BAG_SLOTS
      && document.querySelectorAll('#bag-grid .cell img').length === bagCells().length, document.getElementById('bag-count').textContent);
    const pickCell = (kind) => cellEls()[bagCells().findIndex((c) => c.kind === kind)].click();
    const bagButton = (label) => [...document.querySelectorAll('#bag-info button')].find((el) => el.textContent.startsWith(label));
    pickCell('fried');
    bagButton('먹기').click();   // 생선이 있어도 달걀을 골라 먹는다
    check('가방에서 골라 먹기', inv.fried === 1 && inv.grilled === 1 && Math.abs(player.full - Math.min(FULL_MAX, bagFull0 + FULL_PER_EGG)) < 1e-9);
    pickCell('grilled');
    bagButton('1개 버리기').click();
    check('버리기', inv.grilled === 0 && !bagCells().some((c) => c.kind === 'grilled'));
    inv.log = BAG_STACK + 21;
    renderBag();
    const logCells = bagCells().filter((c) => c.kind === 'log').map((c) => c.count).join(',');
    check('한 칸에 99개', logCells === `${BAG_STACK},21`, logCells);
    pickCell('log');
    bagButton(`${BAG_STACK}개 버리기`).click();
    check('한 칸 통째로 버리기', inv.log === 21, `통나무 ${inv.log}`);
    document.getElementById('bag-close').click();
    check('가방 닫기', !bagOpen && !document.getElementById('bag').classList.contains('on'));

    const keepInv = { ...inv };
    standAt(house.x, house.y + 8);
    inv.egg = 0;
    inv.log = (BAG_SLOTS - (slotsUsed() - stacksOf(inv.log))) * BAG_STACK - 1;   // 빈 칸을 통나무로 다 채우고 마지막 칸에 하나 자리
    const drop = (kind) => items.push({ kind, x: player.x, y: player.y - 2, z: 0, vz: 0, vx: 0, vy: 0, age: 30 });
    drop('egg');
    run(20);
    check('꽉 차면 못 줍는다', slotsUsed() === BAG_SLOTS && inv.egg === 0 && items.some((it) => it.kind === 'egg') && toasts[toasts.length - 1].includes('꽉'),
      `${slotsUsed()}칸 · ${toasts[toasts.length - 1]}`);
    const logs1 = inv.log;
    drop('log');
    run(20);
    check('든 칸에 자리가 있으면 줍는다', inv.log === logs1 + 1 && inv.egg === 0);
    inv.log -= BAG_STACK;
    run(20);
    check('칸을 비우면 다시 줍는다', inv.egg === 1);
    Object.assign(inv, keepInv);
    refreshHud();

    // 11. 닭 사냥: 다 큰 닭에 걸어서 닿으면 잡힌다. 병아리는 안 잡힌다. 닭고기는 구워 먹는다
    const SIDES = [[-3, 0], [3, 0], [0, -3], [0, 3]];
    const walkInto = (ch) => {   // 닭 바로 옆에 서서 닭 쪽으로 한 걸음
      const at = SIDES.find(([dx, dy]) => standAt(ch.x + dx, ch.y + dy));
      if (!at) return false;
      const key = at[0] < 0 ? 'arrowright' : at[0] > 0 ? 'arrowleft' : at[1] < 0 ? 'arrowdown' : 'arrowup';
      keys[key] = true; run(1); keys[key] = false;
      return true;
    };
    const awayFromHens = (c) => chickens.every((o) => o === c || o.baby > 0 || Math.hypot(o.x - c.x, o.y - c.y) > 16);
    spawnChick(coops[0]);
    const hunt0 = stats.hunt, ateMeat0 = stats.ateMeat;
    const baby = chickens.find((c) => c.baby > 0 && awayFromHens(c));
    const hens0 = chickens.length;
    check('병아리는 안 잡힘', !!baby && walkInto(baby) && chickens.includes(baby) && chickens.length === hens0 && stats.hunt === hunt0, `닭 ${hens0} → ${chickens.length}`);
    const hen = chickens.find((c) => !(c.baby > 0) && awayFromHens(c) && SIDES.some(([dx, dy]) => !blocked(c.x + dx, c.y + dy)));
    check('닭 잡기', !!hen && walkInto(hen) && !chickens.includes(hen) && chickens.length === hens0 - 1 && stats.hunt === hunt0 + 1
      && items.some((it) => it.kind === 'meat'), `닭 ${hens0} → ${chickens.length}`);
    check('닭고기 줍기', run(120, () => inv.meat >= 1), `닭고기 ${inv.meat}`);
    atFire();
    const roasted = run(60 * 20, () => inv.roast >= 1);
    const meatFull = player.full;
    check('닭고기 굽기 · 먹기', roasted && eatWhat() === 'roast' && eat() && inv.roast === 0 && stats.ateMeat === ateMeat0 + 1
      && Math.abs(player.full - Math.min(FULL_MAX, meatFull + FULL_PER_MEAT)) < 1e-9, `배 ${meatFull.toFixed(1)} → ${player.full.toFixed(1)}`);

    // 12. 뗏목: 집이 있으면 물가에 터를 잡고 통나무를 엮는다
    let shore = false;
    for (let j = 0; j < MAP_H && !shore; j++) for (let i = 0; i < MAP_W && !shore; i++) {
      if (tiles[j][i] === 0) continue;
      for (let y = j * TILE + 4; y < j * TILE + TILE && !shore; y += 4) for (let x = i * TILE + 2; x < i * TILE + TILE && !shore; x += 4) {
        if (!standAt(x, y)) continue;
        player.dir = 1;
        shore = !nearestTree() && !!raftSpot();
      }
    }
    run(10);
    check('뗏목 버튼', shore && document.getElementById('raft').style.display === 'flex', `자리 ${Math.round(player.x)},${Math.round(player.y)}`);
    document.getElementById('raft').click();
    check('뗏목 터', !!raft && raft.logs === 0);
    inv.log = RAFT_LOGS;
    refreshHud();
    const woven = run(RAFT_FEED * (RAFT_LOGS + 2), () => raftDone());
    run(10);
    check('뗏목 엮기', woven && inv.log === 0 && document.getElementById('leave').style.display === 'flex', `통나무 ${raft.logs}/${RAFT_LOGS}`);

    // 구운 생선이 모자라면 못 떠난다 (달걀은 안 쳐 준다)
    inv.fried = 5; inv.grilled = 1;
    refreshHud();
    document.getElementById('leave').click();
    check('뗏목 뒤 먹기는 달걀부터', eatWhat() === 'fried');
    check('생선이 모자라면 못 떠남', choiceOpen && document.getElementById('go').disabled, document.getElementById('go-need').textContent);
    document.getElementById('later').click();
    check('아직은 안 떠남', !choiceOpen && !sail && !ended);

    // 떠나기 엔딩
    inv.grilled = RAFT_FISH + 1;
    refreshHud();
    document.getElementById('leave').click();
    check('떠날 준비', choiceOpen && !document.getElementById('go').disabled && !document.getElementById('stay'));
    document.getElementById('go').click();
    check('생선 챙김', inv.grilled === 1 && inv.fried === 5 && !!sail, `구운 생선 ${inv.grilled} · 구운 달걀 ${inv.fried}`);
    const shoreAt = { x: player.x, y: player.y };
    run(SAIL_TIME);
    check('뗏목 타고 나감', Math.hypot(player.x - shoreAt.x, player.y - shoreAt.y) > 60 && player.x === raft.x);
    await wait(1100);
    check('떠나기 엔딩', ended === 'leave' && !sail && endingOpen && lastCard.head.endsWith('섬을 떠났다')
      && document.getElementById('ending-next').textContent === '처음부터 다시', lastCard && `${lastCard.head} · ${lastCard.title} · ${lastCard.quote}`);
    window.checkCard = document.getElementById('ending-card').src;   // 캡처용

    // 13. 저장 · 불러오기
    const saved = JSON.stringify(summary());
    check('저장', saveGame() === true);
    inv.log = 999; house = null; player.hp = 1; stats.chop = 0;
    fires.length = 0; coops.length = 0; chickens.length = 0; items.length = 0; raft = null; ended = null;
    check('불러오기', loadGame() === true && JSON.stringify(summary()) === saved, `집 ${!!house} · 닭 ${chickens.length} · 체력 ${player.hp} · 엔딩 ${ended}`);
    // 일기 시절 저장본: ever + today 를 합쳐 기록으로 옮기고, 체력은 다 찬 채로 시작한다
    const keepStats = { ...stats };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, player: { x: player.x, y: player.y, dir: 1, full: 50 }, inv: { log: 3 }, day: 3, sleepCool: 10,
      diary: [{ day: 1, lines: ['집을 지었다!'] }], ever: { chop: 3, egg: 1 }, today: { chop: 2 }, ended: 'stay' }));
    check('예전 저장본 불러오기', loadGame() === true && stats.chop === 5 && stats.egg === 1 && player.hp === HP_MAX && inv.log === 3 && ended === null,
      `나무 ${stats.chop} · 체력 ${player.hp} · 엔딩 ${ended}`);
    Object.assign(stats, keepStats);
    localStorage.setItem(SAVE_KEY, '{broken');
    let broken;
    try { broken = loadGame(); } catch (e) { broken = 'throw: ' + e.message; }
    check('깨진 저장본은 무시', broken === false, broken);
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    check('시나리오 도중 오류', false, e.stack || e.message);
  }
  check('콘솔 오류 없음', errors.length === 0, errors.join(' / '));
  toast = realToast;
  noSave = true;   // 페이지를 떠날 때 확인용 저장본이 다시 생기지 않게

  const print = fnv(JSON.stringify({ s: summary(), toasts, frames, t }));
  if (EXPECT) check('지문이 기준과 같음', print === EXPECT, `${print} (기준 ${EXPECT})`);
  const fail = out.filter((r) => !r.ok).length;
  draw();

  const lines = out.map((r) => `${r.ok ? 'O' : 'X'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  lines.unshift(fail ? `실패 ${fail} / ${out.length}` : `전부 통과 ${out.length}`, `지문 ${print}${EXPECT ? '' : ' (기준 없음)'}`, '');
  const box = document.createElement('pre');
  box.id = 'check';
  box.style.cssText = 'position:fixed;inset:0;margin:0;padding:10px;overflow:auto;background:rgba(29,26,36,.9);color:#fbfaf5;font:12px/1.6 monospace;white-space:pre-wrap;z-index:9';
  if (lastCard) lines.push('', `— 엔딩 카드 — ${lastCard.head} / 칭호 ${lastCard.title} / ${lastCard.quote}`);
  box.textContent = lines.join('\n');
  document.body.appendChild(box);
  window.checkResult = { pass: out.length - fail, fail, print, list: out };
})();
