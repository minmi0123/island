// 확인 시나리오 — index.html?check 로 열면 저절로 돌고 결과를 화면에 띄운다 (window.checkResult 에도 남김)
// 순서: 나무 베기 → 모닥불 → 닭 알 → 굽기·먹기 → 닭장 → 낚시 → 생선 굽기·먹기 → 집·잠·일기 → 나무만 벤 날 → 낚시만 한 날 → 일기장 → 모닥불 옆 잠 → 뗏목 → 남기 · 떠나기 엔딩 → 저장·불러오기
// 루프 없이 tick() 을 직접 부르고 섬·난수가 시드로 고정이라, 동작이 같으면 마지막 "지문" 도 같다.
//   리팩토링(동작을 안 바꾸는 정리) 전후: 지문이 EXPECT 와 같아야 한다.
//   기능을 바꾼 뒤: 지문이 달라지는 게 맞다. 항목이 전부 통과하면 새 지문을 EXPECT 에 적는다.
// 확인 모드는 저장 키를 따로 쓴다 (island-save-check). 진짜 저장본은 건드리지 않는다.
// 위치를 옮길 때는 걷지 않고 바로 세운다(standAt). 길 찾기가 아니라 섬의 규칙을 확인하는 스크립트라서.
'use strict';
(async () => {
  const EXPECT = 'c55672c0';   // 마지막으로 통과한 지문 (2026-10-18, 닭 사냥)

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

  // 졸릴 때까지 문 앞에서 기다렸다가 자고, 일기를 넘긴다
  async function sleepNight() {
    standAt(house.x, house.y + 8);
    run(sleepCool + 1);
    standAt(house.x, house.y + 8);
    run(1);
    goToSleep();
    await wait(1000);
    document.getElementById('wake').click();
    await wait(1400);
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
      player: [Math.round(player.x), Math.round(player.y), player.dir, Math.round(player.full * 10) / 10],
      inv: { ...inv },
      trees: trees.map((tr) => [tr.state, tr.hp, tr.regrow]),
      fires: fires.map((f) => [f.x, f.y, f.kind ?? null, f.cook ?? null]),
      coops: coops.map((c) => [c.x, c.y, c.timer]),
      house: house && [house.x, house.y],
      day,
      sleepCool,
      chickens: chickens.map((c) => [Math.round(c.x), Math.round(c.y), c.dir, c.egg, c.baby || 0]),
      items: items.map((it) => [it.kind, Math.round(it.x), Math.round(it.y)]),
      diary: diary.map((e) => [e.day, ...e.lines]),
      today: Object.values(today).map(Math.round),
      ever: Object.values(ever).map(Math.round),
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
    check('처음 상태', Object.values(inv).every((v) => v === 0) && day === 1 && chickens.length === CHICKEN_COUNT && trees.length > 0,
      `나무 ${trees.length} · 닭 ${chickens.length}`);

    // 1. 나무 베기: 두 그루 → 통나무 4
    const chopped = chopOne() && chopOne();
    check('나무 베기', chopped && inv.log === 4, `통나무 ${inv.log} · 그루터기 ${stumps()} · 배 ${player.full.toFixed(1)}`);

    // 2. 모닥불: 통나무 3
    check('모닥불', build('build') && fires.length === 1 && inv.log === 1, `모닥불 ${fires.length} · 통나무 ${inv.log}`);

    // 3. 닭 알: 기다렸다가 주우러 간다
    const laid = run(EGG_MAX + 60, () => eggsOnGround() > 0);
    const egg = items.find((it) => it.kind === 'egg');
    const stood = laid && standNear(egg.x, egg.y, [[0, 2], [6, 2], [-6, 2], [0, -4], [8, 0], [-8, 0]]);
    const gotEgg = stood && run(200, () => today.egg >= 1);   // 모닥불 옆이면 줍자마자 구우러 들어가서 inv 로는 못 본다
    check('닭 알 줍기', gotEgg, `주운 알 ${today.egg} · ${frames} 프레임째`);

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

    // 6. 낚시: 낚을 수 있는 물가를 찾아 선다
    const cast = goFishing() && run(FISH_STILL + 5, () => player.fish);
    check('낚싯대 던지기', cast, `자리 ${Math.round(player.x)},${Math.round(player.y)}`);
    const waiting = cast && run(40, () => player.fish?.state === 'wait');
    check('일찍 누르면 안내', waiting && reel() === true && toasts[toasts.length - 1].startsWith('아직'), toasts[toasts.length - 1]);
    const bite = waiting && run(60 * 6, () => player.fish?.state === 'bite');
    const caught = bite && reel() === true && run(200, () => inv.fish >= 1);
    check('물고기 낚기', caught, `생선 ${inv.fish}`);

    // 7. 생선 굽기 · 먹기
    const grilled = caught && atFire() && run(600, () => inv.grilled >= 1);
    check('생선 굽기', grilled, `구운 생선 ${inv.grilled}`);
    check('구운 생선 먹기', grilled && eat(), `배 ${player.full.toFixed(1)}`);

    // 8. 집 · 잠: 그루터기를 하나 만들어 두고 잔다
    chopOne();
    inv.log += HOUSE_COST;
    refreshHud();
    check('집 짓기', build('house') && !!house, house ? `집 ${house.x},${house.y}` : '못 지음');
    standAt(house.x, house.y + 8);
    run(1);
    check('문 앞 자기 버튼', document.getElementById('sleep').style.display === 'flex');
    const before = { day, stumps: stumps(), eggs: eggsOnGround(), full: player.full, babies: chickens.filter((c) => c.baby > 0) };
    goToSleep();
    check('밤 화면', document.getElementById('night').classList.contains('on'));
    await wait(1000);   // 0.9초 뒤 일기가 펼쳐진다
    const page = document.getElementById('page');
    check('일기 한 장', page.classList.contains('show') && document.getElementById('page-day').textContent === '1일째 밤'
      && page.querySelectorAll('p').length === DIARY_LINES + 1, diary[0]?.lines.join(' / '));
    check('일기를 넘기기 전엔 밤', sleeping && document.getElementById('night').classList.contains('on'));
    document.getElementById('wake').click();
    await wait(1400);   // 아침 0.5초 + 0.8초 뒤 다시 움직일 수 있다
    check('아침', !sleeping && !document.getElementById('night').classList.contains('on'));
    check('하루 지남', day === before.day + 1 && document.getElementById('day').textContent === day + '일째', `${before.day} → ${day}일째`);
    check('밤사이 나무 회복', before.stumps > 0 && stumps() === 0, `그루터기 ${before.stumps} → ${stumps()}`);
    check('밤사이 알', eggsOnGround() > before.eggs || before.eggs >= NIGHT_EGG_LIMIT, `땅의 알 ${before.eggs} → ${eggsOnGround()}`);
    check('밤사이 병아리 성장', before.babies.every((c) => !c.baby), `병아리 ${before.babies.length}마리`);
    check('자고 나면 배고픔', Math.abs(player.full - Math.max(0, before.full - SLEEP_HUNGER)) < 1e-9, `배 ${before.full.toFixed(1)} → ${player.full.toFixed(1)}`);
    goToSleep();
    check('바로 또 자기는 막힘', toasts[toasts.length - 1].includes('졸리지'), toasts[toasts.length - 1]);

    // 둘째 날: 나무만 벤다 / 셋째 날: 낚시만 한다 → 일기 셋이 서로 달라야 한다
    for (let k = 0; k < 4; k++) chopOne();
    await sleepNight();
    if (goFishing()) for (let k = 0; k < 3; k++) {
      if (!run(60 * 8, () => player.fish?.state === 'bite')) break;
      if (k === 1) run(FISH_BITE + 1);   // 한 번은 놓친다
      else { reel(); run(120); }
    }
    await sleepNight();
    const texts = diary.map((e) => e.lines.join(' '));
    check('일기 세 편', diary.length === 3 && day === 4 && diary.every((e) => e.lines.length === DIARY_LINES + 1), `일기 ${diary.length} · ${day}일째`);
    check('일기가 서로 다름', new Set(texts).size === 3 && diary.every((e, i) => i === 0 || e.lines.slice(0, -1).some((s) => !diary[i - 1].lines.includes(s))));

    // 일기장
    check('일기장 버튼', document.getElementById('book-open').style.display === 'block');
    document.getElementById('book-open').click();
    const full0 = player.full;
    run(30);
    check('일기장 열기 · 멈춤', bookOpen && document.getElementById('book').classList.contains('on')
      && document.querySelectorAll('#book-list h3').length === 3 && player.full === full0);
    document.getElementById('book-close').click();
    check('일기장 닫기', !bookOpen && !document.getElementById('book').classList.contains('on'));

    // 가방: 가진 것만 보이고, 열린 동안 멈추고, 음식은 골라 먹는다
    inv.fried = 2; inv.grilled = 1;
    refreshHud();
    document.getElementById('bag-open').click();
    const bagFull = player.full;
    run(30);
    const rows = [...document.querySelectorAll('#bag-list .bag-row b')].map((el) => el.textContent);
    check('가방 열기 · 멈춤', bagOpen && player.full === bagFull && rows.length === BAG_ITEMS.filter((it) => inv[it.kind] > 0).length, rows.join(' · '));
    const eggRow = [...document.querySelectorAll('#bag-list .bag-row')].find((r) => r.querySelector('b').textContent.startsWith('구운 달걀'));
    eggRow.querySelector('button').click();   // 생선이 있어도 달걀을 골라 먹는다
    check('가방에서 골라 먹기', inv.fried === 1 && inv.grilled === 1 && Math.abs(player.full - Math.min(FULL_MAX, bagFull + FULL_PER_EGG)) < 1e-9
      && document.querySelector('#bag-list').textContent.includes('구운 달걀 1'));
    document.getElementById('bag-close').click();
    check('가방 닫기', !bagOpen && !document.getElementById('bag').classList.contains('on'));

    // 닭 사냥: 다 큰 닭에 걸어서 닿으면 잡힌다. 병아리는 안 잡힌다. 닭고기는 구워 먹는다
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
    const baby = chickens.find((c) => c.baby > 0 && awayFromHens(c));
    const hens0 = chickens.length;
    check('병아리는 안 잡힘', !!baby && walkInto(baby) && chickens.includes(baby) && chickens.length === hens0 && !today.hunt, `닭 ${hens0} → ${chickens.length}`);
    const hen = chickens.find((c) => !(c.baby > 0) && awayFromHens(c) && SIDES.some(([dx, dy]) => !blocked(c.x + dx, c.y + dy)));
    check('닭 잡기', !!hen && walkInto(hen) && !chickens.includes(hen) && chickens.length === hens0 - 1 && today.hunt === 1
      && items.some((it) => it.kind === 'meat'), `닭 ${hens0} → ${chickens.length}`);
    check('닭고기 줍기', run(120, () => inv.meat >= 1), `닭고기 ${inv.meat}`);
    atFire();
    const roasted = run(60 * 20, () => inv.roast >= 1);
    const meatFull = player.full;
    check('닭고기 굽기 · 먹기', roasted && eatWhat() === 'roast' && eat() && inv.roast === 0 && today.ateMeat === 1
      && Math.abs(player.full - Math.min(FULL_MAX, meatFull + FULL_PER_MEAT)) < 1e-9, `배 ${meatFull.toFixed(1)} → ${player.full.toFixed(1)}`);

    // 10. 모닥불 옆에서 자기: 집보다 배가 더 고프다
    atFire();
    run(sleepCool + 1);
    atFire();
    run(1);
    check('모닥불 옆 자기 버튼', document.getElementById('sleep').style.display === 'flex'
      && document.getElementById('sleep-where').textContent === '모닥불 옆에서');
    const fireNight = { day, full: player.full };
    goToSleep();
    await wait(1000);
    document.getElementById('wake').click();
    await wait(1400);
    check('모닥불 옆에서 잠', day === fireNight.day + 1 && Math.abs(player.full - Math.max(0, fireNight.full - SLEEP_HUNGER_OUT)) < 1e-9
      && diary[diary.length - 1].lines.some((l) => l.includes('잤다')), diary[diary.length - 1].lines.join(' / '));

    // 11. 뗏목: 물가에 터를 잡고 통나무를 엮는다
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

    // 남기 엔딩 → 계속 지내기
    document.getElementById('stay').click();
    check('남기 엔딩', ended === 'stay' && endingOpen && document.getElementById('ending-card').src.startsWith('data:image/png')
      && diary[diary.length - 1].end === 'stay', lastCard && `${lastCard.head} · ${lastCard.title} · ${lastCard.quote}`);
    document.getElementById('ending-next').click();
    const cool1 = sleepCool;
    run(5);
    check('남은 뒤 계속 지내기', !endingOpen && sleepCool < cool1);   // 게임이 다시 돈다

    // 떠나기 엔딩
    inv.grilled = RAFT_FISH + 1;
    refreshHud();
    document.getElementById('leave').click();
    check('떠날 준비', choiceOpen && !document.getElementById('go').disabled && document.getElementById('stay').style.display === 'none');
    document.getElementById('go').click();
    check('생선 챙김', inv.grilled === 1 && inv.fried === 5 && !!sail, `구운 생선 ${inv.grilled} · 구운 달걀 ${inv.fried}`);
    const shoreAt = { x: player.x, y: player.y };
    run(SAIL_TIME);
    check('뗏목 타고 나감', Math.hypot(player.x - shoreAt.x, player.y - shoreAt.y) > 60 && player.x === raft.x);
    await wait(1100);
    check('떠나기 엔딩', ended === 'leave' && !sail && endingOpen && diary[diary.length - 1].end === 'leave'
      && document.getElementById('ending-next').textContent === '처음부터 다시', lastCard && `${lastCard.head} · ${lastCard.title} · ${lastCard.quote}`);
    window.checkCard = document.getElementById('ending-card').src;   // 캡처용

    // 9. 저장 · 불러오기
    const saved = JSON.stringify(summary());
    check('저장', saveGame() === true);
    inv.log = 999; house = null; day = 1;
    fires.length = 0; coops.length = 0; chickens.length = 0; items.length = 0; diary.length = 0; raft = null; ended = null;
    check('불러오기', loadGame() === true && JSON.stringify(summary()) === saved, `집 ${!!house} · ${day}일째 · 닭 ${chickens.length} · 일기 ${diary.length} · 엔딩 ${ended}`);
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
  lines.push('', '— 일기 —');
  diary.forEach((e) => lines.push(`[${e.day}일째${e.end ? ' · ' + e.end : ''}] ${e.lines.join(' ')}`));
  if (lastCard) lines.push('', `— 엔딩 카드 — ${lastCard.head} / 칭호 ${lastCard.title} / ${lastCard.quote}`);
  box.textContent = lines.join('\n');
  document.body.appendChild(box);
  window.checkResult = { pass: out.length - fail, fail, print, list: out };
})();
