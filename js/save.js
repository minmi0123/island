// 저장 (localStorage)
'use strict';

// 접근은 전부 try/catch — 아이폰 프라이빗 모드에서는 예외가 난다 (dev-guide trouble.md 함정 2)
// SAVE_VER 는 함부로 올리지 않는다. 필드를 늘릴 때는 읽는 쪽에 기본값을 두어 옛 저장본도 읽히게 한다
const SAVE_KEY = CHECK ? 'island-save-check' : 'island-save';   // 확인 모드는 진짜 저장본을 건드리지 않는다
const SAVE_VER = 1;
const SAVE_EVERY = 60 * 5;
const ITEM_KINDS = ['log', 'egg', 'fried', 'fish', 'grilled', 'meat', 'roast'];
let noSave = false;   // 처음부터 누른 뒤 페이지를 떠날 때 다시 저장되지 않게

function saveGame() {
  if (noSave || sail) return false;   // 떠나는 장면 도중엔 저장하지 않는다
  const data = {
    v: SAVE_VER,
    at: Date.now(),
    player: { x: Math.round(player.x), y: Math.round(player.y), dir: player.dir, full: Math.round(player.full * 10) / 10, hp: Math.round(player.hp * 10) / 10 },
    inv: { ...inv },
    trees: { n: trees.length, list: trees.map((tr) => [tr.state === 'tree' ? 1 : 0, tr.hp, tr.regrow]) },   // 섬은 시드로 똑같이 만들어지므로 순서로 맞춘다
    fires: fires.map((f) => ({ x: f.x, y: f.y, cook: f.cook ?? null, kind: f.kind ?? null })),
    coops: coops.map((c) => ({ x: c.x, y: c.y, timer: c.timer })),
    house: house ? { x: house.x, y: house.y } : null,
    chickens: chickens.map((ch) => ({ x: Math.round(ch.x), y: Math.round(ch.y), dir: ch.dir, egg: ch.egg, baby: ch.baby || 0 })),
    items: items.map((it) => ({ kind: it.kind, x: Math.round(it.x), y: Math.round(it.y) })),
    said: { ...said },
    stats: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.round(v)])),
    firstEgg,
    raft: raft && { x: Math.round(raft.x), y: Math.round(raft.y), logs: raft.logs },
    ended,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
}

function loadGame() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return false; }
  if (!d || typeof d !== 'object' || !d.player) return false;
  const num = (v, def) => (typeof v === 'number' && isFinite(v) ? v : def);
  const arr = (a) => (Array.isArray(a) ? a : []);

  const px = num(d.player.x, player.x), py = num(d.player.y, player.y);
  if (!blocked(px, py)) { player.x = px; player.y = py; }
  player.dir = d.player.dir === -1 ? -1 : 1;
  player.full = Math.max(0, Math.min(FULL_MAX, num(d.player.full, FULL_START)));
  player.hp = Math.max(1, Math.min(HP_MAX, num(d.player.hp, HP_MAX)));
  Object.keys(inv).forEach((k) => { inv[k] = Math.max(0, Math.floor(num(d.inv?.[k], 0))); });

  if (d.trees?.n === trees.length) arr(d.trees.list).forEach((row, i) => {
    const tr = trees[i];
    if (!tr || !Array.isArray(row)) return;
    tr.state = row[0] ? 'tree' : 'stump';
    tr.hp = row[0] ? Math.max(1, Math.min(tr.maxHp, num(row[1], tr.maxHp))) : 0;
    tr.regrow = Math.max(0, num(row[2], REGROW));
  });

  fires.length = 0;
  arr(d.fires).forEach((f) => {
    const kind = COOK[f.kind] ? f.kind : null;
    fires.push({ x: num(f.x, 0), y: num(f.y, 0), kind, cook: kind && typeof f.cook === 'number' ? f.cook : null });
  });
  coops.length = 0;
  arr(d.coops).forEach((c) => coops.push({ x: num(c.x, 0), y: num(c.y, 0), timer: num(c.timer, COOP_SPAWN) }));
  if (arr(d.chickens).length) {
    chickens.length = 0;
    d.chickens.forEach((c) => {
      const x = num(c.x, player.x), y = num(c.y, player.y);
      chickens.push({ x, y, dir: c.dir === -1 ? -1 : 1, state: 'idle', timer: Math.floor(rand() * 90), tx: x, ty: y, step: 0, egg: num(c.egg, nextEgg()), baby: Math.max(0, num(c.baby, 0)) });
    });
  }
  items.length = 0;
  arr(d.items).forEach((it) => {
    if (ITEM_KINDS.includes(it.kind)) items.push({ kind: it.kind, x: num(it.x, player.x), y: num(it.y, player.y), z: 0, vz: 0, vx: 0, vy: 0, age: 30 });
  });
  Object.assign(said, d.said && typeof d.said === 'object' ? d.said : {});
  firstEgg = !!d.firstEgg;
  // 예전 저장본(일기 시절)은 stats 대신 ever + today 로 셌다
  Object.keys(stats).forEach((k) => { stats[k] = Math.max(0, d.stats ? num(d.stats[k], 0) : num(d.ever?.[k], 0) + num(d.today?.[k], 0)); });
  house = d.house && typeof d.house.x === 'number' && typeof d.house.y === 'number' ? { x: d.house.x, y: d.house.y } : null;
  raft = d.raft && typeof d.raft.x === 'number' && typeof d.raft.y === 'number'
    ? { x: d.raft.x, y: d.raft.y, logs: Math.max(0, Math.min(RAFT_LOGS, Math.floor(num(d.raft.logs, 0)))) } : null;
  ended = d.ended === 'leave' ? 'leave' : null;
  return true;
}

addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGame(); });
addEventListener('pagehide', saveGame);

document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('지금까지 한 것을 지우고 처음부터 할까요?')) return;
  noSave = true;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 지울 수 없으면 그냥 새로고침 */ }
  location.reload();
});
