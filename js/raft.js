// 뗏목: 집을 지으면 물가에 터를 잡을 수 있고, 옆에 서 있으면 통나무를 하나씩 엮는다. 다 되면 떠날 수 있다 (안 떠나도 된다)
// 탈출 테크(기획.md 7단계)에서 다시 짠다
'use strict';

let raft = null;      // { x, y, logs }
let ended = null;     // 떠났으면 'leave'
let sail = null;      // 떠나는 중 { t, dx, dy }
let choiceOpen = false;
let feedTimer = 0;

const raftDone = () => !!raft && raft.logs >= RAFT_LOGS;
const nearRaft = () => !!raft && Math.hypot(player.x - raft.x, player.y - raft.y) < 32;
const fishCount = () => inv.grilled;

// 뗏목 놓을 물: 주인공 앞 · 뒤 · 아래 · 위. 뗏목 크기만큼 물이어야 한다
function raftSpot() {
  for (const [dx, dy] of [[player.dir * 24, 0], [-player.dir * 24, 0], [0, 26], [0, -22]]) {
    const x = Math.round(player.x + dx), y = Math.round(player.y + dy);
    if ([[0, 0], [-13, -8], [13, -8], [-13, 6], [13, 6]].every(([ox, oy]) => waterAt(x + ox, y + oy))) return { x, y };
  }
  return null;
}

function refreshRaftButtons() {
  const canStart = !!house && !raft && !!raftSpot();
  document.getElementById('raft').style.display = canStart ? 'flex' : 'none';
  document.getElementById('leave').style.display = raftDone() && nearRaft() && ended !== 'leave' ? 'flex' : 'none';
  if (house && !raft && toastTimer === 0) sayOnce('raftIdea', '나무를 엮으면 뗏목이 될 것 같아요. 물가에 서 봐요');
}

// 매 프레임: 버튼 갱신 · 옆에 서 있으면 통나무 엮기
function updateRaft() {
  if (t % 10 === 0) refreshRaftButtons();
  if (!raft || raftDone() || !nearRaft() || inv.log <= 0) { feedTimer = 0; return; }
  if (++feedTimer < RAFT_FEED) return;
  feedTimer = 0;
  inv.log--;
  raft.logs++;
  refreshHud();
  burst(raft.x, raft.y - 4, [PALETTE.t, PALETTE.c, C.foam], 4, 0.6);
  if (raftDone()) {
    note('raft');
    cam.shake = 4;
    burst(raft.x, raft.y - 16, ['#ffffff', '#e8434a', C.foam], 14, 1.2);
    toast('뗏목 완성! 떠날지 남을지 골라요');
    refreshRaftButtons();
  }
}

document.getElementById('raft').addEventListener('click', () => {
  if (raft || !house) return;
  const s = raftSpot();
  if (!s) { toast('뗏목은 물가에서 바다 쪽을 보고 만들어요'); return; }
  raft = { x: s.x, y: s.y, logs: 0 };
  player.fish = null;   // 낚시 중이었으면 접는다
  player.still = 0;
  splash(s.x, s.y, 8);
  refreshRaftButtons();
  toast(`뗏목 터를 잡았어요. 옆에 있으면 통나무를 엮어요 (${RAFT_LOGS}개)`);
});

// 떠날까? 고르는 쪽지
function openChoice() {
  if (!raftDone() || ended === 'leave') return;
  const ok = fishCount() >= RAFT_FISH;
  document.getElementById('choice-text').textContent = '바다 건너엔 뭐가 있을까. 섬을 떠날까?';
  const go = document.getElementById('go');
  go.disabled = !ok;
  document.getElementById('go-need').textContent = ok
    ? `구운 생선 ${RAFT_FISH}마리를 챙긴다`
    : `바다에서 먹을 구운 생선 ${RAFT_FISH}마리가 필요해요 (지금 ${fishCount()})`;
  choiceOpen = true;
  joy = null;
  document.getElementById('choice').classList.add('on');
}
function closeChoice() {
  choiceOpen = false;
  document.getElementById('choice').classList.remove('on');
}
document.getElementById('leave').addEventListener('click', openChoice);
document.getElementById('later').addEventListener('click', closeChoice);
document.getElementById('go').addEventListener('click', () => {
  if (fishCount() < RAFT_FISH) return;
  closeChoice();
  inv.grilled -= RAFT_FISH;
  refreshHud();
  saveGame();   // 떠나기 직전 상태. 장면 도중엔 저장하지 않는다
  const dx = raft.x - player.x, dy = raft.y - player.y, l = Math.hypot(dx, dy) || 1;
  sail = { t: 0, dx: dx / l, dy: dy / l };   // 섬에서 뗏목 쪽으로, 그대로 바다로
  player.fish = null;
  player.swing = 0;
  ['raft', 'leave', 'build', 'coop', 'house', 'eat'].forEach((id) => { document.getElementById(id).style.display = 'none'; });
});

// 떠나는 장면: 주인공이 뗏목에 올라 바다로 나간다
function updateSail() {
  sail.t++;
  if (sail.t < 40) {   // 뗏목으로 걸어간다
    player.x += (raft.x - player.x) * 0.12;
    player.y += (raft.y - player.y) * 0.12;
    player.moving = true;
    player.step++;
    return;
  }
  player.moving = false;
  raft.x += sail.dx * 0.45;
  raft.y += sail.dy * 0.45;
  player.x = raft.x;
  player.y = raft.y;
  if (sail.t % 12 === 0) splash(raft.x - sail.dx * 14, raft.y + 4, 2);   // 물보라
  if (sail.t === SAIL_TIME) {
    document.getElementById('night').classList.add('on');
    setTimeout(() => {
      sail = null;
      ended = 'leave';
      saveGame();
      showEnding('leave');
    }, 900);
  }
}
