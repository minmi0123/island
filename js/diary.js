// 섬 일기: 하루 동안 한 일을 세어 두었다가, 자면 일기 한 편을 쓴다 (기획.md "뾰족한 축")
// 문장은 그날 날짜를 시드로 고른다 → 게임 난수와 따로라서 불러와도 같은 일기가 나온다
'use strict';

const freshDay = () => ({
  chop: 0, log: 0, egg: 0, fish: 0, miss: 0, early: 0, scared: 0, ateEgg: 0, ateFish: 0, cooked: 0, hunt: 0, ateMeat: 0,
  hungry: 0, starve: 0, walk: 0, fire: 0, coop: 0, house: 0, chick: 0, grown: 0, outside: 0, raft: 0,   // hungry · starve 는 프레임, walk 는 px
});
let today = freshDay();
const ever = freshDay();   // 지금까지 합계. 처음 해 본 일을 알아보려고
const diary = [];          // { day, lines: [...] }
let bookOpen = false;

function note(key, n = 1) { today[key] += n; }

// 후보 문장: 점수가 높은 것부터 DIARY_LINES 줄을 고른다. 같은 주제(group)에서는 한 줄만. {n} 은 그날 횟수
// 점수: 직접 한 일(짓기 · 낚시 · 도끼질)이 저절로 일어난 일(병아리)보다 앞서게
function diaryCandidates(d, firstDay) {
  const c = [];
  const add = (group, score, n, ...variants) => c.push({ group, score, n, variants });

  if (d.house) add('build', 100, 1, '집을 지었다! 오늘부터는 지붕 아래서 잔다.', '집을 지었다. 문을 열었다 닫았다만 열 번 했다.');
  if (d.coop) add('build', 90, d.coop, house ? '닭장을 지었다. 닭들은 고맙다는 말이 없다.' : '닭장을 지었다. 내 집보다 닭 집이 먼저 생겼다.');
  if (d.fire && !ever.fire) add('build', 90, 1, '모닥불을 피웠다. 불 앞에 있으니 덜 외롭다.', '모닥불을 피웠다. 한참 동안 불만 봤다.');
  else if (d.fire) add('build', 40, d.fire, '모닥불을 하나 더 피웠다. 불은 많을수록 좋다.');

  if (d.fish && !ever.fish) add('fish', 95, d.fish, '처음으로 물고기를 낚았다. 물고기도 나만큼 놀란 얼굴이었다.');
  else if (d.fish >= 5) add('fish', 65 + d.fish, d.fish, '물고기를 {n}마리나 낚았다. 오늘의 나는 어부다.', '물고기 {n}마리. 바다가 오늘따라 너그럽다.');
  else if (d.fish) add('fish', 55 + d.fish, d.fish, '물고기를 {n}마리 낚았다. 한 마리는 끝까지 나를 노려봤다.', '물고기 {n}마리. 바다는 생각보다 너그럽다.');
  else if (d.miss) add('fish', 55 + d.miss, d.miss, '물고기를 {n}번 놓쳤다. 저쪽도 필사적이다.', '찌가 들어갈 때마다 한 박자 늦었다. {n}번이나.');
  if (d.fish && d.miss) add('miss', 30, d.miss, '놓친 물고기도 {n}마리. 그 녀석들 얘기는 하지 않겠다.');
  if (d.early >= 2) add('miss', 45, d.early, '찌가 꿈쩍도 안 했는데 {n}번이나 잡아챘다. 마음만 급했다.');

  if (d.chop >= 5) add('chop', 60 + d.chop, d.chop, '나무를 {n}그루나 베었다. 섬이 조금 휑해졌다. 미안하다, 나무야.',
    '나무 {n}그루. 이제 도끼가 내 팔 같다.', '오늘 쓰러뜨린 나무 {n}그루. 나무들이 나를 보고 수군거린다.');
  else if (d.chop) add('chop', 40 + d.chop * 4, d.chop, '나무를 {n}그루 베었다. 손바닥이 얼얼하다.', '나무 {n}그루. 도끼질이 조금 늘었다.', '나무 {n}그루를 쓰러뜨렸다. 쓰러질 때마다 미안하다고 했다.');
  else add('chop', 15, 0, '나무는 한 그루도 베지 않았다. 나무도 쉬는 날이 있어야지.');

  if (d.chick) add('chicken', 50, d.chick, '병아리가 {n}마리 태어났다. 이름을 지어 줄까 하다 그만뒀다.', '닭장에서 병아리가 나왔다. 작은 게 제법 시끄럽다.');
  if (d.grown) add('chicken', 45, d.grown, '병아리가 닭이 됐다. 다 컸다고 나를 피하기 시작했다.');
  if (d.scared >= 3) add('chicken', 35 + d.scared, d.scared, firstDay ? '닭들은 나를 보자마자 도망갔다. {n}번이나.' : '닭들이 오늘도 나를 피했다. {n}번.', '닭 한 마리와 눈이 마주쳤다. 먼저 피한 건 닭이었다.');
  else if (firstDay) add('chicken', 20, 0, '닭들은 아직 나를 모른다. 알고 싶어 하지도 않는다.');
  if (d.hunt && !chickens.length) add('hunt', 98, 0, '마지막 닭을 잡았다. 이제 아침이 조용하다.');
  else if (d.hunt && !ever.hunt) add('hunt', 92, d.hunt, '처음으로 닭을 잡았다. 남은 닭들의 눈빛이 달라졌다.', '닭을 잡았다. 미안하다고 했지만 닭은 듣지 않았다.');
  else if (d.hunt >= 3) add('hunt', 70 + d.hunt, d.hunt, '닭을 {n}마리 잡았다. 섬의 닭들 사이에서 나는 전설이 됐다.', '닭 {n}마리. 닭장 쪽이 이상하게 조용하다.');
  else if (d.hunt) add('hunt', 60 + d.hunt, d.hunt, '닭을 {n}마리 잡았다. 오늘 닭들 사이에 소문이 돌았을 것이다.', '닭 {n}마리를 구석으로 몰았다. 나도 숨이 찼다.', '닭을 {n}마리 잡았다. 남은 닭들이 나를 멀찍이서 본다.');
  if (d.egg) add('egg', 35 + d.egg, d.egg, '달걀을 {n}개 주웠다. 닭들은 모르는 척했다.', '달걀 {n}개. 닭들에게 빚이 늘어 간다.', '달걀을 {n}개 주웠다. 아직 따뜻했다.');

  if (d.starve > 60 * 10) add('food', 80, 0, '배가 너무 고파서 도끼가 두 배로 무거웠다.', '쫄쫄 굶었다. 배에서 파도 소리가 났다.');
  else if (d.hungry > 60 * 20) add('food', 50, 0, '하루 종일 배가 고팠다. 내일은 먹고 시작하자.', '배꼽시계가 하루 종일 울렸다.');
  else if (!d.ateEgg && !d.ateFish && !d.ateMeat) add('food', firstDay ? 15 : 45, 0, '아무것도 먹지 않았다. 대단한 건지 바보인 건지 모르겠다.');
  if (d.ateFish) add('food', 35, d.ateFish, '구운 생선을 먹었다. 오늘 제일 잘한 일이다.');
  if (d.ateMeat) add('food', 40, d.ateMeat, '구운 닭고기를 먹었다. 달걀보다 훨씬 든든하다.', '닭고기를 뜯었다. 닭들이 보고 있었다.');
  if (d.ateEgg >= 3) add('food', 35, d.ateEgg, '구운 달걀을 {n}개 먹었다. 이제 달걀 맛을 가린다.');
  else if (d.ateEgg) add('food', 25, d.ateEgg, '구운 달걀을 먹었다. 소금이 있으면 좋겠다.');
  if (d.cooked >= 3) add('cook', 25, d.cooked, '모닥불 앞에서 {n}번 요리했다. 요리에 소질이 있는 것 같다.');

  if (d.outside) add('night', 70, 0, ...(house ? ['집을 두고 모닥불 옆에서 잤다. 나도 이유를 모르겠다.']
    : ['모닥불 옆에서 웅크리고 잤다. 등이 시리다.', '별을 이불 삼아 잤다. 이불이 얇다.']));
  if (d.raft) add('build', 100, 1, '뗏목을 다 엮었다. 바다가 갑자기 가까워 보인다.');

  if (d.walk > 4000) add('walk', 30, 0, '섬을 몇 바퀴는 걸은 것 같다. 다리가 뻐근하다.');
  else if (d.walk < 300) add('walk', 30, 0, '거의 움직이지 않았다. 바다만 봤다.', '하루 종일 한자리에 있었다. 섬이 나를 구경했다.');
  return c;
}

