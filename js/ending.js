// 엔딩: 마지막 일기 · 칭호 · 엔딩 카드(이미지 한 장). 기획.md "끝: 뗏목"
// 카드는 기기 안에서만 만든다. "이미지 저장" 은 폰의 공유 창이나 내려받기만 연다 (어디에도 올리지 않는다)
'use strict';

let endingOpen = false;
let lastCard = null;   // 확인용: 마지막으로 그린 카드 내용

// 떠나는 날 / 남기로 한 날의 일기. 일기장에 end 표시를 달아 넣는다
function finalDiary(kind) {
  const lines = kind === 'leave' ? [
    '뗏목을 띄웠다. 섬이 점점 작아진다.',
    `${day}일 동안 고마웠다, 섬아.`,
    chickens.length ? '닭들은 끝까지 배웅하지 않았다.' : '배웅해 주는 이는 없었다. 파도만 손을 흔들었다.',
    '이 일기는 바다 위에서 마저 쓴다.',
  ] : [
    '뗏목을 다 엮었는데, 떠나지 않기로 했다.',
    house ? '여기엔 내 집이 있다. 닭들도 있다. 피하긴 하지만.' : '여기엔 닭들이 있고, 내일 벨 나무가 있다.',
    '섬에 남기로 했다. 내일도 일기를 쓰겠지.',
  ];
  diary.push({ day, lines, end: kind });
}

// 지금까지 가장 많이 한 일로 칭호를 정한다. 기준치(norm)만큼 했으면 1점
function islandTitle(kind) {
  const e = {};
  Object.keys(ever).forEach((k) => { e[k] = ever[k] + today[k]; });
  const cands = [
    [e.fish / 8, '낚시꾼'], [e.chop / 25, '나무꾼'], [e.egg / 15, '닭 집사'], [e.scared / 30, '닭들의 공포'],
    [e.starve / 3600, '배고픈 철학자'], [e.walk / 30000, '섬 산책왕'], [e.cooked / 10, '모닥불 요리사'],
    [e.outside / 3, '별 보며 자는 사람'], [e.miss > e.fish ? e.miss / 6 : 0, '놓친 게 더 많은 어부'],
  ];
  const best = cands.reduce((a, b) => (b[0] > a[0] ? b : a));
  const name = best[0] >= 1 ? best[1] : '평범한 표류자';
  if (day >= 10) return '오래 버틴 ' + name;
  if (kind === 'leave' && day <= RAFT_DAY) return '번개같이 떠난 ' + name;
  return name;
}

// 일기에서 한 줄 고르기: 맺음말과 엔딩 일기는 빼고
function cardQuote() {
  const pool = diary.filter((en) => !en.end).flatMap((en) => en.lines.slice(0, -1));
  if (!pool.length) return '섬에서 보낸 날들.';
  const r = rng(day * 31 + diary.length);
  return pool[Math.floor(r() * pool.length)];
}

// 카드 위쪽 그림 82x48: 섬 + (떠나기) 바다 위 뗏목 / (남기) 섬 위 주인공
function cardScene(kind) {
  const cv = document.createElement('canvas');
  cv.width = 82; cv.height = 48;
  const g = cv.getContext('2d');
  const r = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
  r(0, 0, 82, 48, C.water);
  const rr = rng(7);
  for (let k = 0; k < 40; k++) r(Math.floor(rr() * 80), Math.floor(rr() * 47), 2, 1, C.waterDeep);
  const land = (x, y) => ((x - 30) / 25) ** 2 + ((y - 29) / 10) ** 2 <= 1;
  const cliff = (x, y) => !land(x, y) && land(x, y - 4) && y > 29;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 82; x++) {
    if (land(x, y)) r(x, y, 1, 1, (x * 7 + y * 3) % 11 === 0 ? C.grassDark : C.grass);
    else if (cliff(x, y)) r(x, y, 1, 1, x % 3 === 0 ? C.cliffDark : C.cliff);
  }
  for (let y = 0; y < 48; y++) for (let x = 0; x < 82; x++) {   // 외곽선
    const solid = (a, b) => land(a, b) || cliff(a, b);
    if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) r(x, y, 1, 1, PALETTE.o);
  }
  for (let x = 6; x < 56; x += 3) if (!land(x, 40) && cliff(x, 39)) r(x, 41, 2, 1, C.foam);
  g.drawImage(SPR.tree, 7, 9);
  g.drawImage(SPR.tree, 22, 5);
  if (kind === 'leave') {
    g.drawImage(SPR.chicken.right.stand, 38, 22);
    const x = 66, y = 36;   // 바다 위 뗏목
    r(x - 9, y + 4, 18, 1, C.foam);
    for (let k = 0; k < 6; k++) { r(x - 9 + k * 3, y - 3, 3, 7, PALETTE.o); r(x - 8 + k * 3, y - 2, 1, 5, PALETTE.t); }
    r(x + 3, y - 18, 2, 15, PALETTE.o);
    r(x - 5, y - 17, 8, 9, PALETTE.o); r(x - 4, y - 16, 6, 7, '#fbfaf5'); r(x - 4, y - 13, 6, 2, '#e8434a');
    g.drawImage(SPR.hero.left, x - 8, y - 9);
    for (let k = 0; k < 3; k++) r(x + 10 + k * 4, y + 1 + (k % 2), 2, 1, C.foam);   // 물보라
  } else {
    g.drawImage(SPR.hero.right, 36, 20);
    g.drawImage(SPR.chicken.left.stand, 47, 22);
    g.drawImage(SPR.fireBase, 24, 28);
    r(29, 24, 2, 4, '#ff9a3c'); r(29, 26, 2, 2, '#ffe066');
    const x = 66, y = 36;   // 물가에 매어 둔 뗏목
    for (let k = 0; k < 6; k++) { r(x - 9 + k * 3, y - 3, 3, 7, PALETTE.o); r(x - 8 + k * 3, y - 2, 1, 5, PALETTE.t); }
    r(x - 10, y + 4, 20, 1, C.foam);
  }
  return cv;
}

