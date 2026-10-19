// 가방: 50칸, 한 칸에 같은 것 99개까지. 꽉 차면 더 못 줍는다. 칸을 누르면 먹기 · 버리기 (기획.md "가방")
// 개수는 inv 하나로 센다. 칸은 거기서 나눠 보여 줄 뿐이다 (통나무 120 = 99 칸 + 21 칸)
'use strict';

const BAG_ITEMS = [   // 가방에 보이는 순서
  { kind: 'log', name: '통나무', say: () => '나무 옆에 서면 벤다. 모닥불 · 닭장 · 집 · 뗏목 재료' },
  { kind: 'egg', name: '달걀', say: () => '닭이 낳는다. 모닥불 옆에 서 있으면 구워진다' },
  { kind: 'fried', name: '구운 달걀', say: () => `먹으면 배 +${FULL_PER_EGG}` },
  { kind: 'fish', name: '물고기', say: () => '물가에 가만히 서 있으면 낚는다. 모닥불에 굽는다' },
  { kind: 'grilled', name: '구운 생선', say: () => `먹으면 배 +${FULL_PER_FISH}. 떠날 때 ${RAFT_FISH}마리 챙긴다` },
  { kind: 'meat', name: '닭고기', say: () => '닭을 구석으로 몰면 잡힌다. 모닥불에 굽는다' },
  { kind: 'roast', name: '구운 닭고기', say: () => `먹으면 배 +${FULL_PER_MEAT}` },
];
let bagOpen = false;
let bagSel = -1;   // 고른 칸 번호

const stacksOf = (n) => Math.ceil(n / BAG_STACK);
const slotsUsed = () => BAG_ITEMS.reduce((s, b) => s + stacksOf(inv[b.kind]), 0);
// 하나 더 넣을 수 있나: 같은 것이 든 칸에 자리가 있거나, 빈 칸이 있으면
const canTake = (kind) => (inv[kind] % BAG_STACK !== 0) || slotsUsed() < BAG_SLOTS;

let bagFullAt = -1e9;
function bagFull() {   // 못 주운 걸 알려 준다 (자꾸 띄우지 않게 5초에 한 번)
  if (t - bagFullAt < 300) return;
  bagFullAt = t;
  toast('가방이 꽉 찼어요. 가방에서 버릴 수 있어요', 150);
}

// 칸 목록: [{ kind, count }] — 앞에서부터 99 개씩
function bagCells() {
  const cells = [];
  BAG_ITEMS.forEach((b) => {
    for (let n = inv[b.kind]; n > 0; n -= BAG_STACK) cells.push({ kind: b.kind, count: Math.min(n, BAG_STACK) });
  });
  return cells;
}

function renderBag() {
  const cells = bagCells();
  if (bagSel >= cells.length) bagSel = cells.length - 1;
  document.getElementById('bag-count').textContent = `${cells.length} / ${BAG_SLOTS}칸`;
  const grid = document.getElementById('bag-grid');
  grid.innerHTML = '';
  for (let k = 0; k < BAG_SLOTS; k++) {
    const c = cells[k];
    const el = document.createElement('div');
    el.className = 'cell' + (k === bagSel && c ? ' sel' : '');
    if (c) {
      const icon = document.createElement('img');
      icon.src = SPR[c.kind].toDataURL();
      icon.style.width = SPR[c.kind].width * 3 + 'px';   // 도트 한 칸 = 3px
      const n = document.createElement('b');
      n.textContent = c.count;
      el.append(icon, n);
      el.addEventListener('click', () => { bagSel = k; renderBag(); });
    }
    grid.appendChild(el);
  }

  const info = document.getElementById('bag-info');
  info.innerHTML = '';
  const c = cells[bagSel];
  if (!c) { info.innerHTML = '<p class="bag-empty">칸을 누르면 먹거나 버릴 수 있다.</p>'; return; }
  const b = BAG_ITEMS.find((it) => it.kind === c.kind);
  const text = document.createElement('div');
  text.innerHTML = '<b></b><small></small>';
  text.querySelector('b').textContent = `${b.name} ${inv[c.kind]}`;
  text.querySelector('small').textContent = b.say();
  const row = document.createElement('div');
  row.className = 'bag-buttons';
  const button = (label, fn) => {
    const el = document.createElement('button');
    el.className = 'panel';
    el.textContent = label;
    el.addEventListener('click', () => { fn(); renderBag(); });
    row.appendChild(el);
  };
  if (FOOD[c.kind]) button('먹기', () => eatFood(c.kind));
  button('1개 버리기', () => discard(c.kind, 1));
  if (c.count > 1) button(`${c.count}개 버리기`, () => discard(c.kind, c.count));
  info.append(text, row);
}

function discard(kind, n) {
  inv[kind] = Math.max(0, inv[kind] - n);
  burst(player.x, player.y - 8, ['#ffffff', '#c9c6d6'], 4, 0.5);
  refreshHud();
}

function openBag() {
  bagSel = -1;
  renderBag();
  bagOpen = true;
  joy = null;
  toastTimer = 0;
  document.getElementById('toast').classList.remove('show');
  document.getElementById('bag').classList.add('on');
}
function closeBag() {
  bagOpen = false;
  document.getElementById('bag').classList.remove('on');
}
document.getElementById('bag-open').addEventListener('click', openBag);
document.getElementById('bag-close').addEventListener('click', closeBag);
