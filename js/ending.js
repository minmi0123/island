// 엔딩: 칭호 · 엔딩 카드(이미지 한 장). 카드에 무엇을 담을지는 탈출 테크(기획.md 7단계)에서 다시 정한다
// 카드는 기기 안에서만 만든다. "이미지 저장" 은 폰의 공유 창이나 내려받기만 연다 (어디에도 올리지 않는다)
'use strict';

let endingOpen = false;
let lastCard = null;   // 확인용: 마지막으로 그린 카드 내용

// 칭호: 지금까지 가장 많이 한 일. [셈 이름, 기준치(이만큼 했으면 1점), 칭호, 카드에 들어갈 한 줄]
const TITLES = [
  ['fish', 8, '낚시꾼', '물고기들은 아직도 내 이름을 모른다.'],
  ['chop', 25, '나무꾼', '섬이 조금 휑해졌다. 미안하다, 나무야.'],
  ['egg', 15, '닭 집사', '닭들에게 진 빚은 바다 건너에서 갚겠다.'],
  ['scared', 30, '닭들의 공포', '닭들은 끝까지 나를 피했다.'],
  ['starve', 3600, '배고픈 철학자', '배에서 파도 소리가 났다.'],
  ['walk', 30000, '섬 산책왕', '섬을 몇 바퀴는 걸은 것 같다.'],
  ['cooked', 10, '모닥불 요리사', '불 앞에 있으면 덜 외로웠다.'],
  ['hunt', 4, '닭 사냥꾼', '남은 닭들이 나를 멀찍이서 배웅했다.'],
  ['faint', 3, '자주 쓰러지는 사람', '쓰러질 때마다 섬이 나를 일으켜 세웠다.'],
];
function islandTitle(kind) {
  const cands = TITLES.map(([k, norm, name, line]) => [stats[k] / norm, name, line]);
  if (stats.miss > stats.fish) cands.push([stats.miss / 6, '놓친 게 더 많은 어부', '놓친 물고기 얘기는 하지 않겠다.']);
  const best = cands.reduce((a, b) => (b[0] > a[0] ? b : a));
  const [score, name, line] = best[0] >= 1 ? best : [0, '평범한 표류자', '바다 건너엔 뭐가 있을까.'];
  let prefix = '';
  if (stats.play >= 60 * 60 * 120) prefix = '오래 버틴 ';                              // 2시간 넘게
  else if (kind === 'leave' && stats.play < 60 * 60 * 10) prefix = '번개같이 떠난 ';    // 10분 안에
  return { title: prefix + name, line, score };
}

// 카드 위쪽 그림 82x48: 섬 + 바다 위 뗏목
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
  {
    g.drawImage(SPR.chicken.right.stand, 38, 22);
    const x = 66, y = 36;   // 바다 위 뗏목
    r(x - 9, y + 4, 18, 1, C.foam);
    for (let k = 0; k < 6; k++) { r(x - 9 + k * 3, y - 3, 3, 7, PALETTE.o); r(x - 8 + k * 3, y - 2, 1, 5, PALETTE.t); }
    r(x + 3, y - 18, 2, 15, PALETTE.o);
    r(x - 5, y - 17, 8, 9, PALETTE.o); r(x - 4, y - 16, 6, 7, '#fbfaf5'); r(x - 4, y - 13, 6, 2, '#e8434a');
    g.drawImage(SPR.hero.left, x - 8, y - 9);
    for (let k = 0; k < 3; k++) r(x + 10 + k * 4, y + 1 + (k % 2), 2, 1, C.foam);   // 물보라
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

  const head = stats.play < 3600 ? '1분도 안 돼서 섬을 떠났다' : `${playTime()} 만에 섬을 떠났다`;
  const { title, line: quote } = islandTitle(kind);
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
  Object.keys(stats).forEach((k) => { e[k] = Math.round(stats[k]); });
  g.font = `600 13px ${FONT}`;
  g.fillStyle = '#8a6a5a';
  g.fillText(`나무 ${e.chop}그루 · 물고기 ${e.fish}마리 · 달걀 ${e.egg}개` + (e.hunt ? ` · 닭 ${e.hunt}마리` : ''), 180, 470);
  g.fillText(`기절 ${e.faint}번`, 180, 492);
  g.fillStyle = '#c4a47e';
  g.fillRect(150, 516, 60, 1);
  g.font = `800 12px ${FONT}`;
  g.fillText('외딴 섬', 180, 534);

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
  document.getElementById('ending-next').textContent = '처음부터 다시';
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
  const file = new File([blob], 'island-card.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '외딴 섬' }); return; }
  } catch (e) {
    if (e.name === 'AbortError') return;   // 사용자가 닫음
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'island-card.png';
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