// 360x560 카드
function drawCard(kind) {
  const cv = document.createElement('canvas');
  cv.width = 360; cv.height = 560;
  const g = cv.getContext('2d');
  const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
  g.fillStyle = '#fbf3e0'; g.fillRect(0, 0, 360, 560);
  g.fillStyle = PALETTE.o;
  g.fillRect(0, 0, 360, 5); g.fillRect(0, 555, 360, 5); g.fillRect(0, 0, 5, 560); g.fillRect(355, 0, 5, 560);
  g.fillRect(13, 13, 334, 198);
  g.imageSmoothingEnabled = false;
  g.drawImage(cardScene(kind), 16, 16, 328, 192);

  const head = kind === 'leave' ? `${day}일 만에 섬을 떠났다` : `${day}일째, 섬에 남기로 했다`;
  const title = islandTitle(kind);
  const quote = cardQuote();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = PALETTE.o;
  g.font = `800 23px ${FONT}`;
  g.fillText(head, 180, 252);

  g.font = `800 16px ${FONT}`;
  const badge = '칭호 · ' + title;
  const bw = Math.ceil(g.measureText(badge).width) + 28;
  g.fillStyle = PALETTE.o; g.fillRect(180 - bw / 2 - 3, 279, bw + 6, 32);
  g.fillStyle = '#f5b93a'; g.fillRect(180 - bw / 2, 282, bw, 26);
  g.fillStyle = PALETTE.o; g.fillText(badge, 180, 296);

  g.font = `500 17px ${FONT}`;
  const lines = wrapText(g, '“' + quote + '”', 300).slice(0, 4);
  lines.forEach((s, i) => g.fillText(s, 180, 352 + i * 27 - (lines.length - 1) * 13));

  const e = {};
  Object.keys(ever).forEach((k) => { e[k] = Math.round(ever[k] + today[k]); });
  g.font = `600 13px ${FONT}`;
  g.fillStyle = '#8a6a5a';
  g.fillText(`나무 ${e.chop}그루 · 물고기 ${e.fish}마리 · 달걀 ${e.egg}개`, 180, 470);
  g.fillText(`일기 ${diary.length}편`, 180, 492);
  g.fillStyle = '#c4a47e';
  g.fillRect(150, 516, 60, 1);
  g.font = `800 12px ${FONT}`;
  g.fillText('외딴 섬 일기', 180, 534);

  lastCard = { kind, head, title, quote };
  return cv;
}

// 띄어쓰기 단위로 줄을 나눈다 (한국어는 낱말 중간에서 끊지 않는다)
function wrapText(g, text, maxW) {
  const out = [];
  let cur = '';
  text.split(' ').forEach((w) => {
    const next = cur ? cur + ' ' + w : w;
    if (cur && g.measureText(next).width > maxW) { out.push(cur); cur = w; } else cur = next;
  });
  if (cur) out.push(cur);
  return out;
}

let cardCanvas = null;
function showEnding(kind) {
  cardCanvas = drawCard(kind);
  document.getElementById('ending-card').src = cardCanvas.toDataURL('image/png');
  document.getElementById('ending-next').textContent = kind === 'leave' ? '처음부터 다시' : '섬에서 계속 지내기';
  endingOpen = true;
  joy = null;
  toastTimer = 0;
  document.getElementById('toast').classList.remove('show');
  document.getElementById('ending').classList.add('on');
}

// 폰: 공유 창(사진 저장 · 보내기는 사용자가 고른다). PC: png 내려받기
async function saveCard() {
  if (!cardCanvas) return;
  const blob = await new Promise((res) => cardCanvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'island-diary.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '외딴 섬 일기' }); return; }
  } catch (e) {
    if (e.name === 'AbortError') return;   // 사용자가 닫음
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'island-diary.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

document.getElementById('ending-save').addEventListener('click', saveCard);
document.getElementById('ending-next').addEventListener('click', () => {
  if (ended === 'leave') {   // 떠난 섬은 끝. 새 섬으로
    noSave = true;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 지울 수 없으면 그냥 새로고침 */ }
    location.reload();
    return;
  }
  endingOpen = false;
  document.getElementById('ending').classList.remove('on');
  refreshHud();
});
