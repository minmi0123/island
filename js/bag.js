// 가방: 가진 것을 한눈에 본다. 음식은 여기서 골라 먹는다. 열려 있는 동안 섬은 멈춘다
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

function renderBag() {
  const list = document.getElementById('bag-list');
  list.innerHTML = '';
  const have = BAG_ITEMS.filter((b) => inv[b.kind] > 0);
  if (!have.length) { list.innerHTML = '<p class="bag-empty">가방이 비어 있다.</p>'; return; }
  have.forEach((b) => {
    const row = document.createElement('div');
    row.className = 'bag-row';
    const icon = document.createElement('img');
    icon.src = SPR[b.kind].toDataURL();
    icon.style.width = SPR[b.kind].width * 3 + 'px';   // 도트 한 칸 = 3px
    const text = document.createElement('div');
    text.innerHTML = '<b></b><small></small>';
    text.querySelector('b').textContent = `${b.name} ${inv[b.kind]}`;
    text.querySelector('small').textContent = b.say();
    row.append(icon, text);
    if (FOOD[b.kind]) {
      const eat = document.createElement('button');
      eat.className = 'panel';
      eat.textContent = '먹기';
      eat.addEventListener('click', () => { eatFood(b.kind); renderBag(); });
      row.appendChild(eat);
    }
    list.appendChild(row);
  });
}

function openBag() {
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
