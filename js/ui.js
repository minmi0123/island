// 안내 · HUD · 버튼 · 화면 맞추기
'use strict';

let toastTimer = 0;
function toast(msg, frames = 180) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  toastTimer = frames;
}

function refreshHud() {
  document.getElementById('cnt-log').textContent = inv.log;
  document.getElementById('cnt-egg').textContent = inv.egg;
  document.getElementById('cnt-fried').textContent = inv.fried;
  document.getElementById('cnt-fish').textContent = inv.fish;
  document.getElementById('cnt-grilled').textContent = inv.grilled;
  document.getElementById('cnt-meat').textContent = inv.meat;
  document.getElementById('cnt-roast').textContent = inv.roast;
  ['egg', 'fried', 'fish', 'grilled', 'meat', 'roast'].forEach((k) => {   // 0 개인 칸은 숨긴다
    document.getElementById('slot-' + k).style.display = inv[k] > 0 ? 'flex' : 'none';
  });
  const food = eatWhat();
  if (food) document.getElementById('eat-what').textContent = FOOD[food].name;
  document.getElementById('build').style.display = inv.log >= FIRE_COST ? 'flex' : 'none';
  document.getElementById('coop').style.display = inv.log >= COOP_COST ? 'flex' : 'none';
  document.getElementById('house').style.display = inv.log >= HOUSE_COST && !house ? 'flex' : 'none';
  document.getElementById('eat').style.display = food ? 'flex' : 'none';
}
// 먹기 버튼이 먹는 것: 든든한 것부터. 뗏목 터를 잡은 뒤엔 생선은 바다에서 먹게 맨 뒤로
function eatWhat() {
  const order = raft ? ['fried', 'roast', 'grilled'] : ['roast', 'grilled', 'fried'];
  return order.find((k) => inv[k] > 0) || null;
}
function bumpHud(kind) {
  const el = document.getElementById('slot-' + kind);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

document.getElementById('house').addEventListener('click', () => {
  if (inv.log < HOUSE_COST || house) return;
  const x = Math.round(player.x + player.dir * 28), y = Math.round(player.y + 4);
  if (!areaFree(x, y, 17, 15, 12)) { toast('집은 아주 넓은 빈 땅이 필요해요'); return; }
  inv.log -= HOUSE_COST;
  house = { x, y };
  note('house');
  cam.shake = 6;
  burst(x, y - 12, ['#d9a066', '#5f7fb8', '#ffffff'], 18, 1.6);
  refreshHud();
  toast('집 완성! 쓰러지면 여기서 깨어나요');
});

document.getElementById('coop').addEventListener('click', () => {
  if (inv.log < COOP_COST) return;
  const x = Math.round(player.x + player.dir * 24), y = Math.round(player.y + 4);
  if (!areaFree(x, y, 13, 12, 8)) { toast('닭장은 넓은 빈 땅이 필요해요'); return; }
  inv.log -= COOP_COST;
  note('coop');
  coops.push({ x, y, timer: 60 * 5 });   // 첫 병아리는 금방 나온다
  cam.shake = 4;
  burst(x, y - 10, ['#c98a5a', '#c4524e', '#ffffff'], 14, 1.4);
  refreshHud();
  toast('닭장 완성! 곧 병아리가 나올 거예요');
});

document.getElementById('build').addEventListener('click', () => {
  if (inv.log < FIRE_COST) return;
  const x = Math.round(player.x + player.dir * 14), y = Math.round(player.y);
  const free = landAt(x - 6, y - 2) && landAt(x + 6, y - 2) && landAt(x - 6, y) && landAt(x + 6, y)
    && trees.every((tr) => Math.abs(tr.x - x) > 10 || Math.abs(tr.y - y) > 6)
    && fires.every((f) => Math.abs(f.x - x) > 12 || Math.abs(f.y - y) > 6)
    && coops.every((c) => Math.abs(c.x - x) > 19 || y < c.y - 12 || y > c.y + 5)
    && (!house || Math.abs(house.x - x) > 23 || y < house.y - 15 || y > house.y + 5);
  if (!free) { toast('여기엔 놓을 수 없어요. 빈 땅을 보고 눌러 주세요'); return; }
  inv.log -= FIRE_COST;
  fires.push({ x, y });
  note('fire');
  burst(x, y - 6, ['#ffe066', '#ff9a3c', '#ffffff'], 10, 1.2);
  refreshHud();
  toast(fires.length === 1 ? '모닥불 완성! 오늘 밤은 따뜻하겠다' : '모닥불을 하나 더 만들었어요');
});

// 먹을 수 있는 것: 배 얼마나 차나 · 일기에 세는 이름 · 먹고 나서 한마디
const FOOD = {
  fried: { name: '구운 달걀', full: FULL_PER_EGG, note: 'ateEgg', say: '냠냠. 힘이 난다' },
  grilled: { name: '구운 생선', full: FULL_PER_FISH, note: 'ateFish', say: '생선 맛있다! 든든해' },
  roast: { name: '구운 닭고기', full: FULL_PER_MEAT, note: 'ateMeat', say: '닭고기다! 배가 든든해' },
};
function eatFood(food) {
  if (!FOOD[food] || inv[food] <= 0) return false;
  inv[food]--;
  note(FOOD[food].note);
  player.full = Math.min(FULL_MAX, player.full + FOOD[food].full);
  said.hungry = said.starving = false;   // 다시 배고파지면 또 알려 준다
  burst(player.x, player.y - 12, ['#ffe066', '#ffffff', '#e8434a'], 8, 0.8);
  refreshHud();
  if (inv[food] > 0) bumpHud(food);
  toast(player.full >= FULL_MAX ? '배불러요!' : FOOD[food].say);
  return true;
}
document.getElementById('eat').addEventListener('click', () => eatFood(eatWhat()));

function fit() {
  scale = Math.min(innerWidth / W, innerHeight / H);
  wrap.style.width = W * scale + 'px';
  wrap.style.height = H * scale + 'px';
}
addEventListener('resize', fit);
fit();

document.getElementById('icon-log').src = SPR.log.toDataURL();
document.getElementById('icon-egg').src = SPR.egg.toDataURL();
document.getElementById('icon-fried').src = SPR.fried.toDataURL();
document.getElementById('icon-fish').src = SPR.fish.toDataURL();
document.getElementById('icon-grilled').src = SPR.grilled.toDataURL();
document.getElementById('icon-meat').src = SPR.meat.toDataURL();
document.getElementById('icon-roast').src = SPR.roast.toDataURL();