const DIARY_ENDINGS = [
  '내일은 뭘 할까.', '바다 건너엔 뭐가 있을까.', '오늘도 무사히.', '별이 엄청 많다.',
  '파도 소리가 자장가 같다.', '집 생각이 조금 났다.', '닭들도 지금쯤 자고 있겠지.',
  '발가락 사이에 아직 모래가 있다.', '내일은 내일의 나무가 있다.',
];

// 열까지는 우리말로: 한 그루, 세 마리. 그 위는 숫자로: 12그루
const KOR_COUNT = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const countWord = (n) => (n >= 1 && n <= 10 ? KOR_COUNT[n] + ' ' : String(n));
// 세는 말만 다른 문장은 같은 문장으로 본다 ("나무 세 그루" = "나무 4그루" = "나무 {n}그루")
const countShape = (s) => s.replace(/(\d+|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열) ?(그루|마리|개|번)/g, '{n}$2');

// 지금까지의 today 로 일기 한 편을 써서 일기장에 넣고, 새 하루를 연다
function writeDiary() {
  const r = rng(day * 7919 + 17);
  const recent = new Set(diary.slice(-2).flatMap((e) => e.lines).map(countShape));   // 이틀 안에 쓴 문장은 피한다
  const pick = (list) => {
    const fresh = list.filter((s) => !recent.has(countShape(s)));
    const from = fresh.length ? fresh : list;
    return from[Math.floor(r() * from.length)];
  };
  const groups = new Set();
  const lines = diaryCandidates(today, day === 1)
    .map((cand) => ({ ...cand, score: cand.score + r() * 8 }))   // 비슷한 하루도 순서가 조금씩 달라지게
    .sort((a, b) => b.score - a.score)
    .filter((cand) => !groups.has(cand.group) && groups.add(cand.group))
    .slice(0, DIARY_LINES)
    .map((cand) => pick(cand.variants).replace('{n}', countWord(cand.n)));
  const endings = day >= RAFT_DAY - 1 ? [...DIARY_ENDINGS, '나무를 엮으면 배가 될지도 모른다.'] : DIARY_ENDINGS;
  lines.push(day === 1 ? '첫날치고는 나쁘지 않았다.' : pick(endings));

  const entry = { day, lines };
  diary.push(entry);
  Object.keys(ever).forEach((k) => { ever[k] += today[k]; });
  today = freshDay();
  return entry;
}

// 밤 화면에 일기 한 장을 펼친다. "아침으로" 를 누르면 done
function showPage(entry, done) {
  document.getElementById('page-day').textContent = entry.day + '일째 밤';
  const box = document.getElementById('page-lines');
  box.innerHTML = '';
  entry.lines.forEach((s, i) => {
    const p = document.createElement('p');
    p.textContent = s;
    p.style.animationDelay = (0.3 + i * 0.7) + 's';
    box.appendChild(p);
  });
  const wake = document.getElementById('wake');
  wake.style.animationDelay = (0.3 + entry.lines.length * 0.7) + 's';
  wake.onclick = () => {
    wake.onclick = null;
    document.getElementById('page').classList.remove('show');
    done();
  };
  document.getElementById('page').classList.add('show');
}

function openBook() {
  const list = document.getElementById('book-list');
  list.innerHTML = '';
  diary.forEach((e) => {
    const h = document.createElement('h3');
    h.textContent = e.day + '일째' + (e.end === 'leave' ? ' · 떠나는 날' : e.end === 'stay' ? ' · 남기로 한 날' : '');
    list.appendChild(h);
    e.lines.forEach((s) => {
      const p = document.createElement('p');
      p.textContent = s;
      list.appendChild(p);
    });
  });
  bookOpen = true;
  joy = null;
  toastTimer = 0;
  document.getElementById('toast').classList.remove('show');
  document.getElementById('book').classList.add('on');
  list.scrollTop = list.scrollHeight;   // 가장 최근 일기부터 보이게
}
function closeBook() {
  bookOpen = false;
  document.getElementById('book').classList.remove('on');
}
document.getElementById('book-open').addEventListener('click', openBook);
document.getElementById('book-close').addEventListener('click', closeBook);
